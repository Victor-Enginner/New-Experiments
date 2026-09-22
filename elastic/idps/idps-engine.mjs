#!/usr/bin/env node
/**
 * idps-engine.mjs — IDPS (Intrusion Detection & Prevention System)
 *
 * Motor em tempo real que consome os sinks JSONL dos sensores
 * (netguard, egress, noc) e aplica *signatures* de intrusão. Para cada
 * detecção:
 *   · registra a decisão em output/security/idps-decisions.jsonl
 *     (→ soc-idps via idps-shipper)
 *   · executa a resposta SOAR definida na regra (notify/quarantine)
 *     — prevenção: o egress passa a bloquear o host em runtime.
 *
 * Signatures:
 *   IDPS-EGR-BURST  exfiltração: mesmo host bloqueado ≥4x em 10min
 *   IDPS-MITM-ARP   MITM: ARP spoofing / gateway trocado
 *   IDPS-DNS-HIJACK nameservers alterados
 *   IDPS-SUS-CONN   conexão suspeita da rede local
 *   IDPS-SVC-OUT    serviço crítico do stack fora do ar
 *
 * Uso:
 *   node elastic/idps/idps-engine.mjs             # monitor contínuo
 *   node elastic/idps/idps-engine.mjs --once      # avalia o que há e sai
 *   node elastic/idps/idps-engine.mjs --dry-run   # mostra sem agir
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Estado próprio do IDPS (offsets separados dos shippers — o IDPS e os
// shippers leem os MESMOS sinks em paralelo, cada um com seu offset).
process.env.STATE_DIR ||= join(dirname(fileURLToPath(import.meta.url)), '..', 'state', 'idps');

import { appendRow, createTailer, readNewLines } from '../ingest/sink.mjs';
import { applyFinding } from '../actions/soar.mjs';
import { egressBlocksFile, netguardAlertsFile, nocHealthFile, idpsDecisionsFile, urlhausAlertsFile } from '../config.mjs';

const args = process.argv.slice(2);
const ONCE = args.includes('--once');
const DRY = args.includes('--dry-run');
const WINDOW_MS = Number(process.env.IDPS_WINDOW_MS || 10 * 60 * 1000); // janela das signatures
const COOLDOWN_MS = Number(process.env.IDPS_COOLDOWN_MS || 15 * 60 * 1000); // dedup de ação
const EGR_BURST = Number(process.env.IDPS_EGR_BURST || 4);

// janela deslizante de eventos recentes por fonte
const recents = { egress: [], netguard: [], noc: [] };
const acted = new Map(); // sig|target → timestamp (cooldown de ação)

function prune() {
  const now = Date.now();
  for (const k of Object.keys(recents)) {
    recents[k] = recents[k].filter((e) => now - e._t < WINDOW_MS);
  }
  for (const [key, t] of acted) {
    if (now - t > COOLDOWN_MS) acted.delete(key);
  }
}

function groupBy(arr, fn) {
  const m = new Map();
  for (const e of arr) {
    const k = fn(e);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(e);
  }
  return m;
}

function shouldAct(sig, target) {
  const key = `${sig}|${target ?? ''}`;
  if (acted.has(key)) return false;
  acted.set(key, Date.now());
  return true;
}

async function decide(sig, target, severity, reason, action, confidence, finding) {
  if (DRY) {
    console.log(`[IDPS-DRY] ${sig} → ${target || '(n/a)'} (${action}, conf ${confidence}): ${reason}`);
    return;
  }
  appendRow(idpsDecisionsFile(), {
    kind: 'idps',
    signature: sig,
    target,
    severity,
    reason,
    action,
    confidence,
    decision: 'prevent',
    vendor: 'idps',
    category: 'intrusion',
  });
  console.log(`▲ [IDPS] ${sig} → ${target || '(n/a)'} (${action}, conf ${confidence}): ${reason}`);
  await applyFinding(finding);
}

/** Signatures de exfiltração/port-scan a partir do sink do egress */
async function onEgress(events) {
  for (const e of events) {
    const host = e.host || e.target;
    recents.egress.push({ ...e, _t: e.ts || Date.now(), _host: host });
  }
  const byHost = groupBy(recents.egress, (e) => e._host);
  for (const [host, list] of byHost) {
    if (host && list.length >= EGR_BURST && shouldAct('IDPS-EGR-BURST', host)) {
      await decide('IDPS-EGR-BURST', host, 'high',
        `${list.length} bloqueios de exfiltração em ${Math.round(WINDOW_MS / 60000)}min`,
        'quarantine', 90,
        { ruleId: 'IDPS-EGR-BURST', title: 'Rafaga de exfiltração via egress', severity: 'high', field: 'host', value: host, count: list.length, timeRange: '10m' });
    }
  }
}

/** Signatures de MITM/DNS a partir do netguard */
async function onNetguard(events) {
  for (const e of events) {
    const type = e.type || e.alert_type;
    recents.netguard.push({ ...e, _t: e.ts || Date.now(), _type: type });
  }
  const mitm = recents.netguard.filter((e) => e._type === 'ARP_SPOOFING' || e._type === 'GATEWAY_CHANGE');
  if (mitm.length && shouldAct('IDPS-MITM-ARP', 'network')) {
    await decide('IDPS-MITM-ARP', 'network', 'critical',
      `${mitm.length} eventos MITM/rota (${mitm.map((e) => e._type).join(', ')})`,
      'notify', 95,
      { ruleId: 'IDPS-MITM-ARP', title: 'ARP spoofing / gateway trocado', severity: 'critical', count: mitm.length, timeRange: '10m' });
  }
  const dns = recents.netguard.filter((e) => e._type === 'DNS_CHANGE');
  if (dns.length && shouldAct('IDPS-DNS-HIJACK', 'network')) {
    await decide('IDPS-DNS-HIJACK', 'network', 'high',
      `${dns.length} alterações de nameserver detectadas`,
      'notify', 85,
      { ruleId: 'IDPS-DNS-HIJACK', title: 'Nameservers alterados (DNS hijack)', severity: 'high', count: dns.length, timeRange: '10m' });
  }
  const sus = recents.netguard.filter((e) => e._type === 'SUSPICIOUS_CONNECTION');
  if (sus.length && shouldAct('IDPS-SUS-CONN', 'network')) {
    await decide('IDPS-SUS-CONN', 'network', 'medium',
      `${sus.length} conexões suspeitas da rede local`,
      'notify', 60,
      { ruleId: 'IDPS-SUS-CONN', title: 'Conexão suspeita detectada', severity: 'medium', count: sus.length, timeRange: '10m' });
  }
}

/** Signature de ameaça externa a partir do URLhaus (urlhaus-lookup.js) */
async function onUrlhaus(events) {
  for (const e of events) {
    if (e.type === 'URLHAUS_MATCH' && shouldAct('IDPS-URLHAUS', e.host || e.target)) {
      await decide('IDPS-URLHAUS', e.host || 'unknown', 'critical',
        `Destino ${e.host} listado no URLhaus (${e.threat || 'malware'}) — ${e.url || ''}`,
        'quarantine', 95,
        { ruleId: 'IDPS-URLHAUS', title: 'Destino em lista de malware (URLhaus)', severity: 'critical', field: 'host', value: e.host, threat: e.threat, url: e.url, timeRange: 'recente' });
    }
  }
}

/** Signature de indisponibilidade a partir do NOC */
async function onNoc(events) {
  for (const e of events) {
    recents.noc.push({ ...e, _t: e.ts || Date.now() });
  }
  const down = recents.noc.filter((e) => e.kind === 'service' && e.up === false);
  const bySvc = groupBy(down, (e) => e.service);
  for (const [svc, list] of bySvc) {
    if (svc && shouldAct('IDPS-SVC-OUT', svc)) {
      await decide('IDPS-SVC-OUT', svc, 'critical',
        `${list.length} healthchecks com falha em ${Math.round(WINDOW_MS / 60000)}min`,
        'notify', 90,
        { ruleId: 'IDPS-SVC-OUT', title: 'Serviço crítico do stack fora do ar', severity: 'critical', field: 'service', value: svc, count: list.length, timeRange: '10m' });
    }
  }
}

function runOnce(src, events) {
  prune();
  if (src === 'egress') return onEgress(events);
  if (src === 'netguard') return onNetguard(events);
  if (src === 'urlhaus') return onUrlhaus(events);
  return onNoc(events);
}

async function processSinksOnce() {
  await runOnce('egress', readNewLines(egressBlocksFile()));
  await runOnce('netguard', readNewLines(netguardAlertsFile()));
  await runOnce('urlhaus', readNewLines(urlhausAlertsFile()));
  await runOnce('noc', readNewLines(nocHealthFile()));
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  IDPS — Detecção e Prevenção de Intrusão     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ● sinks   : netguard-alerts / egress-blocks / noc-health`);
  console.log(`  ● decisões: ${idpsDecisionsFile()}`);
  console.log(`  ● janela  : ${WINDOW_MS / 60000}min | cooldown: ${COOLDOWN_MS / 60000}min | burst: ${EGR_BURST}`);
  console.log(`  ● modo    : ${DRY ? 'DRY-RUN' : ONCE ? 'UMA VEZ' : 'MONITOR CONTÍNUO'}`);
  console.log('');

  if (ONCE) {
    await processSinksOnce();
    console.log('[IDPS] pronto.');
    process.exit(0);
  }

  createTailer(egressBlocksFile(), { intervalMs: 2000, onLines: (_f, l) => runOnce('egress', l) }).start();
  createTailer(netguardAlertsFile(), { intervalMs: 2000, onLines: (_f, l) => runOnce('netguard', l) }).start();
  createTailer(urlhausAlertsFile(), { intervalMs: 2000, onLines: (_f, l) => runOnce('urlhaus', l) }).start();
  createTailer(nocHealthFile(), { intervalMs: 2000, onLines: (_f, l) => runOnce('noc', l) }).start();
  setInterval(prune, 30 * 1000).unref();
  console.log('Monitorando sensores em tempo real (Ctrl+C para parar)...\n');
}

main().catch((err) => {
  console.error('[IDPS] erro fatal:', err);
  process.exit(1);
});
