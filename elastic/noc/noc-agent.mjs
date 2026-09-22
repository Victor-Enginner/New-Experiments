#!/usr/bin/env node
/**
 * noc-agent.mjs — camada NOC (Network Operations Center)
 *
 * Coleta disponibilidade + desempenho dos serviços locais do stack SOC
 * (Elasticsearch, Kibana, Keycloak, router) e métricas do sistema
 * (/proc: CPU, memória, disco) — o que o SOC NÃO cobre.
 *
 * Grava em output/security/noc-health.jsonl (sink JSONL), consumido
 * depois pelo noc-shipper → índice soc-noc.
 *
 * Uso:
 *   node elastic/noc/noc-agent.mjs            # poll contínuo (default 30s)
 *   node elastic/noc/noc-agent.mjs --once     # uma rodada e sai
 *   NOC_INTERVAL_MS=10000 node elastic/noc/noc-agent.mjs
 */

import { readFileSync, statfsSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { appendRow } from '../ingest/sink.mjs';
import { nocHealthFile } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const INTERVAL_MS = Number(process.env.NOC_INTERVAL_MS || 30000);

/** Alvos de serviço: { name, url, timeoutMs, expect: [statuses ok] } */
const TARGETS = [
  { name: 'es', url: 'https://127.0.0.1:9200', timeoutMs: 5000, expect: [401, 200] },
  { name: 'kibana', url: 'https://127.0.0.1:5601/api/status', timeoutMs: 5000, expect: [200, 401, 302] },
  { name: 'keycloak', url: 'https://127.0.0.1:8443', timeoutMs: 5000, expect: [200, 302] },
  { name: 'router', url: 'http://127.0.0.1:20129', timeoutMs: 5000, expect: [200, 301, 302, 404, 405] },
];

/** HTTP/HTTPS check → { up, http, latencyMs } */
function probe(target) {
  return new Promise((resolve) => {
    const url = new URL(target.url);
    const mod = url.protocol === 'https:' ? https : http;
    const started = Date.now();
    // healthcheck de serviço local: não exigir verificação de CA por padrão
    // (cert self-signed). NOC_TLS_STRICT=1 exige CA via NOC_TLS_CA.
    const tls = url.protocol === 'https:' ? { rejectUnauthorized: process.env.NOC_TLS_STRICT === '1' } : {};
    const req = mod.get(url, { timeout: target.timeoutMs, ...tls }, (res) => {
      res.resume(); // drena a resposta
      const up = target.expect.includes(res.statusCode) || (res.statusCode >= 200 && res.statusCode < 500);
      resolve({ up, http: res.statusCode, latencyMs: Date.now() - started });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ up: false, http: 0, latencyMs: Date.now() - started, reason: 'timeout' });
    });
    req.on('error', () => {
      resolve({ up: false, http: 0, latencyMs: Date.now() - started, reason: 'unreachable' });
    });
  });
}

/** Métricas do sistema via /proc (sem root) */
function systemStats() {
  const mem = readFileSync('/proc/meminfo', 'utf8');
  const total = Number(mem.match(/MemTotal:\s+(\d+)/)?.[1] || 0);
  const avail = Number(mem.match(/MemAvailable:\s+(\d+)/)?.[1] || 0);
  const load = readFileSync('/proc/loadavg', 'utf8').split(/\s+/).slice(0, 3).map(Number);
  const disk = (p) => {
    try {
      const s = statfsSync(p);
      return Math.round((1 - s.bavail / s.blocks) * 1000) / 10;
    } catch {
      return null;
    }
  };
  return {
    mem_pct: total ? Math.round((1 - avail / total) * 1000) / 10 : null,
    load1: load[0] ?? null,
    load5: load[1] ?? null,
    load15: load[2] ?? null,
    disk_root_pct: disk('/'),
    disk_home_pct: disk('/home'),
  };
}

async function collectRound() {
  const out = [];
  for (const target of TARGETS) {
    const probeResult = await probe(target);
    out.push(appendRow(nocHealthFile(), {
      kind: 'service',
      service: target.name,
      url: target.url,
      up: probeResult.up,
      http: probeResult.http,
      latencyMs: probeResult.latencyMs,
      reason: probeResult.reason || null,
      vendor: 'noc',
      category: 'availability',
    }));
  }
  const sys = systemStats();
  out.push(appendRow(nocHealthFile(), {
    kind: 'system',
    service: 'sys',
    up: true,
    ...sys,
    vendor: 'noc',
    category: 'performance',
  }));
  for (const line of out) {
    const d = JSON.parse(line);
    console.log(`[NOC] ${d.kind === 'system' ? 'sys ' : d.service.padEnd(8)} ${d.up ? 'UP' : 'DOWN'}${d.latencyMs != null ? ` ${d.latencyMs}ms` : ''}${d.http ? ` http=${d.http}` : ''}${d.disk_home_pct != null ? ` disk/home=${d.disk_home_pct}%` : ''}`);
  }
  return out;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  NOC AGENT (disponibilidade + desempenho)    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● sink     : ${nocHealthFile()}`);
  console.log(`  ● intervalo: ${INTERVAL_MS / 1000}s`);
  console.log(`  ● modo     : ${ONCE ? 'UMA VEZ' : 'POLL CONTÍNUO'}`);
  console.log('');

  await collectRound();
  if (ONCE) process.exit(0);
  setInterval(collectRound, INTERVAL_MS).unref();
  console.log(`\nColetando a cada ${INTERVAL_MS / 1000}s (Ctrl+C para parar)...`);
}

main().catch((err) => {
  console.error('[NOC] erro fatal:', err);
  process.exit(1);
});
