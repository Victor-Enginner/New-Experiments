/**
 * 🛡️ Scraper Policies — Proteções de Web Scraping
 *
 * Camada de segurança/etiqueta para raspagem:
 *   1. robots.txt (RFC 9309) — parse + verificação de permissão por path
 *   2. Rate limiter — atraso mínimo entre requisições (com jitter)
 *   3. Retry com backoff exponencial — falhas transitórias/429/5xx
 *   4. User-Agent configurável — identifica o crawler
 *
 * Uso:
 *   import { retryWithBackoff, RateLimiter, fetchRobotsTxt, isPathAllowed } from './scraperPolicies.js';
 */

import axios from 'axios';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Política padrão de scraping.
 * Pode ser sobrescrita por config.scraping ou por opções de scrapeData().
 */
export const DEFAULT_SCRAPING_POLICY = {
  userAgent: 'DataSalesAgent/1.0 (+https://github.com/data-sales-agent; contato@exemplo.com)',
  respectRobots: true,
  retries: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 10000,
  minDelayMs: 1000,      // piso do rate limit — setMinDelay nunca reduz abaixo disso
  maxJitterMs: 500,
  timeout: 30000
};

// ============================================================================
// 1) ROBOTS.TXT (RFC 9309)
// ============================================================================

/**
 * Faz parse de um conteúdo de robots.txt.
 * @param {string} content - Conteúdo bruto do robots.txt
 * @returns {{ groups: Array, sitemaps: string[] }}
 *   groups: [{ userAgents: string[], rules: [{ type: 'allow'|'disallow', pattern: string }], crawlDelay: number|null }]
 */
export function parseRobotsTxt(content) {
  const groups = [];
  const sitemaps = [];
  let currentGroup = null;

  const lines = String(content || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const field = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (field === 'user-agent') {
      // RFC 9309: linhas User-agent consecutivas pertencem ao MESMO grupo
      // (novo grupo só começa após regras ou no início do arquivo)
      if (!currentGroup || currentGroup.hasRules) {
        currentGroup = { userAgents: [], rules: [], crawlDelay: null, hasRules: false };
        groups.push(currentGroup);
      }
      if (value) currentGroup.userAgents.push(value.toLowerCase());
    } else if (field === 'allow' || field === 'disallow') {
      if (!currentGroup) {
        currentGroup = { userAgents: ['*'], rules: [], crawlDelay: null, hasRules: false };
        groups.push(currentGroup);
      }
      currentGroup.rules.push({ type: field, pattern: value });
      currentGroup.hasRules = true;
    } else if (field === 'crawl-delay') {
      if (!currentGroup) {
        currentGroup = { userAgents: ['*'], rules: [], crawlDelay: null, hasRules: false };
        groups.push(currentGroup);
      }
      const delay = parseFloat(value);
      if (!Number.isNaN(delay) && delay >= 0) currentGroup.crawlDelay = delay;
    } else if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    }
  }

  return { groups, sitemaps };
}

/**
 * Converte padrão de path do robots (* e $) em regex.
 * Retorna -1 se não casa, ou o tamanho do match (maior = mais específico).
 */
function matchRobotsPattern(pattern, path) {
  if (!pattern) return -1; // regra vazia não bloqueia nada

  let regex = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      regex += '.*';
    } else if (ch === '$' && i === pattern.length - 1) {
      regex += '$';
    } else {
      regex += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  try {
    const match = path.match(new RegExp(regex));
    if (!match) return -1;
    return match[0].length;
  } catch {
    return -1;
  }
}

/**
 * Verifica se um path é permitido para um User-Agent.
 * Regra: regra mais específica (match mais longo) vence;
 * sem regra que case → permitido; `Disallow:` vazio → permitido.
 *
 * @param {{ groups: Array }} rules - Resultado de parseRobotsTxt
 * @param {string} userAgent - User-Agent do crawler
 * @param {string} path - Pathname da URL (ex: '/precos/imoveis')
 * @returns {boolean} true = permitido
 */
export function isPathAllowed(rules, userAgent, path) {
  if (!rules || !Array.isArray(rules.groups) || rules.groups.length === 0) return true;

  const ua = String(userAgent || '').toLowerCase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Grupos aplicáveis: preferência ao grupo específico; senão grupo '*'
  const specific = rules.groups.filter(g => g.userAgents.includes(ua));
  const wildcard = rules.groups.filter(g => !specific.length && g.userAgents.includes('*'));
  const applicable = specific.length ? specific : wildcard;

  if (applicable.length === 0) return true;

  let bestMatch = null; // { type, length }

  for (const group of applicable) {
    for (const rule of group.rules) {
      const matchLength = matchRobotsPattern(rule.pattern, normalizedPath);
      if (matchLength >= 0) {
        // RFC 9309: em empate de especificidade, Allow vence Disallow
        const isBetter = !bestMatch
          || matchLength > bestMatch.length
          || (matchLength === bestMatch.length
              && rule.type === 'allow' && bestMatch.type !== 'allow');
        if (isBetter) {
          bestMatch = { type: rule.type, length: matchLength };
        }
      }
    }
  }

  // Sem regra que case → permite (padrão do protocolo)
  if (!bestMatch) return true;
  return bestMatch.type === 'allow';
}

/**
 * Retorna o Crawl-delay (em segundos) declarado para um User-Agent.
 * @returns {number|null}
 */
export function getCrawlDelay(rules, userAgent) {
  if (!rules || !Array.isArray(rules.groups)) return null;
  const ua = String(userAgent || '').toLowerCase();

  const specific = rules.groups.find(g => g.userAgents.includes(ua));
  const wildcard = rules.groups.find(g => !specific && g.userAgents.includes('*'));
  const group = specific || wildcard;

  return group?.crawlDelay ?? null;
}

// Cache de robots.txt por origin (TTL 1h)
const robotsCache = new Map();
const ROBOTS_TTL_MS = 60 * 60 * 1000;

/**
 * Busca e faz parse do robots.txt de uma origin, com cache.
 * Em erro/404 assume permissivo (padrão do protocolo).
 *
 * @param {string} origin - ex: 'https://exemplo.com'
 * @param {Object} [options] - { userAgent, timeout }
 */
export async function fetchRobotsTxt(origin, options = {}) {
  const cacheKey = String(origin).toLowerCase();
  const cached = robotsCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) {
    return cached.rules;
  }

  const { userAgent = DEFAULT_SCRAPING_POLICY.userAgent, timeout = DEFAULT_SCRAPING_POLICY.timeout } = options;

  try {
    const response = await axios.get(`${origin}/robots.txt`, {
      headers: { 'User-Agent': userAgent },
      timeout,
      maxRedirects: 2,
      validateStatus: s => s === 200 // 404 = permissivo, não é erro
    });
    const rules = parseRobotsTxt(response.data);
    robotsCache.set(cacheKey, { rules, fetchedAt: Date.now() });
    return rules;
  } catch {
    // Sem robots.txt acessível → permite tudo
    const rules = { groups: [], sitemaps: [] };
    robotsCache.set(cacheKey, { rules, fetchedAt: Date.now() });
    return rules;
  }
}

// ============================================================================
// 2) RATE LIMITER
// ============================================================================

/**
 * Rate limiter simples: garante atraso mínimo entre requisições, com jitter.
 * Use uma instância por sessão de scraping (compartilhada entre chamadas).
 */
export class RateLimiter {
  /**
   * @param {Object} [options]
   * @param {number} [options.minDelayMs=1000] - atraso mínimo entre requisições
   * @param {number} [options.maxJitterMs=500] - jitter máximo adicional
   */
  constructor({ minDelayMs = 1000, maxJitterMs = 500 } = {}) {
    this.minDelayMs = minDelayMs;
    this.maxJitterMs = maxJitterMs;
    this.lastRequestAt = 0;
  }

  /**
   * Ajusta o atraso mínimo (ex: aplica Crawl-delay do robots.txt
   * ou política configurada). Se ms for menor que o atual, mantém
   * o maior (nunca acelera abaixo do já garantido).
   */
  setMinDelay(ms) {
    if (ms && ms > 0) this.minDelayMs = Math.max(this.minDelayMs, ms);
  }

  /**
   * Aguarda o tempo necessário desde a última requisição.
   */
  async wait() {
    const now = Date.now();
    let delayMs = 0;

    if (this.lastRequestAt > 0) {
      const elapsed = now - this.lastRequestAt;
      if (elapsed < this.minDelayMs) {
        delayMs = this.minDelayMs - elapsed;
      }
    }

    // Jitter apenas quando há delay real (evita espera na 1ª requisição)
    if (delayMs > 0) {
      await sleep(delayMs + Math.random() * this.maxJitterMs);
    }
    this.lastRequestAt = Date.now();
  }
}

// ============================================================================
// 3) RETRY COM BACKOFF EXPONENCIAL
// ============================================================================

/**
 * Deve-se tentar de novo? Padrão: erros de rede (sem status), 429 e 5xx.
 */
function defaultShouldRetry(error) {
  const status = error?.response?.status;
  if (!status) return true; // erro de rede/timeout/DNS
  return status === 429 || status >= 500;
}

/**
 * Executa fn() com retry e backoff exponencial + jitter.
 *
 * @param {Function} fn - função assíncrona; recebe attempt (0-based)
 * @param {Object} [options]
 * @param {number} [options.retries=3] - tentativas após a primeira
 * @param {number} [options.baseDelayMs=1000] - atraso inicial
 * @param {number} [options.maxDelayMs=10000] - teto do atraso
 * @param {Function} [options.shouldRetry] - (error) => boolean
 * @param {Function} [options.onRetry] - ({ attempt, delayMs, error }) => void
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    retries = DEFAULT_SCRAPING_POLICY.retries,
    baseDelayMs = DEFAULT_SCRAPING_POLICY.retryBaseDelayMs,
    maxDelayMs = DEFAULT_SCRAPING_POLICY.retryMaxDelayMs,
    shouldRetry = defaultShouldRetry,
    onRetry = null
  } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)
      );

      if (onRetry) {
        onRetry({ attempt: attempt + 1, delayMs, error });
      }

      await sleep(delayMs);
    }
  }
}

export default {
  DEFAULT_SCRAPING_POLICY,
  parseRobotsTxt,
  isPathAllowed,
  getCrawlDelay,
  fetchRobotsTxt,
  RateLimiter,
  retryWithBackoff
};
