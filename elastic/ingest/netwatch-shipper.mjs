#!/usr/bin/env node
/**
 * netwatch-shipper.mjs — alertas do NETGUARD → Elasticsearch
 *
 * Faz tail do `netguard-alerts.jsonl` (gravado pelo scripts/netwatch.js)
 * e envia cada alerta ao índice SIEM `soc-netguard` via _bulk.
 *
 * Uso:
 *   node elastic/ingest/netwatch-shipper.mjs            # tail + envia ao ES
 *   node elastic/ingest/netwatch-shipper.mjs --once     # envia o que há e sai
 *   node elastic/ingest/netwatch-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from './es.mjs';
import { createTailer, readNewLines } from './sink.mjs';
import { INDEXES, netguardAlertsFile, pollMs } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');

let sent = 0;

async function flush(lines) {
  const docs = lines.map((a) => ({
    '@timestamp': new Date(a.ts || Date.now()).toISOString(),
    severity: a.severity,
    alert_type: a.type,
    detail: a.detail,
    category: 'network-security',
    vendor: 'netguard',
  }));
  if (!docs.length) return;
  if (DRY) {
    for (const d of docs) console.log('[DRY]', JSON.stringify(d));
    sent += docs.length;
    return;
  }
  try {
    const res = await bulkIndex(INDEXES.netguard(), docs, { source: 'netwatch-shipper' });
    sent += docs.length;
    console.log(`[NETWATCH→ES] ${docs.length} alertas enviados (took ${res.took}ms)`);
  } catch (err) {
    console.error('[NETWATCH→ES] erro:', err.message);
  }
}

async function main() {
  const file = netguardAlertsFile();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  NETGUARD → ES (netwatch-shipper)           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : ${file}`);
  console.log(`  ● destino : ${INDEXES.netguard()}`);
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
    console.log(`[NETWATCH→ES] pronto — ${sent} eventos no total.`);
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
  console.error('[NETWATCH→ES] erro fatal:', err);
  process.exit(1);
});
