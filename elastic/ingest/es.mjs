/**
 * es.mjs — Cliente mínimo para Elasticsearch (zero dependências)
 *
 * Usa apenas node:http/https. Nada é instalado; o cliente fala o
 * protocolo REST/_bulk do Elasticsearch diretamente.
 *
 * Uso:
 *   import { bulkIndex, search, ping, esUrl } from '../ingest/es.mjs';
 *   await bulkIndex('soc-netguard', docs, { source: 'netwatch-shipper' });
 */

import http from 'node:http';
import https from 'node:https';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { esUrl, esAuth, esCa } from '../config.mjs';

function request(method, path, { body, headers = {}, timeoutMs = 15000, json = false } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(esUrl());
    const mod = url.protocol === 'https:' ? https : http;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const { user, pass, apiKey } = esAuth();
    const caPath = esCa();
    let ca = undefined;
    if (caPath) {
      try {
        ca = readFileSync(caPath);
      } catch {
        ca = undefined;
      }
    }
    const reqHeaders = { ...headers };
    if (body) {
      reqHeaders['content-type'] = json ? 'application/json' : 'application/x-ndjson';
      reqHeaders['content-length'] = Buffer.byteLength(body);
    }
    if (apiKey) {
      reqHeaders.authorization = `ApiKey ${apiKey}`;
    } else if (user) {
      reqHeaders.authorization = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    }
    const req = mod.request(
      {
        host: url.hostname,
        port,
        method,
        path,
        headers: reqHeaders,
        rejectUnauthorized: process.env.ES_TLS_REJECT !== '0',
        ...(ca ? { ca } : {}),
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            /* resposta não-JSON */
          }
          resolve({ status: res.statusCode, json, raw });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('ES timeout')));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Índice em lote via API _bulk (ndjson: linha de ação + linha de fonte).
 * @param {string} index
 * @param {Array<Object>} docs
 * @param {Object} [opts]  { idField, source }
 * @returns {Promise<{took, items, errors, status}>}
 */
export async function bulkIndex(index, docs, { idField = null, source = 'unknown' } = {}) {
  if (!docs.length) return { status: 200, errors: false, items: [] };
  let nd = '';
  for (const d of docs) {
    const meta = { index: { _index: index } };
    if (idField && d[idField] != null) meta.index._id = String(d[idField]);
    nd += JSON.stringify(meta) + '\n';
    nd += JSON.stringify({ ...d, '@timestamp': d['@timestamp'] || new Date(d.ts || Date.now()).toISOString(), source }) + '\n';
  }
  const { status, json, raw } = await request('POST', `/${index}/_bulk`, { body: nd });
  if (status >= 400) {
    throw new Error(`ES bulk falhou (HTTP ${status}): ${(json?.error?.reason || raw || '').slice(0, 300)}`);
  }
  const errors = json?.errors === true;
  const items = json?.items || [];
  if (errors) {
    const first = items.find((i) => (i.index || {}).error)?.index;
    throw new Error(`ES bulk com erros: ${JSON.stringify(first?.error || {}).slice(0, 300)}`);
  }
  return { took: json?.took, errors, items, status };
}

/**
 * Consulta simples de busca (match_all com filtro).
 * @param {string} index
 * @param {Object} query  body da busca
 */
export async function search(index, query) {
  const { status, json } = await request('POST', `/${index}/_search`, { body: JSON.stringify(query) });
  if (status >= 400) throw new Error(`ES search falhou (HTTP ${status}): ${JSON.stringify(json?.error || {}).slice(0, 300)}`);
  return json;
}

export async function ping() {
  const { status } = await request('GET', '/');
  return status >= 200 && status < 300;
}

/**
 * Ping com detalhes (status + latência). Usado pelos probes do dashboard:
 * trata TLS self-signed (CA) e auth do env como o resto do cliente.
 * @returns {Promise<{status: number, latencyMs: number}>}
 */
export async function pingDetailed() {
  const start = Date.now();
  const { status } = await request('GET', '/');
  return { status, latencyMs: Date.now() - start };
}

/** Aguarda o ES ficar disponível (bootstrap/restart em swarm). @returns {boolean} */
export async function waitForEs({ tries = 60, intervalMs = 2000 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    try {
      if (await ping()) return true;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Index template para soc-* — garante que campos de agregação/ordenação
 * sejam `keyword` (o mapeamento dinâmico os criaria como `text`).
 * Idempotente; aplica apenas a índices NOVOS.
 */
export async function ensureSocTemplate() {
  const template = {
    index_patterns: ['soc-*'],
    priority: 500,
    template: {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          ts: { type: 'long' },
          severity: { type: 'keyword' },
          alert_type: { type: 'keyword' },
          detail: { type: 'text' },
          host: { type: 'keyword' },
          port: { type: 'integer' },
          fingerprint: { type: 'keyword' },
          from: { type: 'keyword' },
          provider: { type: 'keyword' },
          model: { type: 'keyword' },
          status: { type: 'keyword' },
          endpoint: { type: 'keyword' },
          connectionId: { type: 'keyword' },
          promptTokens: { type: 'integer' },
          completionTokens: { type: 'integer' },
          tokens: { type: 'integer' },
          cost: { type: 'double' },
          apiKey: { type: 'keyword' },
          action: { type: 'keyword' },
          category: { type: 'keyword' },
          vendor: { type: 'keyword' },
          source: { type: 'keyword' },
          kind: { type: 'keyword' },
          service: { type: 'keyword' },
          up: { type: 'boolean' },
          http: { type: 'integer' },
          latencyMs: { type: 'integer' },
          reason: { type: 'keyword' },
          mem_pct: { type: 'float' },
          load1: { type: 'float' },
          load5: { type: 'float' },
          load15: { type: 'float' },
          disk_root_pct: { type: 'float' },
          disk_home_pct: { type: 'float' },
          signature: { type: 'keyword' },
          decision: { type: 'keyword' },
          target: { type: 'keyword' },
          confidence: { type: 'integer' },
          threat: { type: 'keyword' },
          tags: { type: 'keyword' },
          url: { type: 'keyword' },
          urlhausId: { type: 'keyword' },
        },
      },
    },
  };
  const { status, json } = await request('PUT', '/_index_template/soc', {
    body: JSON.stringify(template),
    json: true,
  });
  if (status >= 400) {
    throw new Error(`index template soc falhou (HTTP ${status}): ${JSON.stringify(json?.error || {}).slice(0, 200)}`);
  }
  return true;
}

export async function countByDateRange(index, timeRangeMs = 3600000) {
  const { json } = await request('POST', `/${index}/_search`, {
    body: JSON.stringify({
      size: 0,
      query: { range: { '@timestamp': { gte: `now-${Math.round(timeRangeMs / 1000)}s` } } },
    }),
  });
  return json?.hits?.total?.value ?? 0;
}

export default { esUrl, bulkIndex, search, ping, countByDateRange };
