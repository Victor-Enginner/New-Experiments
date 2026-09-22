/**
 * 💎 ENRIQUECEDOR DE PROMPTS — preenche exemplos de uso via LLM local
 *
 * Lê o pack (templates validados) e adiciona a cada prompt um
 * `exemploPreenchido` realista gerado pelo gemma2 (quente na RAM).
 * O humano então só REVISA em vez de criar do zero.
 *
 * Segurança:
 *   - Backup do original em pack-prompts.backup.json (1ª execução)
 *   - Salvamento progressivo a cada prompt (queda não perde trabalho)
 *
 * Uso:
 *   node agentes/enriquecer-prompts.js --nicho ia-advocacia
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerar, statusLLM } from '../lib/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const iNicho = args.indexOf('--nicho');
const NICHO = iNicho !== -1 ? args[iNicho + 1] : 'ia-advocacia';

const PACK_PATH = path.join(ROOT, 'produtos', `prompts-${NICHO}`, 'pack-prompts.json');
const BACKUP_PATH = path.join(ROOT, 'produtos', `prompts-${NICHO}`, 'pack-prompts.backup.json');

if (!fs.existsSync(PACK_PATH)) {
  console.error(`❌ Pack não encontrado: ${PACK_PATH}`);
  console.error('   Gere primeiro: node agentes/prompts.js --nicho ' + NICHO);
  process.exit(1);
}

// Backup único (não sobrescreve um backup existente)
if (!fs.existsSync(BACKUP_PATH)) {
  fs.copyFileSync(PACK_PATH, BACKUP_PATH);
  console.log(`📦 Backup criado: ${BACKUP_PATH}`);
}

const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf-8'));
const status = await statusLLM();
console.log(`\n💎 ENRIQUECEDOR — ${pack.prompts.length} prompts | LLM: ${status.provider} (${status.modelo})\n`);

if (status.provider === 'template') {
  console.error('❌ Nenhum LLM disponível. Suba o Ollama: systemctl start ollama');
  process.exit(1);
}

let feitos = 0;
for (const p of pack.prompts) {
  if (p.exemploPreenchido && p.exemploPreenchido.length > 100) {
    console.log(`⏭️  ${p.nome} — já tem exemplo, pulando`);
    feitos++;
    continue;
  }

  process.stdout.write(`✍️  ${p.nome}... `);
  const inicio = Date.now();

  const prompt = `Você está documentando um pack de prompts profissionais de ${p.categoria} para o mercado brasileiro.

Dado o prompt profissional abaixo, crie um EXEMPLO DE USO preenchido e realista em português do Brasil:

1. Na seção "ENTRADA", substitua o placeholder [INSIRA AQUI OS DADOS/DOCUMENTO] por um caso concreto e curto (3 a 5 linhas, com dados FICTÍCIOS mas realistas do dia a dia brasileiro — nomes comuns, situações típicas do setor jurídico/contábil).
2. Na seção "SAÍDA", mostre o resultado esperado de forma resumida (5 a 8 linhas), seguindo exatamente o "FORMATO DE SAÍDA" que o prompt pede (resumo executivo, análise, alertas de validação humana, próximos passos).

Responda APENAS neste formato:
### ENTRADA (exemplo)
<conteúdo>
### SAÍDA (exemplo resumido)
<conteúdo>

PROMPT:
${p.prompt}`;

  const texto = await gerar(prompt, { maxTokens: 900, timeoutMs: 300000 });
  const seg = ((Date.now() - inicio) / 1000).toFixed(0);

  if (texto && texto.length > 100) {
    p.exemploPreenchido = texto;
    p.exemploFonte = status.provider + '/' + status.modelo;
    feitos++;
    console.log(`✅ (${seg}s)`);
  } else {
    p.exemploPreenchido = '(⚠️ a preencher manualmente na revisão)';
    console.log(`⚠️ LLM falhou (${seg}s) — marcado p/ revisão manual`);
  }

  // Salvamento progressivo
  fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2));
}

console.log(`\n🎉 Concluído: ${feitos}/${pack.prompts.length} prompts com exemplo preenchido`);
console.log(`📄 ${PACK_PATH}`);
console.log(`\n⚠️  PRÓXIMO PASSO (humano): revise cada exemplo — dados fictícios ok, mas o JUÍZO profissional é seu.\n`);
