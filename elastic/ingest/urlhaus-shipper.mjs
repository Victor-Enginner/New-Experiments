#!/usr/bin/env node
/**
 * urlhaus-shipper.mjs — ameaças URLhaus → Elasticsearch (índice soc-urlhaus)
 *
 * Faz tail do `urlhaus-alerts.jsonl` (gravado por scripts/urlhaus-lookup.js
 * ou pelo urlhaus-daemon.sh) e envia cada alerta ao índice SIEM `soc-urlhaus`
 * via _bulk. Mesmo padrão dos demais shippers (netwatch/egress/idps).
 *
 * Uso:
 *   node elastic/ingest/urlhaus-shipper.mjs            # tail + envia ao ES
 *   node elastic/ingest/urlhaus-shipper.mjs --once     # envia o que há e sai
 *   node elastic/ingest/urlhaus-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from './es.mjs';
import { createTailer, readNewLines } from './sink.mjs';
import { INDEXES, urlhausAlertsFile, pollMs } from '../config.mjs';

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
    host: a.host,
    threat: a.threat,
    tags: a.tags,
    url: a.url,
    urlhausId: a.urlhausId,
    category: 'threat-intel',
    vendor: 'urlhaus',
  }));
  if (!docs.length) return;
  if (DRY) {
    for (const d of docs) console.log('[DRY]', JSON.stringify(d));
    sent += docs.length;
    return;
  }
  try {
    // idField=urlhausId → _id único do URLhaus: o ES deduplica alertas
    // repetidos (o produtor re-apenda o mesmo host a cada ciclo do daemon).
    const res = await bulkIndex(INDEXES.urlhaus(), docs, { idField: 'urlhausId', source: 'urlhaus-shipper' });
    sent += docs.length;
    console.log(`[URLHAUS→ES] ${docs.length} alertas enviados (took ${res.took}ms)`);
  } catch (err) {
    console.error('[URLHAUS→ES] erro:', err.message);
  }
}

async function main() {
  const file = urlhausAlertsFile();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  URLHAUS → ES (urlhaus-shipper)             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : ${file}`);
  console.log(`  ● destino : ${INDEXES.urlhaus()}`);
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
    console.log(`[URLHAUS→ES] pronto — ${sent} eventos no total.`);
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
  console.error('[URLHAUS→ES] erro fatal:', err);
  process.exit(1);
});
