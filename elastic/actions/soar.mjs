#!/usr/bin/env node
/**
 * soar.mjs — Resposta Orquestrada, Automatizada e Reativa (SOAR)
 *
 * Recebe os *findings* do evaluate.mjs e executa as respostas definidas
 * em cada regra (rule.response.action):
 *
 *   · notify    — registra o incidente (console + log JSONL)
 *   · quarantine — adiciona o host à quarentena:
 *                   1. grava em output/security/quarentena.jsonl
 *                   2. opcional: POST para QUARANTINE_RELAY_URL
 *                      (ex.: endpoint de um serviço que chama
 *                       quarantineHost() do egress)
 *
 * Uso:
 *   node elastic/actions/soar.mjs                    # roda eval + aplica
 *   node elastic/actions/soar.mjs --rule EGR-EXFIL-CANDIDATE
 *   node elastic/actions/soar.mjs --dry-run          # mostra sem agir
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAllDetailed, esUnreachable } from '../rules/evaluate.mjs';
import { appendRow } from '../ingest/sink.mjs';
import { quarantineFile } from '../config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(__dirname, '..', 'rules');
const RULE_FILES = new Map([
  ['netg-arp-spoof', 'netg-arp-spoof.json'],
  ['netg-dns-hijack', 'netg-dns-hijack.json'],
  ['netg-gw-change', 'netg-gw-change.json'],
  ['egr-exfil-candidate', 'egr-exfil-candidate.json'],
  ['usg-anomaly-cost', 'usg-anomaly-cost.json'],
  ['noc-svc-down', 'noc-svc-down.json'],
  ['noc-high-latency', 'noc-high-latency.json'],
  ['noc-disk-pressure', 'noc-disk-pressure.json'],
  ['idps-egr-burst', 'idps-egr-burst.json'],
  ['idps-mitm-arp', 'idps-mitm-arp.json'],
  ['idps-dns-hijack', 'idps-dns-hijack.json'],
  ['idps-sus-conn', 'idps-sus-conn.json'],
  ['idps-svc-out', 'idps-svc-out.json'],
]);
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--rule='))?.split('=')[1] || null;
const ONLY = onlyArg ? assertSafeRuleId(onlyArg) : null;
const DRY = args.includes('--dry-run');

function assertSafeRuleId(ruleId) {
  if (!/^[a-z0-9-]+$/i.test(String(ruleId || ''))) {
    throw new Error(`ruleId inválido: ${ruleId}`);
  }
  return ruleId.toLowerCase();
}

function safeRulePath(ruleId) {
  const safeRuleId = assertSafeRuleId(ruleId);
  const fileName = RULE_FILES.get(safeRuleId);
  if (!fileName) {
    throw new Error(`ruleId não cadastrado: ${ruleId}`);
  }
  return join(RULES_DIR, fileName);
}

function responseFor(ruleId) {
  try {
    return JSON.parse(readFileSync(safeRulePath(ruleId), 'utf8')).response || {};
  } catch {
    return {};
  }
}

/**
 * Aplica a resposta SOAR de UMA regra (notify/quarantine) a um finding.
 * Exportado para reuso pelo IDPS (prevenção em tempo real).
 * @param {{ruleId:string,title?:string,severity?:string,field?:string,value?:string,count?:number,timeRange?:string}} finding
 */
export async function applyFinding(finding) {
  const response = responseFor(finding.ruleId) || {};
  const action = response?.action || 'notify';

  if (action === 'quarantine') {
    const host = finding.value;
    if (!host) return;
    const entry = {
      '@timestamp': new Date().toISOString(),
      rule: finding.ruleId,
      severity: finding.severity,
      host,
      reason: `${finding.title} (${finding.count} ocorrências em ${finding.timeRange})`,
      action: 'quarantine',
    };
    if (DRY) {
      console.log(`[SOAR-DRY] quarantine ${host} — ${entry.reason}`);
      return;
    }
    appendRow(quarantineFile(), entry);
    console.log(`■ [SOAR] QUARENTENA aplicada a ${host} (${entry.reason})`);

    const relay = process.env.QUARANTINE_RELAY_URL;
    if (relay) {
      try {
        const res = await fetch(relay, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ host, rule: finding.ruleId }),
        });
        console.log(`  · relay ${relay} → HTTP ${res.status}`);
      } catch (err) {
        console.error(`  · relay falhou: ${err.message}`);
      }
    } else {
      console.log('  · dica: defina QUARANTINE_RELAY_URL para bloquear em tempo de execução via quarantineHost()');
    }
    return;
  }

  // notify (padrão)
  const entry = {
    '@timestamp': new Date().toISOString(),
    rule: finding.ruleId,
    severity: finding.severity,
    title: finding.title,
    count: finding.count,
    timeRange: finding.timeRange,
    action: 'notify',
  };
  if (DRY) {
    console.log(`[SOAR-DRY] notify ${finding.ruleId} — ${finding.title}`);
    return;
  }
  appendRow(quarantineFile(), { ...entry, kind: 'incident' });
  console.log(`⚠ [SOAR] incidente registrado: ${finding.ruleId} (${finding.title})`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SOAR — Resposta Automatizada a Incidentes  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const { findings, failures } = await evaluateAllDetailed({ filter: ONLY });
  if (failures.length) {
    console.error(`✖ ${failures.length} regra(s) não puderam ser avaliadas — resultado INCOMPLETO:`);
    for (const f of failures) console.error(`   · ${f.ruleId}: ${f.message}`);
    if (esUnreachable(failures)) {
      console.error('   → Elasticsearch fora do ar? ./elastic/start-native.sh  (depois: source ~/.elastic/env.sh)');
    }
    if (!findings.length) {
      console.error('✖ Abortado: sem avaliação completa não dá pra afirmar "nenhuma ação necessária".');
      process.exitCode = 1;
      return;
    }
    console.error('   Seguindo apenas com os findings disponíveis (parcial).');
    process.exitCode = 1;
  }
  if (!findings.length) {
    console.log('✓ Nenhum finding — nenhuma ação necessária.');
    return;
  }
  for (const f of findings) await applyFinding(f);
  console.log(`\n${DRY ? '[DRY] ' : ''}${findings.length} finding(s) processado(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[SOAR] erro fatal:', err);
    process.exit(1);
  });
}
