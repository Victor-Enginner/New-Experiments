#!/usr/bin/env node
/**
 * evaluate.mjs — avalia as regras de detecção contra o Elasticsearch
 *
 * Lê elastic/rules/*.json, executa a busca/correlação no ES e emite
 * *findings* (achados). Os achados alimentam actions/soar.mjs.
 *
 * Dois formatos de detecção:
 *   · { query, minCount, timeRange }       — simples: count >= minCount
 *   · { aggs: { field, minCount|maxCost, timeRange }, query } — agregação por campo
 *
 * Uso:
 *   node elastic/rules/evaluate.mjs                     # roda todas
 *   node elastic/rules/evaluate.mjs --rule EGR-EXFIL-CANDIDATE
 *   node elastic/rules/evaluate.mjs --json              # saída JSON pura
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { search } from '../ingest/es.mjs';
import { esUrl, esIndexPrefix } from '../config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(__dirname, '..', 'rules');
const args = process.argv.slice(2);
const ONLY = args.find((a) => a.startsWith('--rule='))?.split('=')[1] || null;
const JSON_OUT = args.includes('--json');

export function loadRules() {
  return readdirSync(RULES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(RULES_DIR, f), 'utf8')))
    .filter((r) => r.engine !== 'idps'); // signatures IDPS são avaliadas em tempo real pelo engine
}

/** Resolve index wildcard (ex: soc-netguard → soc-* é permitido pelo usuário) */
function indexFor(rule) {
  return rule.index || `${esIndexPrefix()}-*`;
}

function timeRangeQuery(seconds) {
  return { range: { '@timestamp': { gte: `now-${seconds}s` } } };
}

function parseRange(tr) {
  const m = String(tr).match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] || 3600;
  return Number(m[1]) * mult;
}

/**
 * Roda UMA regra e retorna findings.
 * @returns {Promise<Array>}
 */
export async function evaluateRule(rule) {
  const idx = indexFor(rule);
  const det = rule.detection;
  const findings = [];

  if (det.aggs) {
    const { field, minCount = 1, maxCost = null, timeRange = '1h' } = det.aggs;
    const range = parseRange(timeRange);
    const aggName = 'by_field';
    const query = {
      size: 0,
      query: {
        bool: { must: [det.query || { match_all: {} }, timeRangeQuery(range)] },
      },
      aggs: {
        [aggName]: {
          terms: { field, size: 50 },
          aggs: { cost_sum: { sum: { field: 'cost' } } },
        },
      },
    };
    const res = await search(idx, query);
    const buckets = res?.aggregations?.[aggName]?.buckets || [];
    for (const b of buckets) {
      const count = b.doc_count;
      const cost = b.cost_sum?.value || 0;
      const hitCond = minCount && count >= minCount;
      const costCond = maxCost != null && cost > maxCost;
      if (hitCond || costCond) {
        findings.push({
          ruleId: rule.id,
          title: rule.title,
          severity: rule.severity,
          field,
          value: b.key,
          count,
          cost,
          timeRange,
        });
      }
    }
    return findings;
  }

  const { query: q, minCount = 1, timeRange = '1h' } = det;
  const range = parseRange(timeRange);
  const res = await search(idx, {
    size: 20,
    query: {
      bool: { must: [q, timeRangeQuery(range)] },
    },
    sort: [{ '@timestamp': 'desc' }],
  });
  const total = res?.hits?.total?.value || 0;
  if (total >= minCount) {
    findings.push({
      ruleId: rule.id,
      title: rule.title,
      severity: rule.severity,
      count: total,
      timeRange,
      hits: (res?.hits?.hits || []).slice(0, 10).map((h) => h._source),
    });
  }
  return findings;
}

/**
 * Roda as regras e devolve findings + falhas de avaliação.
 *
 * Uma regra que ERROU (ex.: ES fora do ar) não pode ser confundida com
 * "regra avaliou e não achou nada" — daí o failures ser explícito.
 * @returns {Promise<{findings: Array, failures: Array<{ruleId: string, message: string}>}>}
 */
export async function evaluateAllDetailed({ filter = null } = {}) {
  const findings = [];
  const failures = [];
  for (const rule of loadRules()) {
    if (filter && rule.id !== filter) continue;
    try {
      findings.push(...(await evaluateRule(rule)));
    } catch (err) {
      console.error(`[EVAL] regra ${rule.id} falhou:`, err.message);
      failures.push({ ruleId: rule.id, message: err.message });
    }
  }
  return { findings, failures };
}

/** Compat: só os findings. Para ver as falhas, use evaluateAllDetailed(). */
export async function evaluateAll(opts = {}) {
  return (await evaluateAllDetailed(opts)).findings;
}

/** true se TODAS as falhas parecem de conectividade/auth com o Elasticsearch */
export function esUnreachable(failures) {
  const re = /ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|ENOTFOUND|fetch failed|socket hang up|\b401\b|\b403\b/i;
  return failures.length > 0 && failures.every((f) => re.test(f.message));
}

async function main() {
  const { findings, failures } = await evaluateAllDetailed({ filter: ONLY });

  if (JSON_OUT) {
    // stdout continua sendo JSON puro de findings (contrato de consumidores);
    // falhas vão para stderr e o exit code sinaliza avaliação incompleta.
    console.log(JSON.stringify(findings, null, 2));
    if (failures.length) process.exitCode = 1;
    return;
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  AVALIAÇÃO DE REGRAS (detecção SIEM)        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  if (failures.length) {
    console.error(`✖ ${failures.length} regra(s) NÃO puderam ser avaliadas — ` +
      (findings.length ? 'os findings abaixo estão INCOMPLETOS.' : 'nenhuma conclusão é confiável.'));
    for (const f of failures) console.error(`   · ${f.ruleId}: ${f.message}`);
    if (esUnreachable(failures)) {
      console.error(`   → Elasticsearch não respondeu em ${esUrl()}.`);
      console.error('     Suba o stack: ./elastic/start-native.sh  (depois: source ~/.elastic/env.sh)');
    }
    console.error('');
  }

  if (!findings.length) {
    if (failures.length) {
      console.error('✖ Avaliação INCOMPLETA — isto NÃO significa "tudo limpo".');
      process.exitCode = 1;
    } else {
      console.log('✓ Nenhuma regra disparou. Rede e uso dentro do esperado.');
    }
    return;
  }

  for (const f of findings) {
    console.log(`⚠ [${f.severity.toUpperCase()}] ${f.title} (${f.ruleId})`);
    const detail = f.field && f.value != null ? `${f.field}: ${f.value} | ` : '';
    console.log(`   · ${detail}ocorrências: ${f.count}${f.cost ? ` | custo: $${f.cost.toFixed(4)}` : ''}`);
  }
  if (failures.length) process.exitCode = 1;
}

// permite uso como módulo e como CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[EVAL] erro fatal:', err);
    process.exit(1);
  });
}
