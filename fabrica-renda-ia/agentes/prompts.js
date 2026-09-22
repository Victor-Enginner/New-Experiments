/**
 * 🎯 PILAR 3 — Agente Gerador de Packs de Prompts Profissionais
 *
 * Gera um pack completo e pronto para vender no PromptBase, Etsy (PDF digital)
 * ou site próprio:
 *   - pack-prompts.json      → prompts estruturados (fonte de verdade)
 *   - pack-prompts.pdf.html  → versão PDF print-ready (Etsy/Gumroad)
 *   - listing-promptbase.md  → anúncios individuais prontos p/ colar no PromptBase
 *   - pagina-venda.html      → landing page do pack
 *
 * DIFERENCIAL: cada prompt segue engenharia de prompt real (contexto + papel +
 * tarefa + formato + restrições + exemplo), não "frases mágicas" genéricas.
 *
 * Uso:
 *   node agentes/prompts.js --nicho ia-advocacia
 *   node agentes/prompts.js --nicho ia-ecommerce --mock
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarComFallback, statusLLM } from '../lib/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
function arg(nome, padrao = null) {
  const i = args.indexOf(`--${nome}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : padrao;
}
const NICHO_ID = arg('nicho', 'ia-advocacia');
const MODO_MOCK = args.includes('--mock');

const nichos = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'nichos.json'), 'utf-8')).nichos;
const nicho = nichos.find(n => n.id === NICHO_ID) || nichos[0];
const SAIDA = path.join(ROOT, 'produtos', `prompts-${nicho.id}`);
fs.mkdirSync(SAIDA, { recursive: true });

console.log(`\n🎯 AGENTE PROMPTS — Nicho: ${nicho.nome}`);
const status = await statusLLM();
console.log(`🧠 LLM: ${status.provider} (${status.modelo}) — ${MODO_MOCK ? 'MODO MOCK' : 'geração real'}\n`);

// === FLUXOS DE TRABALHO DO PACK (10 prompts por pack) ===
function fluxosDoNicho(n) {
  const fluxos = {
    'ia-advocacia': [
      ['Resumo de Petição', 'resumir petições longas mantendo teses e pedidos'],
      ['Pesquisa de Jurisprudência', 'estruturar busca e análise de precedentes'],
      ['Análise de Contrato', 'identificar cláusulas de risco e abusivas'],
      ['Resposta a Cliente', 'traduzir juridiquês para linguagem clara'],
      ['Petição Inicial (esqueleto)', 'gerar estrutura inicial para revisão humana'],
      ['Due Diligence', 'checklist automatizado de análise documental'],
      ['Parecer Preliminar', 'estruturar raciocínio jurídico preliminar'],
      ['E-mail de Negociação', 'conduzir negociação de acordo por escrito'],
      ['Ata de Reunião', 'transformar anotações em ata formal'],
      ['Compliance LGPD', 'auditar documentos quanto a dados pessoais']
    ],
    'ia-contabilidade': [
      ['Classificação de Despesas', 'categorizar lançamentos por conta contábil'],
      ['Relatório Mensal ao Cliente', 'traduzir números em insights acionáveis'],
      ['Conciliação Assistida', 'encontrar divergências entre extratos'],
      ['E-mail de Cobrança', 'cobrar documentos do cliente sem atrito'],
      ['Análise de DRE', 'explicar variações e anomalias do DRE'],
      ['Onboarding de Cliente', 'checklist de documentos por regime tributário'],
      ['Dúvidas Fiscais', 'responder perguntas frequentes com ressalvas legais'],
      ['Fluxo de Caixa', 'projetar cenários a partir de histórico'],
      ['Revisão de Notas Fiscais', 'validar dados de NF-e antes do fechamento'],
      ['Planejamento Tributário', 'comparar regimes com dados do cliente']
    ],
    default: [
      ['Tarefa Principal do Nicho', 'resolver a dor central do público'],
      ['Comunicação com Cliente', 'responder clientes com clareza e rapidez'],
      ['Documento Recorrente', 'gerar o documento que mais consome tempo'],
      ['Análise de Dados', 'extrair insights de dados do dia a dia'],
      ['E-mail Difícil', 'escrever e-mails sensíveis com tom adequado'],
      ['Relatório Periódico', 'automatizar relatórios semanais/mensais'],
      ['Onboarding', 'padronizar recepção de novos clientes'],
      ['Resumo Técnico', 'resumir documentos longos do setor'],
      ['Planejamento', 'criar planos de ação a partir de objetivos'],
      ['Revisão de Qualidade', 'auditar o próprio trabalho antes de entregar']
    ]
  };
  return fluxos[n.id] || fluxos.default;
}

// === TEMPLATE DE PROMPT (engenharia de prompt real) ===
function templatePrompt(nomeFluxo, objetivo, n) {
  return {
    nome: nomeFluxo,
    categoria: n.nome,
    prompt: `# PAPEL
Você é um assistente especializado em ${n.nome}, com profundo conhecimento das práticas, terminologia e regulamentações do setor no Brasil.

# CONTEXTO
${n.publico} enfrentam o seguinte problema: ${n.dor}.
Vou te fornecer [INSIRA AQUI OS DADOS/DOCUMENTO] e você deve ${objetivo}.

# TAREFA
1. Leia atentamente todo o material fornecido.
2. ${objetivo.charAt(0).toUpperCase() + objetivo.slice(1)}, seguindo as práticas recomendadas do setor.
3. Identifique pontos que exigem atenção ou revisão humana obrigatória.

# FORMATO DE SAÍDA
- Resumo executivo (máx. 5 linhas)
- Análise detalhada (estruturada em tópicos)
- ⚠️ Alertas: o que precisa de validação humana
- Próximos passos sugeridos

# RESTRIÇÕES
- NUNCA invente dados, leis, valores ou referências. Se não souber, diga explicitamente.
- NÃO processe dados pessoais identificáveis além do necessário (LGPD).
- Sempre indique o nível de confiança da sua análise (alto/médio/baixo).

# EXEMPLO DE USO
[Cole aqui um exemplo real — substitua pelos seus dados]`,
    dicas: [
      'Substitua [INSIRA AQUI OS DADOS/DOCUMENTO] pelo seu material real',
      'Para documentos grandes, divida em partes e processe em sequência',
      'Sempre revise a saída antes de enviar ao cliente — IA erra'
    ],
    modelosCompativeis: ['ChatGPT (GPT-4+)', 'Claude', 'Gemini', 'Ollama local (gemma2/llama3)'],
    variaveis: ['[INSIRA AQUI OS DADOS/DOCUMENTO]']
  };
}

// === GERA OS PROMPTS ===
const fluxos = fluxosDoNicho(nicho);
const pack = [];

for (let i = 0; i < fluxos.length; i++) {
  const [nomeFluxo, objetivo] = fluxos[i];
  process.stdout.write(`  ✍️  Prompt ${i + 1}/${fluxos.length}: ${nomeFluxo}... `);

  const fallback = () => JSON.stringify(templatePrompt(nomeFluxo, objetivo, nicho).prompt);
  const promptLLM = `Crie um prompt profissional de engenharia de prompt, em português do Brasil, para: "${nomeFluxo}" — objetivo: ${objetivo}.
Público: ${nicho.publico}. O prompt deve ter as seções: # PAPEL, # CONTEXTO, # TAREFA, # FORMATO DE SAÍDA, # RESTRIÇÕES (incluindo nunca inventar dados e LGPD), # EXEMPLO DE USO.
Retorne APENAS o texto do prompt, pronto para copiar e colar.`;

  const { texto, fonte } = MODO_MOCK
    ? { texto: fallback(), fonte: 'mock' }
    : await gerarComFallback(promptLLM, fallback, { maxTokens: 1200 });

  const item = templatePrompt(nomeFluxo, objetivo, nicho);
  if (fonte === 'llm') item.prompt = texto;
  item.fonte = fonte;
  pack.push(item);
  console.log(fonte === 'llm' ? '✅ (IA)' : fonte === 'mock' ? '📝 (mock)' : '📝 (template)');
}

// === 1. JSON ESTRUTURADO ===
fs.writeFileSync(path.join(SAIDA, 'pack-prompts.json'), JSON.stringify({
  nome: `Pack ${nicho.nome}: ${pack.length} Prompts Profissionais`,
  versao: '1.0.0',
  publico: nicho.publico,
  prompts: pack
}, null, 2));

// === 2. VERSÃO PDF (HTML print-ready p/ Etsy/Gumroad) ===
const secoes = pack.map((p, i) => `
<div class="prompt-card">
  <h2>${String(i + 1).padStart(2, '0')} · ${p.nome}</h2>
  <pre>${p.prompt.replace(/</g, '&lt;')}</pre>
  <div class="dicas"><strong>💡 Dicas:</strong><ul>${p.dicas.map(d => `<li>${d}</li>`).join('')}</ul></div>
  <p class="modelos"><strong>Compatível com:</strong> ${p.modelosCompativeis.join(' · ')}</p>
</div>`).join('\n');

const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pack ${nicho.nome} — ${pack.length} Prompts Profissionais</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', sans-serif; max-width: 19cm; margin: 0 auto; padding: 30px; color: #1e293b; }
  .capa { text-align: center; padding: 100px 20px; page-break-after: always; }
  .capa h1 { font-size: 2.4em; color: #0f172a; }
  .capa p { font-size: 1.2em; color: #64748b; }
  .prompt-card { page-break-inside: avoid; margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; }
  h2 { color: #1e40af; font-size: 1.2em; }
  pre { background: #0f172a; color: #a5f3fc; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 0.82em; line-height: 1.5; }
  .dicas { background: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; margin-top: 14px; }
  .modelos { color: #64748b; font-size: 0.85em; }
  .no-print { background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<p class="no-print">💡 Ctrl+P → "Salvar como PDF" → venda o arquivo resultante no Etsy/Gumroad.</p>
<div class="capa">
  <h1>Pack ${nicho.nome}</h1>
  <p>${pack.length} Prompts Profissionais de Engenharia de Prompt</p>
  <p><strong>${nicho.publico}</strong></p>
  <p style="margin-top:60px; color:#94a3b8;">Copie → Cole → Adapte → Revise → Entregue</p>
</div>
${secoes}
</body>
</html>`;

fs.writeFileSync(path.join(SAIDA, 'pack-prompts.pdf.html'), pdfHtml);

// === 3. LISTINGS PRONTOS PARA PROMPTBASE ===
const listings = pack.map((p, i) => `## Prompt ${i + 1}: ${p.nome}

**Título do anúncio:** ${p.nome} — Prompt Profissional para ${nicho.nome}

**Descrição:**
${p.prompt.split('\n').slice(0, 6).join(' ')}

Prompt de engenharia profissional com papel, contexto, formato de saída e restrições de segurança.
Inclui dicas de uso e variações. Compatível com: ${p.modelosCompativeis.join(', ')}.

**Preço sugerido no PromptBase:** US$ 2,99 – 4,99
**Categoria:** ${nicho.nome}
`).join('\n---\n\n');

fs.writeFileSync(path.join(SAIDA, 'listing-promptbase.md'), `# Anúncios prontos para PromptBase\n\n${listings}`);

// === 4. PÁGINA DE VENDA ===
const pagina = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pack ${nicho.nome} — ${pack.length} Prompts</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #fafaf9; color: #1c1917; margin: 0; }
  .hero { max-width: 700px; margin: 0 auto; padding: 70px 24px; text-align: center; }
  h1 { font-size: 2.3em; } .sub { color: #57534e; font-size: 1.15em; }
  .demo { text-align: left; background: #0f172a; color: #a5f3fc; border-radius: 12px; padding: 24px; font-size: 0.8em; white-space: pre-wrap; margin: 30px 0; max-height: 260px; overflow: hidden; position: relative; }
  .demo::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 80px; background: linear-gradient(transparent, #0f172a); }
  .preco { font-size: 2.8em; color: #16a34a; font-weight: bold; }
  .btn { display: inline-block; background: #16a34a; color: #fff; font-weight: bold; font-size: 1.15em; padding: 16px 44px; border-radius: 10px; text-decoration: none; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: left; margin: 24px 0; }
  .grid div { background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 12px; font-size: 0.9em; }
</style>
</head>
<body>
<div class="hero">
  <h1>Pack ${nicho.nome}</h1>
  <p class="sub">${pack.length} prompts de engenharia profissional que resolvem: <em>${nicho.dor.toLowerCase()}</em></p>
  <div class="demo">${pack[0].prompt.substring(0, 700).replace(/</g, '&lt;')}...</div>
  <div class="grid">${pack.map(p => `<div>✅ ${p.nome}</div>`).join('')}</div>
  <p class="preco">${nicho.ticketSugerido.packPrompts}</p>
  <!-- ⚠️ SUBSTITUA pelo seu link real (Gumroad/Hotmart/Etsy) -->
  <a class="btn" href="https://gumroad.com/l/SEU-LINK-AQUI">COMPRAR PACK COMPLETO →</a>
  <p style="color:#78716c; margin-top:16px;">Entrega imediata em PDF · Funciona em ChatGPT, Claude, Gemini e modelos locais</p>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(SAIDA, 'pagina-venda.html'), pagina);

console.log(`\n✅ PACK GERADO em: ${SAIDA}`);
console.log('   📄 pack-prompts.json     → fonte estruturada (versionável)');
console.log('   📄 pack-prompts.pdf.html → Ctrl+P gera o PDF vendável (Etsy/Gumroad)');
console.log('   📄 listing-promptbase.md → anúncios prontos p/ colar no PromptBase');
console.log('   📄 pagina-venda.html     → landing page do pack');
console.log('\n⚠️  PRÓXIMO PASSO: teste CADA prompt num caso real e refine. Prompt testado vende; prompt genérico gera reembolso.\n');
