#!/usr/bin/env node

/**
 * 🏭 FÁBRICA DE RENDA IA — Orquestrador Central
 *
 * Coordena os 5 pilares de renda autônoma:
 *   1. datasets   → Venda de datasets limpos (projeto data-sales-agent)
 *   2. ebooks     → Guias técnicos de nicho (KDP/Hotmart/Gumroad)
 *   3. prompts    → Packs de prompts profissionais (PromptBase/Etsy)
 *   4. api        → API de sentimento PT-BR (pay-per-call/RapidAPI)
 *   5. microsaas  → Gerador de contratos (assinatura Stripe)
 *
 * Uso:
 *   node main.js                        → menu + status de todos os pilares
 *   node main.js --agente ebooks --nicho ia-advocacia
 *   node main.js --agente prompts --nicho ia-contabilidade
 *   node main.js --agente datasets      → delega ao data-sales-agent
 *   node main.js --nichos               → lista nichos priorizados
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { statusLLM } from './lib/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function arg(nome) {
  const i = args.indexOf(`--${nome}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const C = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`
};

function banner() {
  console.log(C.cyan(`
╔══════════════════════════════════════════════════════════╗
║   🏭  FÁBRICA DE RENDA IA — Hub de Agentes Autônomos      ║
║   5 pilares de renda sem depender de contratação          ║
╚══════════════════════════════════════════════════════════╝`));
}

function listarNichos() {
  const { nichos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'nichos.json'), 'utf-8'));
  console.log(C.bold('\n🎯 NICHOS PRIORIZADOS (por potencial × concorrência):\n'));
  nichos.forEach((n, i) => {
    console.log(`  ${i + 1}. ${C.cyan(n.id)} — ${n.nome}`);
    console.log(`     Dor: ${n.dor}`);
    console.log(`     Tickets: ${Object.entries(n.ticketSugerido).map(([k, v]) => `${k}: ${v}`).join(' | ')}`);
    console.log(`     Concorrência: ${n.concorrencia} | Potencial: ${C.green(n.potencial)}\n`);
  });
}

function statusGeral() {
  console.log(C.bold('\n📊 STATUS DOS 5 PILARES:\n'));
  const pilares = [
    ['1', 'datasets', 'Venda de Datasets Limpos', '../data-sales-agent', 'Kaggle / Gumroad / venda direta'],
    ['2', 'ebooks', 'E-books e Guias Técnicos', 'agentes/ebooks.js', 'KDP / Hotmart / Gumroad'],
    ['3', 'prompts', 'Packs de Prompts', 'agentes/prompts.js', 'PromptBase / Etsy / site próprio'],
    ['4', 'api', 'API Sentimento PT-BR', 'api-sentimento/', 'RapidAPI (pay-per-call)'],
    ['5', 'microsaas', 'Gerador de Contratos', 'microsaas-contratos/', 'Stripe (assinatura mensal)']
  ];

  for (const [num, id, nome, caminho, onde] of pilares) {
    const existe = fs.existsSync(path.join(__dirname, caminho));
    console.log(`  ${existe ? C.green('✅') : '❌'} Pilar ${num} — ${C.bold(nome)}`);
    console.log(C.dim(`      Onde vender: ${onde}`));
    console.log(C.dim(`      Comando: node main.js --agente ${id}\n`));
  }

  console.log(C.bold('🚀 ORDEM RECOMENDADA DE ATAQUE (dinheiro mais rápido primeiro):'));
  console.log('  1️⃣  prompts  → pack em 1 dia, venda no PromptBase/Etsy sem aprovação');
  console.log('  2️⃣  ebooks   → guia em 2-3 dias (com sua revisão), Hotmart aprova rápido');
  console.log('  3️⃣  datasets → pipeline já pronto no data-sales-agent');
  console.log('  4️⃣  api      → deploy free no Render, lista no RapidAPI');
  console.log('  5️⃣  microsaas → o mais lento, mas é renda RECORRENTE\n');
}

function rodar(script, extraArgs = []) {
  const filho = spawn('node', [script, ...extraArgs], {
    stdio: 'inherit',
    cwd: path.dirname(script)
  });
  filho.on('close', (code) => process.exit(code ?? 0));
}

// === ROTEAMENTO ===
banner();

const agente = arg('agente');
const nicho = arg('nicho');
const mock = args.includes('--mock');

if (args.includes('--nichos')) {
  listarNichos();
  process.exit(0);
}

const status = await statusLLM();
console.log(`🧠 LLM detectado: ${C.green(status.provider)} (${status.modelo}) — custo: ${status.custo}`);

switch (agente) {
  case 'ebooks':
    rodar(path.join(__dirname, 'agentes', 'ebooks.js'), [...(nicho ? ['--nicho', nicho] : []), ...(mock ? ['--mock'] : [])]);
    break;
  case 'prompts':
    rodar(path.join(__dirname, 'agentes', 'prompts.js'), [...(nicho ? ['--nicho', nicho] : []), ...(mock ? ['--mock'] : [])]);
    break;
  case 'datasets': {
    const dsa = path.resolve(__dirname, '..', 'data-sales-agent', 'main.js');
    if (!fs.existsSync(dsa)) {
      console.log(C.yellow('⚠ Projeto data-sales-agent não encontrado em ../data-sales-agent'));
      process.exit(1);
    }
    rodar(dsa, args.filter(a => a !== '--agente' && a !== 'datasets'));
    break;
  }
  case 'api':
    rodar(path.join(__dirname, 'api-sentimento', 'server.js'), args.slice(args.indexOf('api') + 1));
    break;
  case 'microsaas':
    rodar(path.join(__dirname, 'microsaas-contratos', 'server.js'));
    break;
  default:
    statusGeral();
    console.log(C.dim('Use --nichos para ver os nichos priorizados. Exemplo:'));
    console.log(C.dim('  node main.js --agente ebooks --nicho ia-advocacia\n'));
}
