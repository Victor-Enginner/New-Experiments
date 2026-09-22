/**
 * 📚 PILAR 2 — Agente Gerador de E-books e Guias Técnicos de Nicho
 *
 * Gera um guia técnico completo e pronto para vender:
 *   - ebook.md       → fonte editável (você faz a revisão técnica — seu diferencial!)
 *   - ebook.html     → versão print-ready (abra no navegador → Ctrl+P → Salvar PDF)
 *   - pagina-venda.html → landing page de vendas com link de pagamento
 *   - metadata.json  → título, descrição e keywords prontos p/ KDP/Hotmart
 *
 * O LLM local (Ollama/gemma2) escreve os capítulos. Se estiver offline,
 * gera a estrutura completa com templates para você preencher/revisar.
 *
 * Uso:
 *   node agentes/ebooks.js --nicho ia-advocacia
 *   node agentes/ebooks.js --nicho ia-contabilidade --mock
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarComFallback, statusLLM } from '../lib/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// === ARGUMENTOS ===
const args = process.argv.slice(2);
function arg(nome, padrao = null) {
  const i = args.indexOf(`--${nome}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : padrao;
}
const NICHO_ID = arg('nicho', 'ia-advocacia');
const MODO_MOCK = args.includes('--mock');

// === CARREGA NICHO ===
const nichos = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'nichos.json'), 'utf-8')).nichos;
const nicho = nichos.find(n => n.id === NICHO_ID) || nichos[0];
const SAIDA = path.join(ROOT, 'produtos', `ebook-${nicho.id}`);
fs.mkdirSync(SAIDA, { recursive: true });

console.log(`\n📚 AGENTE E-BOOK — Nicho: ${nicho.nome}`);
const status = await statusLLM();
console.log(`🧠 LLM: ${status.provider} (${status.modelo}) — ${MODO_MOCK ? 'MODO MOCK ativado' : 'geração real'}\n`);

// === ESTRUTURA DO GUIA ===
function estruturaCapitulos(n) {
  return [
    { titulo: `Por que ${n.nome} é inevitável (e por que começar agora)`, foco: 'contexto de mercado, custo de não adotar, quebra de objeções' },
    { titulo: 'Os fundamentos mínimos que você precisa (sem jargão)', foco: 'LLMs, prompts, RAG e automação explicados para não-técnicos' },
    { titulo: '5 fluxos de trabalho prontos para aplicar hoje', foco: `fluxos passo a passo resolvendo: ${n.dor}` },
    { titulo: 'Ferramentas: stack gratuito vs. stack profissional', foco: 'comparativo de ferramentas com custo-benefício e quando migrar' },
    { titulo: 'Ética, LGPD e limites: o que NUNCA automatizar', foco: 'riscos, compliance, responsabilidade profissional' },
    { titulo: 'Casos reais e números: antes e depois da adoção', foco: 'estudos de caso com métricas de tempo economizado' },
    { titulo: 'Plano de implementação em 30 dias', foco: 'cronograma semana a semana com checkpoints mensuráveis' }
  ];
}

// === TEMPLATE (fallback / modo mock) ===
function templateCapitulo(cap, n, numero) {
  return `## Capítulo ${numero}: ${cap.titulo}

> **Objetivo deste capítulo:** ${cap.foco}.

### O problema na prática

${n.dor.charAt(0).toUpperCase() + n.dor.slice(1)}. Este capítulo mostra como resolver isso com IA de forma prática, começando com ferramentas gratuitas.

### Passo a passo

1. **Mapeie a tarefa repetitiva** — liste tudo que você faz mais de 3 vezes por semana.
2. **Escolha a ferramenta** — comece pelo gratuito (ChatGPT/Claude/Ollama local).
3. **Crie o prompt base** — use o template: contexto + tarefa + formato de saída + exemplo.
4. **Valide a saída** — nunca publique ou envie ao cliente sem revisão humana.
5. **Documente e repita** — transforme o que funcionou em processo fixo.

### Erros comuns a evitar

- Confiar cegamente na saída do modelo (alucinação é real).
- Automatizar antes de entender o processo manual.
- Ignorar LGPD: nunca insira dados pessoais de clientes em ferramentas cloud sem base legal.

### Checklist do capítulo

- [ ] Identifiquei minha tarefa mais repetitiva
- [ ] Testei o fluxo com 1 caso real
- [ ] Validei o resultado manualmente
- [ ] Documentei o prompt que funcionou

> ⚠️ **NOTA DO AUTOR (modo template):** expanda este capítulo com sua experiência prática e casos reais do seu nicho. Sua revisão técnica é o que diferencia este guia de conteúdo genérico de IA.
`;
}

// === GERAÇÃO DOS CAPÍTULOS ===
const capitulos = estruturaCapitulos(nicho);
let corpo = '';
const fontes = [];

for (let i = 0; i < capitulos.length; i++) {
  const cap = capitulos[i];
  process.stdout.write(`  ✍️  Capítulo ${i + 1}/${capitulos.length}: ${cap.titulo.substring(0, 55)}... `);

  const prompt = `Você é um especialista certificado em IA escrevendo um guia técnico prático em português do Brasil.
Nicho: ${nicho.nome}. Público: ${nicho.publico}. Dor principal: ${nicho.dor}.
Escreva o capítulo "${cap.titulo}" cobrindo: ${cap.foco}.
Requisitos: tom prático e direto, exemplos concretos com ferramentas reais (ChatGPT, Claude, Ollama, Make/n8n),
passo a passo numerado, um erro comum a evitar, e um checklist final. Formato Markdown. Mínimo 400 palavras.
Não invente estatísticas sem fonte; prefira orientações práticas verificáveis.`;

  const { texto, fonte } = MODO_MOCK
    ? { texto: templateCapitulo(cap, nicho, i + 1), fonte: 'mock' }
    : await gerarComFallback(prompt, () => templateCapitulo(cap, nicho, i + 1), { maxTokens: 1800 });

  fontes.push(fonte);
  console.log(fonte === 'llm' ? '✅ (IA)' : fonte === 'mock' ? '📝 (mock)' : '📝 (template)');
  corpo += (fonte === 'llm' ? `## Capítulo ${i + 1}: ${cap.titulo}\n\n${texto.replace(/^#+.*\n/, '')}` : texto) + '\n\n---\n\n';
}

// === MONTA O E-BOOK MARKDOWN ===
const hoje = new Date().toLocaleDateString('pt-BR');
const titulo = `Guia Prático de ${nicho.nome}`;
const ebookMd = `# ${titulo}

**Da teoria à prática em 30 dias — mesmo sem saber programar**

*Público-alvo: ${nicho.publico}*
*Gerado em: ${hoje} | Revisão técnica: autor certificado em IA*

---

## Sobre este guia

Este guia resolve um problema específico: **${nicho.dor}**.

Você não vai encontrar teoria abstrata aqui. Cada capítulo termina com um checklist
acionável. Ao final de 30 dias, você terá pelo menos 3 processos rodando com IA.

${corpo}## Próximos passos

1. Escolha UM capítulo e execute o checklist hoje
2. Compartilhe seu resultado e peça feedback
3. Revise este guia mensalmente — as ferramentas evoluem rápido

---

*© ${new Date().getFullYear()} — Todos os direitos reservados.*
`;

fs.writeFileSync(path.join(SAIDA, 'ebook.md'), ebookMd);

// === VERSÃO HTML PRINT-READY ===
function mdParaHtml(md) {
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^- \[ \] (.*$)/gm, '<li class="check">☐ $1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li><strong>$1.</strong> $2</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, ' ');
}

const ebookHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: Georgia, serif; max-width: 21cm; margin: 0 auto; padding: 40px; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 2.2em; color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
  h2 { font-size: 1.5em; color: #1e40af; margin-top: 45px; page-break-after: avoid; }
  h3 { font-size: 1.15em; color: #334155; page-break-after: avoid; }
  blockquote { border-left: 4px solid #2563eb; margin: 20px 0; padding: 10px 20px; background: #eff6ff; font-style: italic; }
  li.check { list-style: none; margin-left: -20px; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 40px 0; }
  .capa { text-align: center; padding: 120px 0; page-break-after: always; }
  .capa h1 { border: none; font-size: 2.8em; }
  .capa .sub { font-size: 1.3em; color: #475569; margin: 30px 0; }
  .aviso { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; font-size: 0.9em; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="aviso no-print">
  💡 <strong>Para gerar o PDF:</strong> Ctrl+P → Destino: "Salvar como PDF" → Margens: Padrão → Salvar como <code>ebook.pdf</code>
</div>
<div class="capa">
  <h1>${titulo}</h1>
  <p class="sub">Da teoria à prática em 30 dias — mesmo sem saber programar</p>
  <p><strong>${nicho.publico}</strong></p>
  <p>${hoje}</p>
</div>
<p>${mdParaHtml(corpo)}</p>
</body>
</html>`;

fs.writeFileSync(path.join(SAIDA, 'ebook.html'), ebookHtml);

// === PÁGINA DE VENDA ===
const paginaVenda = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo} — Baixe Agora</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
  .hero { max-width: 720px; margin: 0 auto; padding: 80px 24px; text-align: center; }
  .badge { background: #1e40af; color: #bfdbfe; padding: 6px 16px; border-radius: 999px; font-size: 0.85em; }
  h1 { font-size: 2.6em; margin: 24px 0 16px; line-height: 1.2; }
  .dor { font-size: 1.2em; color: #94a3b8; margin-bottom: 32px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; margin: 32px 0; }
  .preco { font-size: 3em; color: #4ade80; font-weight: bold; }
  .preco s { font-size: 0.45em; color: #64748b; }
  .btn { display: inline-block; background: #22c55e; color: #052e16; font-weight: bold; font-size: 1.2em; padding: 18px 48px; border-radius: 12px; text-decoration: none; margin-top: 24px; }
  .btn:hover { background: #4ade80; }
  ul { text-align: left; margin: 24px auto; max-width: 480px; line-height: 2; }
  ul li::marker { content: '✅ '; }
  .garantia { color: #94a3b8; font-size: 0.9em; margin-top: 24px; }
</style>
</head>
<body>
<div class="hero">
  <span class="badge">GUIA TÉCNICO · EDIÇÃO ${new Date().getFullYear()}</span>
  <h1>${titulo}</h1>
  <p class="dor">${nicho.dor}. Este guia resolve — em 30 dias, com ferramentas que você já pode usar hoje.</p>
  <div class="card">
    <ul>
      <li>5 fluxos de trabalho prontos para copiar e colar</li>
      <li>Stack gratuito vs. profissional: quando migrar</li>
      <li>Ética e LGPD: o que nunca automatizar</li>
      <li>Plano de implementação dia a dia (30 dias)</li>
      <li>Checklists acionáveis em todos os capítulos</li>
    </ul>
    <p class="preco">${nicho.ticketSugerido.ebook} <s>R$ 97,00</s></p>
    <!-- ⚠️ SUBSTITUA pelo seu link real do Hotmart/KDP/Gumroad -->
    <a class="btn" href="https://pay.hotmart.com/SEU-LINK-AQUI">QUERO MEU GUIA →</a>
    <p class="garantia">🛡️ Garantia incondicional de 7 dias · Acesso imediato · PDF + atualizações</p>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(SAIDA, 'pagina-venda.html'), paginaVenda);

// === METADATA PARA PLATAFORMAS ===
const metadata = {
  titulo,
  subtitulo: 'Da teoria à prática em 30 dias — mesmo sem saber programar',
  descricaoKDP: `${titulo}: guia prático para ${nicho.publico}. Resolva: ${nicho.dor}. Inclui 5 fluxos prontos, comparativo de ferramentas, ética/LGPD e plano de 30 dias com checklists.`,
  keywords: nicho.keywords,
  precoSugerido: nicho.ticketSugerido.ebook,
  plataformas: {
    hotmart: 'Suba o ebook.pdf + pagina-venda.html como página de vendas',
    amazonKDP: 'Converta ebook.md para .docx (pandoc) ou suba o PDF; use keywords acima',
    gumroad: 'Produto digital → upload ebook.pdf → cole descricaoKDP'
  },
  geradoEm: new Date().toISOString(),
  capitulos: capitulos.map((c, i) => ({ numero: i + 1, titulo: c.titulo, fonte: fontes[i] })),
  proximaAcao: '⚠️ REVISÃO HUMANA OBRIGATÓRIA: leia cada capítulo, adicione sua experiência real e corrija imprecisões antes de publicar. Seus 4 certificados = sua autoridade. Use-os na bio.'
};
fs.writeFileSync(path.join(SAIDA, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log(`\n✅ E-BOOK GERADO em: ${SAIDA}`);
console.log('   📄 ebook.md         → fonte para sua revisão técnica');
console.log('   📄 ebook.html       → abra e Ctrl+P para gerar o PDF de venda');
console.log('   📄 pagina-venda.html → landing page (configure seu link de pagamento)');
console.log('   📄 metadata.json    → textos prontos para KDP/Hotmart/Gumroad');
console.log('\n⚠️  PRÓXIMO PASSO: revise o conteúdo com sua expertise (é isso que vale o preço).\n');
