#!/usr/bin/env node
/**
 * usage-shipper.mjs — histórico de uso do 9router → Elasticsearch
 *
 * Consulta o banco do 9router via lib/usage-history.js (que MASQUERA a
 * apiKey ANTES de serializar — nenhuma chave crua chega ao Elastic) e
 * envia cada chamada ao índice SIEM `soc-usage` via _bulk.
 *
 * Uso:
 *   node elastic/ingest/usage-shipper.mjs            # poll contínuo
 *   node elastic/ingest/usage-shipper.mjs --once     # envia o que há e sai
 *   node elastic/ingest/usage-shipper.mjs --dry-run  # mostra sem enviar
 */

import { bulkIndex, waitForEs, ensureSocTemplate } from './es.mjs';
import { INDEXES, pollMs } from '../config.mjs';
import { getUsageHistory } from '../../ai-experiments/lib/usage-history.js';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');
const POLL_MS = ONCE ? pollMs() : Math.max(pollMs(), 10000); // uso muda devagar

let lastId = 0;
let sent = 0;

async function flushNew() {
  let rows = [];
  try {
    const { rows: r } = await getUsageHistory({ limit: 1000 });
    rows = r;
  } catch (err) {
    console.error('[USAGE→ES] leitura do histórico falhou:', err.message);
    return;
  }
  const fresh = rows.filter((r) => r.id > lastId);
  if (!fresh.length) return;
  lastId = Math.max(lastId, ...fresh.map((r) => r.id));

  const docs = fresh.map((r) => ({
    id: r.id,
    '@timestamp': r.timestamp,
    provider: r.provider,
    model: r.model,
    connectionId: r.connectionId,
    endpoint: r.endpoint,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    cost: r.cost,
    status: r.status,
    apiKey: r.apiKey, // JÁ MASCARADO por usage-history.js (ex: sk-…xYz)
    category: 'usage-history',
    vendor: '9router',
  }));

  if (DRY) {
    for (const d of docs) console.log('[DRY]', JSON.stringify(d));
    sent += docs.length;
    return;
  }
  try {
    const res = await bulkIndex(INDEXES.usage(), docs, { idField: 'id', source: 'usage-shipper' });
    sent += docs.length;
    console.log(`[USAGE→ES] ${docs.length} chamadas enviadas (took ${res.took}ms, total ${sent})`);
  } catch (err) {
    console.error('[USAGE→ES] erro:', err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  USAGE → ES (usage-shipper)                 ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● origem  : banco do 9router (~/.9router/db/data.sqlite)`);
  console.log(`  ● destino : ${INDEXES.usage()}`);
  console.log(`  ● apiKey  : mascarada (nunca crua)`);
  console.log(`  ● modo    : ${DRY ? 'DRY-RUN' : ONCE ? 'UMA VEZ' : 'POLL CONTÍNUO'}`);
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
  } else if (!DRY) {
    const es = await waitForEs().catch(() => false);
    if (!es) console.warn('⚠ Elasticsearch não respondeu — continuo monitorando; eventos serão enviados quando voltar.');
    try {
      await ensureSocTemplate();
    } catch (err) {
      console.warn('⚠ index template soc:', err.message);
    }
  }

  await flushNew();
  if (ONCE) {
    console.log(`[USAGE→ES] pronto — ${sent} eventos no total.`);
    process.exit(0);
  }
  setInterval(flushNew, POLL_MS);
  console.log(`Consultando a cada ${POLL_MS / 1000}s em tempo real (Ctrl+C para parar)...\n`);
}

main().catch((err) => {
  console.error('[USAGE→ES] erro fatal:', err);
  process.exit(1);
});
