/**
 * 🇧🇷 Motor de Análise de Sentimento em Português do Brasil
 *
 * Abordagem: análise léxica determinística com:
 *   - Léxico PT-BR ponderado (positivos/negativos com pesos)
 *   - Detecção de negação ("não", "nunca", "jamais") inverte o termo seguinte
 *   - Intensificadores ("muito", "extremamente") amplificam o termo seguinte
 *   - Redutores ("meio", "pouco") atenuam
 *   - Normalização de acentos e caixa
 *
 * Zero dependências, zero custo por chamada, ~1ms por análise.
 * Upgrade path: plugar LLM local (Ollama) para casos ambíguos.
 */

const POSITIVOS = {
  // peso 1 (leve)
  bom: 1, legal: 1, ok: 1, agradavel: 1, util: 1, claro: 1, facil: 1, rapido: 1,
  correto: 1, honesto: 1, pontual: 1, limpo: 1, organizado: 1, educado: 1,
  // peso 2 (moderado)
  otimo: 2, excelente: 2, maravilhoso: 2, fantastico: 2, incrivel: 2, perfeito: 2,
  adorei: 2, amei: 2, recomendo: 2, satisfeito: 2, feliz: 2, eficiente: 2,
  confiavel: 2, impressionante: 2, top: 2, show: 2, nota10: 2,
  // peso 3 (forte)
  excepcional: 3, extraordinario: 3, sensacional: 3, impecavel: 3, apaixonado: 3
};

const NEGATIVOS = {
  // peso -1 (leve)
  ruim: -1, lento: -1, caro: -1, confuso: -1, dificil: -1, demorado: -1,
  fraco: -1, simples_demais: -1, complicado: -1, barulhento: -1,
  // peso -2 (moderado)
  pessimo: -2, horrivel: -2, terrivel: -2, odiei: -2, decepcionante: -2,
  insatisfeito: -2, frustrado: -2, frustrante: -2, defeito: -2, problema: -2,
  erro: -2, falha: -2, quebrado: -2, sujo: -2, desorganizado: -2, golpe: -2,
  atrasado: -2, mal: -2, mau: -2, enganoso: -2, arrependido: -2,
  // peso -3 (forte)
  abominavel: -3, criminoso: -3, desastre: -3, catastrofe: -3, inaceitavel: -3,
  absurdo: -3, vergonhoso: -3, nojento: -3, furioso: -3
};

const NEGACOES = ['nao', 'nunca', 'jamais', 'nem', 'nenhum', 'nenhuma', 'tampouco', 'sequer'];
const INTENSIFICADORES = { muito: 1.5, extremamente: 2, super: 1.5, totalmente: 1.8, completamente: 1.8, absolutamente: 2, demais: 1.5, mega: 1.5 };
const REDUTORES = { meio: 0.5, pouco: 0.6, levemente: 0.5, quase: 0.6, razoavelmente: 0.7 };

// Expressões compostas comuns em PT-BR (checadas antes do léxico simples)
const EXPRESSOES = {
  'custo beneficio': 1, 'vale a pena': 2, 'valeu a pena': 2, 'nao vale a pena': -2,
  'dinheiro jogado fora': -3, 'perda de tempo': -2, 'decepção total': -3,
  'superou expectativas': 3, 'abaixo da expectativa': -2, 'deixou a desejar': -2,
  'muito bem atendido': 2, 'mal atendido': -2, 'nunca mais volto': -3,
  'voltarei com certeza': 2, 'nota dez': 2, 'nota zero': -3, 'caiu na besteira': -2
};

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Analisa o sentimento de um texto em PT-BR
 * @param {string} texto
 * @returns {Object} { sentimento, score, confianca, detalhes }
 */
export function analisar(texto) {
  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return { sentimento: 'neutro', score: 0, confianca: 0, detalhes: { palavras: 0, matches: [] } };
  }

  const norm = normalizar(texto);
  const tokens = norm.split(' ');
  const matches = [];
  let score = 0;

  // 1. Expressões compostas
  let normRestante = ` ${norm} `;
  for (const [expr, peso] of Object.entries(EXPRESSOES)) {
    const alvo = ` ${expr} `;
    while (normRestante.includes(alvo)) {
      score += peso;
      matches.push({ termo: expr, peso, tipo: 'expressao' });
      normRestante = normRestante.replace(alvo, ' ');
    }
  }

  // 2. Análise token a token com contexto (negação/intensificador)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let pesoBase = POSITIVOS[t] ?? NEGATIVOS[t] ?? 0;
    if (pesoBase === 0) continue;

    let modificador = 1;
    let negado = false;

    // Olha até 2 tokens anteriores por negação/intensificador/redutor
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const ctx = tokens[j];
      if (NEGACOES.includes(ctx)) negado = !negado;
      if (INTENSIFICADORES[ctx]) modificador *= INTENSIFICADORES[ctx];
      if (REDUTORES[ctx]) modificador *= REDUTORES[ctx];
    }

    let pesoFinal = pesoBase * modificador;
    if (negado) pesoFinal = -pesoFinal * 0.8; // negação inverte com leve atenuação

    score += pesoFinal;
    matches.push({ termo: t, peso: Number(pesoFinal.toFixed(2)), negado, tipo: 'lexico' });
  }

  // 3. Classificação
  const sentimento = score > 0.5 ? 'positivo' : score < -0.5 ? 'negativo' : 'neutro';

  // Confiança: baseada em quantidade e força dos matches vs. tamanho do texto
  const forcaSinais = matches.reduce((s, m) => s + Math.abs(m.peso), 0);
  const cobertura = Math.min(1, matches.length / Math.max(1, tokens.length * 0.15));
  const confianca = Math.round(Math.min(1, (forcaSinais / 6) * 0.6 + cobertura * 0.4) * 100) / 100;

  return {
    sentimento,
    score: Number(score.toFixed(2)),
    confianca,
    detalhes: {
      palavras: tokens.length,
      sinaisEncontrados: matches.length,
      matches: matches.slice(0, 10) // top 10 para auditoria
    }
  };
}

/**
 * Análise em lote (para pay-per-call em volume)
 */
export function analisarLote(textos, limite = 100) {
  if (!Array.isArray(textos)) throw new Error('textos deve ser um array');
  const itens = textos.slice(0, limite);
  const resultados = itens.map(analisar);
  const resumo = {
    total: resultados.length,
    positivos: resultados.filter(r => r.sentimento === 'positivo').length,
    negativos: resultados.filter(r => r.sentimento === 'negativo').length,
    neutros: resultados.filter(r => r.sentimento === 'neutro').length,
    scoreMedio: Number((resultados.reduce((s, r) => s + r.score, 0) / (resultados.length || 1)).toFixed(2))
  };
  return { resumo, resultados };
}
