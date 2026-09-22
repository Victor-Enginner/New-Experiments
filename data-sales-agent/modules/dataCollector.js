
/**
 * 📊 Módulo 1: Coleta e Limpeza de Dados (Data Miner)
 * 
 * Responsabilidades:
 * - Raspar dados de fontes públicas (respeitando robots.txt)
 * - Coletar dados de APIs
 * - Carregar dados de arquivos CSV/JSON
 * - Gerar dados simulados para demonstração/teste
 * - Limpar, normalizar e estruturar os dados
 * - Exportar dataset limpo em JSON
 */

import fs from 'fs-extra';
import path from 'path';
import dns from 'node:dns/promises';
import net from 'node:net';
import axios from 'axios';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import ora from 'ora';
import {
  DEFAULT_SCRAPING_POLICY,
  fetchRobotsTxt,
  isPathAllowed,
  getCrawlDelay,
  RateLimiter,
  retryWithBackoff
} from './scraperPolicies.js';

// Módulo compartilhado de mascaramento de IPs (ai-experiments/lib/ip-masker.js)
// Política: IP da máquina NUNCA é exposto ([IP_MAQUINA], irreversível);
// demais IPs viram [IP4:0001]/[IP6:0001] (reversível, mas o mapa não é persistido).
import { maskIPs, getMachineIPs } from '../../ai-experiments/lib/ip-masker.js';

// Utilitário de logging
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━'))
};

function isPrivateIPv4(host) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIPv6(host) {
  const h = host.toLowerCase();
  return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:') || h === '::';
}

function isBlockedHost(host) {
  const normalized = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === 'metadata.google.internal') return true;
  if (net.isIP(normalized) === 4) return isPrivateIPv4(normalized);
  if (net.isIP(normalized) === 6) return isPrivateIPv6(normalized);
  return false;
}

async function assertSafeHttpUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Protocolo não permitido para coleta externa: ${parsed.protocol}`);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(`Destino bloqueado por política anti-SSRF: ${parsed.hostname}`);
  }

  const records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  for (const record of records) {
    if (isBlockedHost(record.address)) {
      throw new Error(`DNS resolve para endereço bloqueado por política anti-SSRF: ${record.address}`);
    }
  }

  return parsed;
}


/**
 * Gera dados simulados baseados no schema configurado
 * @param {Object} schema - Schema dos dados a simular
 * @param {number} count - Quantidade de registros
 * @returns {Array} Dados simulados
 */
function generateSimulatedData(schema, count) {
  const data = [];
  
  for (let i = 0; i < count; i++) {
    const record = {};
    
    for (const [field, config] of Object.entries(schema)) {
      switch (config.type) {
        case 'auto':
          record[field] = i + 1;
          break;

        case 'string':
          record[field] = `${config.prefix || 'Item'} ${i + 1}`;
          break;

        case 'number':
          record[field] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
          break;

        case 'location': {
          const neighborhoods = config.neighborhoods || ['Centro'];
          record[field] = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
          break;
        }

        case 'select': {
          const options = config.options || ['Opção 1'];
          record[field] = options[Math.floor(Math.random() * options.length)];
          break;
        }

        case 'date':
          record[field] = new Date(
            Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)
          ).toISOString().split('T')[0];
          break;

        default:
          record[field] = null;
      }
    }
    
    data.push(record);
  }
  
  return data;
}

// Rate limiter global compartilhado entre chamadas de scraping da sessão.
// Os valores são ajustados por fetchPage() a partir da política configurada.
const sessionRateLimiter = new RateLimiter({ minDelayMs: 1000, maxJitterMs: 500 });

/**
 * Extrai registros de um HTML já carregado com Cheerio.
 * @param {Object} $ - Cheerio root
 * @param {Object} selectors - Seletores CSS
 * @param {number|null} [page=null] - Número da página (crawl multi-página); null = página única (sem campo page)
 * @returns {Array} Registros extraídos
 */
function extractRecords($, selectors, page = null) {
  const data = [];

  $(selectors.container).each((index, element) => {
    const record = {
      id: index + 1
    };

    // Campo 'page' apenas em crawl multi-página (page null = página única)
    if (page !== null) record.page = page;

    // Campos só entram quando há texto real (evita registros vazios/ruído)
    const setField = (key, selector) => {
      if (!selector) return false;
      const text = $(element).find(selector).text().trim();
      if (!text) return false;
      record[key] = text;
      return true;
    };

    const hasAnyField = [
      setField('title', selectors.title),
      setField('price', selectors.price),
      setField('location', selectors.location),
      setField('description', selectors.description)
    ].some(Boolean);

    record.scrapedAt = new Date().toISOString();

    // Mantém apenas registros com ao menos 1 campo real
    if (hasAnyField) {
      data.push(record);
    }
  });

  return data;
}

/**
 * Busca e extrai o HTML de UMA página, aplicando todas as proteções:
 * política de rate limit → robots.txt (RFC 9309) → Crawl-delay →
 * rate limiter → retry/backoff.
 *
 * @param {string} url - URL da página
 * @param {Object} policy - Política de scraping
 * @param {Object} [spinner] - Ora spinner (para avisos de retry)
 * @returns {Object} Cheerio root ($) da página carregada
 */
async function fetchPage(url, policy, spinner = null) {
  const parsedUrl = await assertSafeHttpUrl(url);
  const origin = parsedUrl.origin;

  // 0) Aplica política de rate limit à sessão (config → robô respeita)
  sessionRateLimiter.setMinDelay(policy.minDelayMs);
  sessionRateLimiter.maxJitterMs = policy.maxJitterMs ?? sessionRateLimiter.maxJitterMs;

  // 1) Respeito ao robots.txt (RFC 9309)
  if (policy.respectRobots) {
    const robots = await fetchRobotsTxt(origin, {
      userAgent: policy.userAgent,
      timeout: policy.timeout
    });

    if (!isPathAllowed(robots, policy.userAgent, parsedUrl.pathname)) {
      throw new Error(`robots.txt bloqueia ${parsedUrl.pathname} para este User-Agent`);
    }

    // Aplica Crawl-delay declarado no robots.txt, se existir
    const crawlDelaySec = getCrawlDelay(robots, policy.userAgent);
    if (crawlDelaySec !== null && crawlDelaySec > 0) {
      sessionRateLimiter.setMinDelay(crawlDelaySec * 1000);
    }
  }

  // 2) Rate limit antes de cada requisição
  await sessionRateLimiter.wait();

  // 3) Requisição com retry + backoff exponencial
  const response = await retryWithBackoff(
    () => axios.get(url, {
      headers: {
        'User-Agent': policy.userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      timeout: policy.timeout
    }),
    {
      retries: policy.retries,
      baseDelayMs: policy.retryBaseDelayMs,
      maxDelayMs: policy.retryMaxDelayMs,
      onRetry: ({ attempt, delayMs, error }) => {
        const status = error?.response?.status ? `HTTP ${error.response.status}` : error.message;
        if (spinner) spinner.warn(`Tentativa ${attempt} falhou (${status}) — nova tentativa em ${Math.round(delayMs)}ms`);
      }
    }
  );

  return cheerio.load(response.data);
}

/**
 * Gera chave de deduplicação para um registro
 */
function recordKey(record) {
  return `${record.title ?? ''}|${record.price ?? ''}|${record.location ?? ''}`;
}

/**
 * Monta URL da próxima página (modo "query"): baseUrl?pageParam=N
 */
function buildPageUrl(baseUrl, pageParam, pageNumber) {
  const url = new URL(baseUrl);
  url.searchParams.set(pageParam, String(pageNumber));
  return url.toString();
}

/**
 * Crawl multi-página: itera páginas respeitando robots.txt e rate limit
 * em cada uma (via fetchPage). Suporta dois modos:
 *   - "query": paginação por parâmetro de URL (?page=2, ?page=3...)
 *   - "next": segue o link "próxima página" via seletor CSS
 *
 * @param {string} baseUrl - URL da primeira página
 * @param {Object} selectors - Seletores CSS
 * @param {Object} pagination - { enabled, mode, pageParam, startPage, maxPages, nextSelector, stopWhenEmpty }
 * @param {Object} policy - Política de scraping
 * @param {Object} [spinner]
 * @returns {Array} Registros consolidados e deduplicados
 */
async function scrapeMultiPage(baseUrl, selectors, pagination, policy, spinner = null) {
  const {
    mode = 'query',          // 'query' | 'next'
    pageParam = 'page',      // nome do parâmetro de query (modo "query")
    startPage = 2,           // primeira página após a base (modo "query")
    maxPages = 5,            // limite de páginas a visitar
    nextSelector = null,     // seletor CSS do link "próxima" (modo "next")
    stopWhenEmpty = true     // para quando uma página não retorna registros
  } = pagination;

  const allRecords = [];
  const seen = new Set();
  const visited = new Set();
  let pageNumber = 1;
  let currentUrl = baseUrl;

  while (pageNumber <= maxPages) {
    if (visited.has(currentUrl)) break;
    visited.add(currentUrl);

    if (spinner) spinner.text = `Página ${pageNumber}: ${currentUrl}`;

    const $ = await fetchPage(currentUrl, policy, spinner);
    const records = extractRecords($, selectors, pageNumber);

    // Deduplicação global (título + preço + localização)
    const newRecords = [];
    for (const record of records) {
      const key = recordKey(record);
      if (!seen.has(key)) {
        seen.add(key);
        newRecords.push(record);
      }
    }
    allRecords.push(...newRecords);

    // Condições de parada
    if (stopWhenEmpty && (records.length === 0 || newRecords.length === 0)) break;

    // Determina próxima URL
    let nextUrl = null;
    if (mode === 'next') {
      // Seletor configurado, ou fallback para <link rel="next">
      const href = (nextSelector && $(nextSelector).first().attr('href'))
        || $('link[rel="next"]').first().attr('href');
      if (href) nextUrl = new URL(href, currentUrl).toString();
    } else if (mode === 'query') {
      nextUrl = buildPageUrl(baseUrl, pageParam, startPage + (pageNumber - 1));
    }

    if (!nextUrl) break;
    currentUrl = nextUrl;
    pageNumber += 1;
  }

  // Reindexa IDs globalmente (evita 1,2,3 repetidos em cada página)
  allRecords.forEach((record, index) => { record.id = index + 1; });

  return allRecords;
}

/**
 * Raspa dados de uma URL usando Cheerio (web scraping leve),
 * com proteções: robots.txt (RFC 9309), rate limit, retry com
 * backoff exponencial e User-Agent configurável.
 * Se options.pagination.enabled, executa crawl multi-página.
 *
 * @param {string} url - URL para raspar
 * @param {Object} selectors - Seletores CSS para extrair dados
 * @param {Object} [options] - Política de scraping + pagination (merge com DEFAULT_SCRAPING_POLICY)
 * @returns {Array} Dados raspados
 */
async function scrapeData(url, selectors, options = {}) {
  const policy = { ...DEFAULT_SCRAPING_POLICY, ...options };
  const pagination = options.pagination || {};
  const spinner = ora(
    pagination.enabled
      ? `Raspando até ${pagination.maxPages || 5} página(s) de: ${url}`
      : `Raspando dados de: ${url}`
  ).start();

  try {
    if (pagination.enabled) {
      const records = await scrapeMultiPage(url, selectors, pagination, policy, spinner);
      spinner.succeed(`${records.length} registros raspados (paginado: ${pagination.mode || 'query'})`);
      return records;
    }

    const $ = await fetchPage(url, policy, spinner);
    const records = extractRecords($, selectors);
    spinner.succeed(`${records.length} registros raspados com sucesso`);
    return records;

  } catch (error) {
    spinner.fail(`Erro ao raspar dados: ${error.message}`);
    throw error;
  }
}

/**
 * Carrega dados de um arquivo CSV
 * @param {string} filePath - Caminho do arquivo CSV
 * @returns {Array} Dados carregados
 */
async function loadCSV(filePath) {
  const spinner = ora(`Carregando CSV: ${filePath}`).start();
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const record = { id: index + 1 };
      
      headers.forEach((header, i) => {
        record[header] = values[i] || null;
      });
      
      return record;
    });
    
    spinner.succeed(`${data.length} registros carregados do CSV`);
    return data;
    
  } catch (error) {
    spinner.fail(`Erro ao carregar CSV: ${error.message}`);
    throw error;
  }
}

/**
 * Carrega dados de um arquivo JSON
 * @param {string} filePath - Caminho do arquivo JSON
 * @returns {Array} Dados carregados
 */
async function loadJSON(filePath) {
  const spinner = ora(`Carregando JSON: ${filePath}`).start();
  
  try {
    const data = await fs.readJSON(filePath);
    const records = Array.isArray(data) ? data : data.data || data.records || [];
    
    spinner.succeed(`${records.length} registros carregados do JSON`);
    return records;
    
  } catch (error) {
    spinner.fail(`Erro ao carregar JSON: ${error.message}`);
    throw error;
  }
}

/**
 * Mascara IPs em todos os campos string de um dataset (privacy).
 * IPs da máquina (auto-detectados) viram '[IP_MAQUINA]' — nunca vazam;
 * demais IPs viram '[IP4:0001]'/'[IP6:0001]'.
 *
 * @param {Array} data - Registros limpos
 * @param {Object} [privacy] - { maskIPs: boolean } (default: ativado)
 * @returns {{ data: Array, masked: number, machineProtected: boolean }}
 */
function maskDatasetRecords(data, privacy = {}) {
  const { maskIPs: enabled = true } = privacy;
  if (!enabled) return { data, masked: 0, machineProtected: false };

  // Detecta os IPs da máquina UMA vez (evita re-detecção por campo)
  const machineIPs = getMachineIPs();
  let masked = 0;
  let machineProtected = false;

  const maskedData = data.map(record => {
    const out = { ...record };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === 'string') {
        const result = maskIPs(value, { machineIPs });
        if (result.count > 0) {
          out[key] = result.text;
          masked += result.count;
          machineProtected = machineProtected || result.machineProtected;
        }
      }
    }
    return out;
  });

  return { data: maskedData, masked, machineProtected };
}

/**
 * Limpa e normaliza os dados
 * @param {Array} data - Dados brutos
 * @param {Object} [options] - { privacy: { maskIPs: boolean } }
 * @returns {Object} Dados limpos + metadados (+ estatísticas de privacidade)
 */
function cleanData(data, options = {}) {
  log.section('Limpando e Normalizando Dados');
  
  const privacy = options.privacy || {};
  
  const cleaned = data.map((record, index) => {
    const clean = { id: record.id || index + 1 };
    
    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Limpeza específica por tipo de campo
      let cleanValue = value;
      
      // Remove espaços extras
      if (typeof cleanValue === 'string') {
        cleanValue = cleanValue.trim().replace(/\s+/g, ' ');
        
        // Normaliza preços brasileiros
        if (typeof cleanValue === 'string' && cleanValue.includes('R$')) {
          cleanValue = parseFloat(
            cleanValue
              .replace('R$', '')
              .replace(/\./g, '')
              .replace(',', '.')
              .trim()
          );
        }
        
        // Tenta converter números
        if (typeof cleanValue === 'string' && !isNaN(cleanValue) && cleanValue.trim() !== '') {
          cleanValue = Number(cleanValue);
        }
      }
      
      clean[key] = cleanValue;
    }
    
    return clean;
  });
  
  // Estatísticas
  const stats = {
    totalRecords: cleaned.length,
    fields: Object.keys(cleaned[0] || {}).length,
    nullValues: {},
    uniqueValues: {}
  };
  
  // Análise básica
  if (cleaned.length > 0) {
    const fields = Object.keys(cleaned[0]);
    fields.forEach(field => {
      const values = cleaned.map(r => r[field]).filter(v => v !== null && v !== undefined);
      stats.nullValues[field] = cleaned.length - values.length;
      stats.uniqueValues[field] = [...new Set(values)].length;
    });
  }
  
  // Privacidade: mascara IPs em campos string ANTES da exportação
  const { data: safeData, masked, machineProtected } = maskDatasetRecords(cleaned, privacy);

  if (masked > 0) {
    log.info(`🔒 ${masked} IP(s) mascarado(s) nos dados (privacy)`);
  }
  if (machineProtected) {
    log.warn('IP da máquina detectado nos dados — protegido e NUNCA exposto');
  }

  log.success(`${safeData.length} registros limpos e normalizados`);
  log.info(`Campos detectados: ${stats.fields}`);
  
  return {
    data: safeData,
    stats,
    privacy: {
      maskIPs: privacy.maskIPs !== false,
      masked,
      machineProtected
    }
  };
}

/**
 * Exporta dados para formato específico
 * @param {Object} dataset - Dataset completo
 * @param {string} format - Formato de saída ('json' | 'csv' | 'both')
 */
async function exportData(dataset, outputDir) {
  log.section('Exportando Dataset');
  
  await fs.ensureDir(outputDir);
  
  // JSON format
  const jsonPath = path.join(outputDir, 'dataset_limpo.json');
  await fs.writeJSON(jsonPath, dataset, { spaces: 2 });
  log.success(`JSON exportado: ${jsonPath}`);
  
  // CSV format
  if (dataset.data.length > 0) {
    const fields = Object.keys(dataset.data[0]);
    const csvLines = [
      fields.join(','),
      ...dataset.data.map(record =>
        fields.map(f => {
          const val = record[f];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ];
    
    const csvPath = path.join(outputDir, 'dataset_limpo.csv');
    await fs.writeFile(csvPath, csvLines.join('\n'), 'utf-8');
    log.success(`CSV exportado: ${csvPath}`);
  }
  
  // Metadados
  const metaPath = path.join(outputDir, 'dataset_metadados.json');
  await fs.writeJSON(metaPath, {
    exportedAt: new Date().toISOString(),
    totalRecords: dataset.data.length,
    stats: dataset.stats,
    sampleRecords: dataset.data.slice(0, 3)
  }, { spaces: 2 });
  log.success(`Metadados exportados: ${metaPath}`);
}

/**
 * Função principal do Módulo 1: Coleta e Limpeza de Dados
 * @param {Object} config - Configuração do projeto
 * @returns {Object} Dataset limpo e processado
 */
export async function collectAndCleanData(config) {
  log.section('📊 MÓDULO 1: COLETA E LIMPEZA DE DADOS');
  
  let rawData;
  const source = config.dataSource;
  
  // 1. Coleta dos dados brutos
  log.info(`Fonte de dados: ${source.type}`);
  
  switch (source.type) {
    case 'scraped':
      // Política de scraping: dataSource.scraping > config.scraping > padrão
      // Paginação: dataSource.pagination > config.pagination
      rawData = await scrapeData(source.url, source.selectors, {
        ...(config.scraping || {}),
        ...(source.scraping || {}),
        pagination: {
          ...(config.pagination || {}),
          ...(source.pagination || {})
        }
      });
      break;
      
    case 'csv':
      rawData = await loadCSV(source.csvPath);
      break;
      
    case 'json':
      rawData = await loadJSON(source.csvPath); // path reutilizado
      break;
      
    case 'simulated':
    default: {
      const spinner = ora('Gerando dados simulados...').start();
      const simConfig = source.simulated;
      rawData = generateSimulatedData(simConfig.schema, simConfig.recordCount);
      spinner.succeed(`${rawData.length} registros simulados gerados`);
      break;
    }
  }
  
  if (!rawData || rawData.length === 0) {
    log.error('Nenhum dado coletado. Verifique a fonte de dados.');
    return null;
  }
  
  // 2. Limpeza e normalização (+ privacidade: mascaramento de IPs)
  // Precedência: dataSource.privacy > config.privacy > padrão (maskIPs ativado)
  const privacy = {
    ...(config.privacy || {}),
    ...(source.privacy || {})
  };
  const { data: cleanedData, stats, privacy: privacyInfo } = cleanData(rawData, { privacy });
  
  // 3. Montagem do dataset final
  const dataset = {
    project: {
      name: config.project.name,
      niche: config.project.niche,
      version: config.project.version,
      generatedAt: new Date().toISOString()
    },
    data: cleanedData,
    stats,
    privacy: privacyInfo,
    summary: generateSummary(cleanedData, stats)
  };
  
  // 4. Exportação
  await exportData(dataset, config.deploy.outputDir || './output');
  
  return dataset;
}

/**
 * Gera um resumo executivo do dataset
 */
function generateSummary(data, stats) {
  const numericFields = {};
  const categoricalFields = {};
  
  if (data.length > 0) {
    const fields = Object.keys(data[0]);
    
    fields.forEach(field => {
      if (field === 'id') return;
      
      const values = data.map(r => r[field]).filter(v => v !== null && v !== undefined);
      
      if (values.length > 0 && typeof values[0] === 'number') {
        numericFields[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
        };
      } else if (values.length > 0) {
        const freq = {};
        values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
        categoricalFields[field] = {
          unique: stats.uniqueValues[field],
          topOccurrence: Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([k, v]) => ({ value: k, count: v, percentage: ((v / values.length) * 100).toFixed(1) + '%' }))
        };
      }
    });
  }
  
  return {
    totalRecords: data.length,
    numericFields,
    categoricalFields,
    qualityScore: calculateQualityScore(data, stats)
  };
}

/**
 * Calcula score de qualidade dos dados (0-100)
 */
function calculateQualityScore(data, stats) {
  let score = 100;
  
  if (data.length === 0) return 0;
  
  const totalFields = Object.keys(stats.nullValues).length;
  const totalCells = data.length * totalFields;
  
  // Penalidade por valores nulos
  const totalNulls = Object.values(stats.nullValues).reduce((a, b) => a + b, 0);
  const nullPenalty = (totalNulls / totalCells) * 100;
  score -= nullPenalty;
  
  // Bonus por variedade de dados
  const avgUnique = Object.values(stats.uniqueValues).reduce((a, b) => a + b, 0) / totalFields;
  const varietyBonus = Math.min(10, avgUnique / 10);
  score += varietyBonus;
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Execução standalone
async function main() {
  const configPath = process.argv[2] || './config/default.js';
  
  try {
    const config = (await import(path.resolve(configPath))).default;
    const dataset = await collectAndCleanData(config);
    
    if (dataset) {
      log.section('RESUMO');
      log.info(`Total de registros: ${dataset.stats.totalRecords}`);
      log.info(`Qualidade dos dados: ${dataset.summary.qualityScore}%`);
      log.success('Módulo 1 concluído com sucesso!');
    }
  } catch (error) {
    log.error(`Falha no Módulo 1: ${error.message}`);
    process.exit(1);
  }
}

// Se executado diretamente
const isMainModule = process.argv[1] && (
  process.argv[1].includes('dataCollector') ||
  process.argv[1].endsWith('/dataCollector.js') ||
  process.argv[1].endsWith('\\dataCollector.js')
);

if (isMainModule) {
  main();
}

export {
  generateSimulatedData,
  scrapeData,
  extractRecords,
  fetchPage,
  cleanData,
  loadCSV,
  loadJSON,
  exportData
};