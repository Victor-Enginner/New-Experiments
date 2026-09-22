#!/usr/bin/env node

/**
 * 🌙 OVERNIGHT RUNNER — trabalha enquanto você dorme
 *
 * Lê workflow.json (o mapa), executa tasks pendentes com owner
 * 'opencode'/'auto' respeitando dependências, e persiste o status
 * no próprio workflow.json (o dashboard lê de lá).
 *
 * Uso:
 *   node overnight.js --once            → executa o que der agora e sai
 *   node overnight.js --daemon          → loop: releia o mapa a cada 60s
 *                                         (pega tasks que sixth/cline marcaram 'done'
 *                                          e continua o restante automaticamente)
 *   node overnight.js --once --mock     → sem LLM (templates, instantâneo)
 *   node overnight.js --export-owner sixth   → gera handoff-sixth.md
 *   node overnight.js --status          → resumo do progresso
 *
 * Segurança da noite:
 *   - 1 task com erro NÃO para as outras (marca 'error' e segue)
 *   - LLM falhou → template (a menos que llmObrigatorio=true → 'skipped')
 *   - Tudo logado em logs/overnight-AAAA-MM-DD.log
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarNoPool } from './lib/llm-pool.js';
import { HANDLERS } from './lib/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;                       // overnight/
const HUB = path.resolve(__dirname, '..');    // fabrica-renda-ia/
const MAPA = path.join(ROOT, 'workflow.json');

const args = process.argv.slice(2);
const MODO = {
  once: args.includes('--once'),
  daemon: args.includes('--daemon'),
  mock: args.includes('--mock'),
  status: args.includes('--status'),
  exportOwner: args.includes('--export-owner') ? args[args.indexOf('--export-owner') + 1] : null
};

// === LOG ===
const logFile = path.join(ROOT, 'logs', `overnight-${new Date().toISOString().slice(0, 10)}.log`);
function log(msg) {
  const linha = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
  console.log(linha);
  fs.appendFileSync(logFile, linha + '\n');
}

// === MAPA ===
function lerMapa() { return JSON.parse(fs.readFileSync(MAPA, 'utf-8')); }
function salvarMapa(m) { fs.writeFileSync(MAPA, JSON.stringify(m, null, 2)); }

function tasksExecutaveis(mapa) {
  return mapa.tasks.filter(t =>
    t.status === 'pending' &&
    ['opencode', 'auto'].includes(t.owner) &&
    (t.dependencias || []).every(dep => mapa.tasks.find(x => x.id === dep)?.status === 'done')
  );
}

function resumo(mapa) {
  const cont = {};
  mapa.tasks.forEach(t => cont[t.status] = (cont[t.status] || 0) + 1);
  return cont;
}

// === LLM com fallback ===
async function gerarTexto(prompt, opts = {}) {
  const { texto, provider, tentativas } = await gerarNoPool(prompt, opts);
  tentativas.forEach(t => log(`    🔌 ${t}`));
  if (!texto) return { texto: null, provider: null };
  return { texto, provider };
}

// === EXPORT HANDOFF (divisão de trabalho com outras IAs) ===
function exportarHandoff(owner) {
  const mapa = lerMapa();
  const tasks = mapa.tasks.filter(t => t.owner === owner && t.status === 'pending');
  if (tasks.length === 0) { console.log(`Nenhuma task pendente para owner "${owner}".`); return; }

  const md = `# 🤝 HANDOFF — Tasks para ${owner.toUpperCase()}
Gerado em: ${new Date().toLocaleString('pt-BR')}
Origem: Fábrica de Renda IA → overnight/workflow.json

## Como devolver o resultado
1. Execute cada task abaixo.
2. Salve o entregável no caminho indicado em \`params.saida\` (relativo a overnight/).
3. Edite \`overnight/workflow.json\`: mude o \`status\` da task de \`pending\` para \`done\` e preencha \`output\`.
4. Se o runner estiver em modo --daemon, ele detecta e destrava as tasks dependentes automaticamente.

---

${tasks.map(t => `## Task ${t.id} — ${t.titulo}
- **Tipo:** ${t.tipo} | **Fase:** ${t.fase}
- **Depende de:** ${(t.dependencias || []).join(', ') || 'nada'}
- **Parâmetros:**
\`\`\`json
${JSON.stringify(t.params, null, 2)}
\`\`\`
`).join('\n')}
`;
  const destino = path.join(ROOT, `handoff-${owner}.md`);
  fs.writeFileSync(destino, md);
  console.log(`✅ Handoff gerado: ${destino} (${tasks.length} task[s])`);
}

// === STATUS ===
if (MODO.status) {
  const mapa = lerMapa();
  console.log('\n📊 STATUS DO WORKFLOW\n');
  console.log('Resumo:', JSON.stringify(resumo(mapa)));
  for (const f of mapa.fases) {
    const ts = mapa.tasks.filter(t => t.fase === f.id);
    const icone = { pending: '⏳', running: '🔄', done: '✅', error: '❌', skipped: '⏭️' };
    console.log(`\n${f.id} — ${f.nome}`);
    ts.forEach(t => console.log(`  ${icone[t.status] || '❔'} [${t.id}] ${t.titulo} ${t.owner !== 'opencode' ? `(${t.owner})` : ''} ${t.output?.resumo ? '→ ' + t.output.resumo : ''}`));
  }
  process.exit(0);
}

// === EXPORT ===
if (MODO.exportOwner) {
  exportarHandoff(MODO.exportOwner);
  process.exit(0);
}

// === EXECUÇÃO DE UMA TASK ===
async function executarTask(task, mapa) {
  const handler = HANDLERS[task.tipo];
  if (!handler) {
    task.status = 'skipped';
    task.output = { resumo: `sem handler para tipo "${task.tipo}"` };
    log(`⏭️  [${task.id}] pulada: tipo "${task.tipo}" não é automatizável por mim`);
    return;
  }

  task.status = 'running';
  task.iniciadoEm = new Date().toISOString();
  salvarMapa(mapa);
  log(`🔄 [${task.id}] ${task.titulo}`);

  try {
    const ctx = { ROOT, HUB, mock: MODO.mock, log, gerarTexto };
    const resultado = await handler(task, ctx);
    task.status = 'done';
    task.output = { ...resultado, concluidoEm: new Date().toISOString(), mock: MODO.mock };
    log(`✅ [${task.id}] ${resultado.resumo}`);
  } catch (err) {
    task.status = 'error';
    task.output = { erro: err.message, concluidoEm: new Date().toISOString() };
    log(`❌ [${task.id}] ERRO: ${err.message} (seguindo para a próxima)`);
  }
  salvarMapa(mapa);
}

// === LOOP PRINCIPAL ===
async function ciclo() {
  let feitas = 0;
  // Recalcula após CADA task: uma task concluída pode destravar a próxima (cadeia de dependências)
  while (true) {
    const mapa = lerMapa();
    const prontas = tasksExecutaveis(mapa);
    if (prontas.length === 0) break;
    await executarTask(prontas[0], mapa);
    feitas++;
  }
  return feitas;
}

log(`\n🌙 OVERNIGHT RUNNER iniciado — modo: ${MODO.daemon ? 'DAEMON (loop 60s)' : 'ONCE'}${MODO.mock ? ' + MOCK (sem LLM)' : ''}`);

if (MODO.daemon) {
  log('🤝 Colaboração ativa: sixth/cline/humano podem editar workflow.json; eu continuo o resto.');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const feitas = await ciclo();
    const mapa = lerMapa();
    const pendentesMinhas = mapa.tasks.filter(t => t.status === 'pending' && ['opencode', 'auto'].includes(t.owner));
    const pendentesOutros = mapa.tasks.filter(t => t.status === 'pending' && !['opencode', 'auto'].includes(t.owner));

    if (pendentesMinhas.length === 0 && pendentesOutros.length === 0) {
      log('🎉 WORKFLOW 100% CONCLUÍDO. Bom dia! ☀️');
      break;
    }
    if (feitas === 0) {
      log(`💤 Aguardando: ${pendentesMinhas.length} minha(s) bloqueada(s), ${pendentesOutros.length} de outros owners. Novo ciclo em 60s...`);
      await new Promise(r => setTimeout(r, 60000));
    }
  }
} else {
  const feitas = await ciclo();
  const mapa = lerMapa();
  console.log('\n📊 Resumo final:', JSON.stringify(resumo(mapa)));
  if (feitas === 0) console.log('💤 Nada executável agora (dependências pendentes ou tasks de outros owners).');
  console.log(`📄 Log: ${logFile}\n`);
}
