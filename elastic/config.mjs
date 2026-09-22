/**
 * config.mjs — Configuração central do SOAR SIEM (camada Elastic)
 *
 * Precedência de leitura (padrão do projeto):
 *   env -> arquivo de config local (elastic/.env) -> defaults
 *
 * Nada secreto vai para o Elastic: os shippers sempre mascaram
 * API keys ANTES de enviar (ver lib/usage-history.js).
 */

import { readFileSync } from 'node:fs';

export function esUrl() {
  return process.env.ES_URL || 'http://localhost:9200';
}

export function esAuth() {
  if (process.env.ES_API_KEY) {
    return { user: null, pass: null, apiKey: process.env.ES_API_KEY };
  }
  const user = process.env.ES_USER || '';
  // senha por env direto ou por arquivo (docker secret /run/secrets/...)
  let pass = process.env.ES_PASS || '';
  if (!pass && process.env.ES_PASS_FILE) {
    try {
      pass = readFileSync(process.env.ES_PASS_FILE, 'utf8').trim();
    } catch {
      pass = '';
    }
  }
  return { user, pass, apiKey: null };
}

/** Caminho do CA (auto-certs do ES) para TLS — null = verificação padrão do sistema */
export function esCa() {
  return process.env.ES_TLS_CA || null;
}

export function esIndexPrefix() {
  return process.env.ES_INDEX_PREFIX || 'soc';
}

/** Indexes SIEM */
export const INDEXES = {
  netguard: (p = esIndexPrefix()) => `${p}-netguard`,
  egress: (p = esIndexPrefix()) => `${p}-egress`,
  usage: (p = esIndexPrefix()) => `${p}-usage`,
  noc: (p = esIndexPrefix()) => `${p}-noc`,
  idps: (p = esIndexPrefix()) => `${p}-idps`,
  urlhaus: (p = esIndexPrefix()) => `${p}-urlhaus`,
};

/** Poll interval padrão dos shippers (ms) */
export function pollMs() {
  return Number(process.env.ES_POLL_MS || 2000);
}

/** Estado processado (offset de leitura de arquivos JSONL) */
export function stateDir() {
  return process.env.STATE_DIR || new URL('./state/', import.meta.url).pathname;
}

/** Caminho absoluto do diretório de segurança (output do ai-experiments) */
export function securityOutputDir() {
  return process.env.SECURITY_OUTPUT_DIR || '/home/yoxzy/meus-projetos/meu-portfolio/ai-experiments/output/security';
}

/** Caminho do alert log do netguard (netwatch.js grava aqui) */
export function netguardAlertsFile() {
  return `${securityOutputDir()}/netguard-alerts.jsonl`;
}

/** Caminho do sink de bloqueios do egress (egress.js grava aqui) */
export function egressBlocksFile() {
  return `${securityOutputDir()}/egress-blocks.jsonl`;
}

/** Caminho do sink de ameaças URLhaus (urlhaus-lookup.js grava aqui) */
export function urlhausAlertsFile() {
  return `${securityOutputDir()}/urlhaus-alerts.jsonl`;
}

/** Caminho do log de quarentena SOAR */
export function quarantineFile() {
  return `${securityOutputDir()}/quarantine.jsonl`;
}

/** Caminho do sink de saúde NOC (noc-agent.mjs grava aqui) */
export function nocHealthFile() {
  return `${securityOutputDir()}/noc-health.jsonl`;
}

/** Caminho do registro de decisões IDPS (idps-engine.mjs grava aqui) */
export function idpsDecisionsFile() {
  return `${securityOutputDir()}/idps-decisions.jsonl`;
}

export default { esUrl, esAuth, esIndexPrefix, INDEXES, pollMs, stateDir, securityOutputDir, netguardAlertsFile, egressBlocksFile, urlhausAlertsFile, quarantineFile, nocHealthFile, idpsDecisionsFile };
