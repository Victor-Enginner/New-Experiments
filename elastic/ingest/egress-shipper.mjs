#!/usr/bin/env node
/**
 * egress-shipper.mjs — bloqueios do FIREWALL DE EGRESS → Elasticsearch
 *
 * Faz tail do `egress-blocks.jsonl` (gravado pelo lib/egress.js quando o
 * firewall intercepta uma saída não autorizada) e envia cada bloqueio ao
 * índice SIEM `soc-egress` via _bulk.
 *
 * Uso:
 *   node elastic/ingest/egress-shipper.mjs            # tail + envia
 *   node elastic/ingest/egress-shipper.mjs --once     # envia o que há e sai
 *   node elastic/ingest/egress-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from './es.mjs';
import { createTailer, readNewLines } from './sink.mjs';
import { INDEXES, egressBlocksFile, pollMs } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');

let sent = 0;

async function flush(lines) {
  const docs = lines.map((b) => ({
    '@timestamp': b['@timestamp'] || new Date(b.ts || Date.now()).toISOString(),
    host: b.host,
    port: b.port,
    fingerprint: b.fingerprint,
    from: b.from,
    action: 'block',
    category: 'egress-firewall',
    vendor: 'egress',
  }));
  if (!docs.length) return;
  if (DRY) {
    for (const d of docs) console.log('[DRY]', JSON.stringify(d));
    sent += docs.length;
    return;
  }
  try {
    const res = await bulkIndex(INDEXES.egress(), docs, { source: 'egress-shipper' });
    sent += docs.length;
    console.log(`[EGRESS→ES] ${docs.length} bloqueios enviados (took ${res.took}ms)`);
  } catch (err) {
    console.error('[EGRESS→ES] erro:', err.message);
  }
}

async function main() {
  const file = egressBlocksFile();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  EGRESS → ES (egress-shipper)               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : ${file}`);
  console.log(`  ● destino : ${INDEXES.egress()}`);
  console.log(`  ● modo    : ${DRY ? 'DRY-RUN' : ONCE ? 'UMA VEZ' : 'TAIL (tempo real)'}`);
  console.log('');

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
    console.log(`[EGRESS→ES] pronto — ${sent} eventos no total.`);
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
  console.error('[EGRESS→ES] erro fatal:', err);
  process.exit(1);
});
