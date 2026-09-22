#!/usr/bin/env node
/**
 * idps-shipper.mjs — decisões IDPS (idps-decisions.jsonl) → Elasticsearch
 *
 * Uso:
 *   node elastic/idps/idps-shipper.mjs            # tail contínuo
 *   node elastic/idps/idps-shipper.mjs --once     # envia o que há e sai
 *   node elastic/idps/idps-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from '../ingest/es.mjs';
import { createTailer, readNewLines } from '../ingest/sink.mjs';
import { INDEXES, idpsDecisionsFile, pollMs } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');

let sent = 0;

async function flush(lines) {
  const docs = lines.map((r) => ({
    '@timestamp': new Date(r.ts || Date.now()).toISOString(),
    kind: r.kind,
    signature: r.signature,
    target: r.target,
    severity: r.severity,
    reason: r.reason,
    action: r.action,
    confidence: r.confidence,
    decision: r.decision,
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
    const res = await bulkIndex(INDEXES.idps(), docs, { source: 'idps-shipper' });
    sent += docs.length;
    console.log(`[IDPS→ES] ${docs.length} decisões enviadas (took ${res.took}ms)`);
  } catch (err) {
    console.error('[IDPS→ES] erro:', err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  IDPS → ES (idps-shipper)                   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : ${idpsDecisionsFile()}`);
  console.log(`  ● destino : ${INDEXES.idps()}`);
  console.log(`  ● modo    : ${DRY ? 'DRY-RUN' : ONCE ? 'UMA VEZ' : 'POLL CONTÍNUO'}`);
  console.log('');

  const file = idpsDecisionsFile();
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
    console.log(`[IDPS→ES] pronto — ${sent} eventos no total.`);
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
  console.error('[IDPS→ES] erro fatal:', err);
  process.exit(1);
});
