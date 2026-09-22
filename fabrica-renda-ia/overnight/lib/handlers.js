/**
 * ⚙️ HANDLERS — executores de cada tipo de task do workflow
 *
 * Cada handler recebe (task, ctx) e devolve { resumo, arquivos } ou lança erro.
 * ctx = { ROOT, mock, log, gerarTexto }  — gerarTexto já resolve pool→fallback.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { renderLanding3D } from '../templates/landing-3d.js';

/** Executa um script Node como subprocesso (reutiliza agentes existentes) */
function rodarScript(scriptPath, args, log) {
  return new Promise((resolve, reject) => {
    const filho = spawn('node', [scriptPath, ...args], { cwd: path.dirname(scriptPath) });
    let saida = '';
    filho.stdout.on('data', d => { saida += d; });
    filho.stderr.on('data', d => { saida += d; });
    filho.on('close', code => {
      log(`    ${code === 0 ? '✔' : '✖'} subprocesso ${path.basename(scriptPath)} exit=${code}`);
      if (code === 0) {
        resolve(saida);
      } else {
        reject(new Error(`exit ${code}: ${saida.slice(-400)}`));
      }
    });
    filho.on('error', reject);
  });
}

// ============ HANDLERS ============

/** F1 — Gera o brief de copy (headline, dor, benefícios) que alimenta as landings */
async function copywriting(task, ctx) {
  const { nicho, produto, preco, saida } = task.params;
  const nichos = JSON.parse(fs.readFileSync(path.join(ctx.HUB, 'config', 'nichos.json'), 'utf-8')).nichos;
  const n = nichos.find(x => x.id === nicho) || { nome: nicho, dor: 'problema do nicho', publico: 'profissionais' };

  const template = () => ({
    produto,
    headline: `${n.nome}: *resultados em dias*, não meses`,
    dor: `${n.dor}. Este produto entrega o atalho prático, validado por especialista certificado em IA.`,
    beneficios: [
      'Aplicável hoje, sem código',
      'Fluxos prontos para copiar e colar',
      'Ética e LGPD embutidas',
      'Checklists de validação humana',
      'Ferramentas gratuitas primeiro',
      'Suporte a modelos locais e cloud'
    ],
    preco,
    linkPagamento: 'https://gumroad.com/l/CONFIGURE-SEU-LINK',
    autoridade: 'Criado por profissional com 4 certificações em IA',
    provas: [
      { numero: 10, sufixo: '', rotulo: 'fluxos prontos' },
      { numero: 30, sufixo: 'min', rotulo: 'para aplicar o 1º' },
      { numero: 100, sufixo: '%', rotulo: 'verificável' }
    ]
  });

  let brief;
  if (ctx.mock) {
    brief = template();
  } else {
    const prompt = `Crie a copy de uma landing page de vendas em PT-BR para o produto "${produto}" (${n.nome}, público: ${n.publico}, dor: ${n.dor}, preço: ${preco}).
Responda APENAS com JSON válido no formato:
{"headline":"... (use *asteriscos* na palavra-chave de impacto)","dor":"...","beneficios":["6 itens curtos"],"provas":[{"numero":10,"sufixo":"","rotulo":"..."}]}
Sem markdown, sem explicações — só o JSON.`;
    const { texto, provider } = await ctx.gerarTexto(prompt, { maxTokens: 700 });
    if (texto) {
      try {
        const json = JSON.parse(texto.replace(/```json|```/g, '').trim());
        brief = { ...template(), ...json };
        ctx.log(`    🧠 copy gerada por ${provider}`);
      } catch {
        ctx.log('    ⚠ LLM não retornou JSON válido — usando template');
        brief = template();
      }
    } else {
      brief = template();
    }
  }

  const destino = path.join(ctx.ROOT, saida);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(brief, null, 2));
  return { resumo: `brief de copy salvo (${brief.headline.substring(0, 50)}...)`, arquivos: [saida] };
}

/** F3 — Compõe a landing 3D a partir do brief */
async function gerarLanding3D(task, ctx) {
  const { briefDe, background, saida } = task.params;
  const briefPath = path.join(ctx.ROOT, briefDe);
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));
  brief.background = background;

  const html = renderLanding3D(brief);
  const destino = path.join(ctx.ROOT, saida);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
  return { resumo: `landing 3D gerada (${(html.length / 1024).toFixed(1)} KB, bg: ${background})`, arquivos: [saida] };
}

/** F2 — Delega ao agente de packs de prompts */
async function gerarPackPrompts(task, ctx) {
  const script = path.join(ctx.HUB, 'agentes', 'prompts.js');
  const args = ['--nicho', task.params.nicho];
  if (ctx.mock) args.push('--mock');
  await rodarScript(script, args, ctx.log);
  return { resumo: `pack de prompts gerado (nicho: ${task.params.nicho})`, arquivos: [`../produtos/prompts-${task.params.nicho}/`] };
}

/** F2 — Delega ao agente de e-books */
async function gerarEbook(task, ctx) {
  const script = path.join(ctx.HUB, 'agentes', 'ebooks.js');
  const args = ['--nicho', task.params.nicho];
  if (ctx.mock) args.push('--mock');
  await rodarScript(script, args, ctx.log);
  return { resumo: `e-book gerado (nicho: ${task.params.nicho})`, arquivos: [`../produtos/ebook-${task.params.nicho}/`] };
}

/** F2 — Delega ao data-sales-agent (Pilar 1) */
async function gerarDataset(task, ctx) {
  const script = path.resolve(ctx.HUB, '..', 'data-sales-agent', 'main.js');
  if (!fs.existsSync(script)) throw new Error('data-sales-agent não encontrado em ../data-sales-agent');
  await rodarScript(script, [], ctx.log);
  return { resumo: 'pipeline de dataset executado', arquivos: ['../../data-sales-agent/output/'] };
}

export const HANDLERS = {
  'copywriting': copywriting,
  'gerar-landing-3d': gerarLanding3D,
  'gerar-pack-prompts': gerarPackPrompts,
  'gerar-ebook': gerarEbook,
  'gerar-dataset': gerarDataset
};
