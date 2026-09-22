#!/usr/bin/env node
/**
 * noc-shipper.mjs — saúde NOC (noc-health.jsonl) → Elasticsearch (soc-noc)
 *
 * Uso:
 *   node elastic/noc/noc-shipper.mjs            # tail contínuo
 *   node elastic/noc/noc-shipper.mjs --once     # envia o que há e sai
 *   node elastic/noc/noc-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from '../ingest/es.mjs';
import { createTailer, readNewLines } from '../ingest/sink.mjs';
import { INDEXES, nocHealthFile, pollMs } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');

let sent = 0;

async function flush(lines) {
  const docs = lines.map((r) => ({
    '@timestamp': new Date(r.ts || Date.now()).toISOString(),
    kind: r.kind,
    service: r.service,
    up: r.up,
    http: r.http,
    latencyMs: r.latencyMs,
    reason: r.reason,
    mem_pct: r.mem_pct,
    load1: r.load1,
    load5: r.load5,
    load15: r.load15,
    disk_root_pct: r.disk_root_pct,
    disk_home_pct: r.disk_home_pct,
    category: r.category,
    vendor: r.vendor,
  }));
  if (!docs.length) return;
  if (DRY) {
    for (const d of docs) console.log('[DRY]', JSON.stringify(d));
    sent += docs.length;
    return;
  }
  try {
    const res = await bulkIndex(INDEXES.noc(), docs, { source: 'noc-shipper' });
    sent += docs.length;
    console.log(`[NOC→ES] ${docs.length} métricas enviadas (took ${res.took}ms)`);
  } catch (err) {
    console.error('[NOC→ES] erro:', err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  NOC → ES (noc-shipper)                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : ${nocHealthFile()}`);
  console.log(`  ● destino : ${INDEXES.noc()}`);
  console.log(`  ● modo    : ${DRY ? 'DRY-RUN' : ONCE ? 'UMA VEZ' : 'POLL CONTÍNUO'}`);
  console.log('');

  const file = nocHealthFile();
  if (ONCE) {
    if (!DRY) {
      const es = await waitForEs({ tries: 2, intervalMs: pollMs() }).catch(() => false);
      if (!es) {
        console.error('✖ Elasticsearch indisponível. Use --dry-run para ver o que seria enviado.');
        process.exit(1);
      }
      try {
        await ensureSocTemplate();
      } catch (err) {
        console.warn('⚠ index template soc:', err.message);
      }
    }
    await flush(readNewLines(file));
    console.log(`[NOC→ES] pronto — ${sent} eventos no total.`);
    process.exit(0);
  }

  if (!DRY) {
    const es = await waitForEs().catch(() => false);
    if (!es) console.warn('⚠ Elasticsearch não respondeu — continuo monitorando; eventos serão enviados quando voltar.');
    try {
      await ensureSocTemplate();
    } catch (err) {
      console.warn('⚠ index template soc:', err.message);
    }
  }

  createTailer(file, {
    intervalMs: pollMs(),
    onLines: (_f, lines) => flush(lines),
  }).start();
  console.log(`Monitorando ${file} em tempo real (Ctrl+C para parar)...\n`);
}

main().catch((err) => {
  console.error('[NOC→ES] erro fatal:', err);
  process.exit(1);
});
