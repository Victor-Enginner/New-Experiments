/**
 * 📄 Templates Jurídicos Base — Gerador de Contratos
 *
 * Templates com placeholders {{variavel}} preenchidos pelo formulário.
 * Determinístico = confiável (contrato não pode "alucinar").
 * O LLM (opcional) só adiciona cláusulas extras personalizadas ao final.
 *
 * ⚠️ AVISO LEGAL: templates educacionais. O produto final deve sempre
 *    recomendar revisão por advogado. Isso te protege juridicamente
 *    E é um argumento de venda honesto.
 */

export const TEMPLATES = {
  freelancer: {
    nome: 'Contrato de Prestação de Serviços Freelancer',
    campos: ['contratante', 'cpfContratante', 'contratado', 'cpfContratado', 'servico', 'valor', 'prazo', 'cidade'],
    gerar: (d) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FREELANCER

CONTRATANTE: ${d.contratante}, CPF/CNPJ: ${d.cpfContratante}
CONTRATADO(A): ${d.contratado}, CPF: ${d.cpfContratado}

CLÁUSULA 1ª — DO OBJETO
O(a) CONTRATADO(A) prestará ao(à) CONTRATANTE os seguintes serviços: ${d.servico}.

CLÁUSULA 2ª — DO VALOR E PAGAMENTO
Pelos serviços, o(a) CONTRATANTE pagará ${d.valor}.
Parágrafo único. O pagamento dar-se-á mediante comprovação da entrega dos serviços, salvo acordo diverso entre as partes.

CLÁUSULA 3ª — DO PRAZO
Os serviços serão entregues no prazo de ${d.prazo}, contados da assinatura deste contrato.

CLÁUSULA 4ª — DAS OBRIGAÇÕES DO(A) CONTRATADO(A)
I. Executar os serviços com diligência e qualidade técnica;
II. Manter sigilo sobre informações confidenciais do(a) CONTRATANTE;
III. Comunicar impedimentos que afetem o prazo com antecedência.

CLÁUSULA 5ª — DAS OBRIGAÇÕES DO(A) CONTRATANTE
I. Fornecer informações e acessos necessários à execução;
II. Efetuar o pagamento na forma pactuada;
III. Avaliar entregas em até 5 (cinco) dias úteis.

CLÁUSULA 6ª — DA PROPRIEDADE INTELECTUAL
Após a quitação integral, os direitos patrimoniais sobre o trabalho transferem-se ao(à) CONTRATANTE, preservados os direitos morais do(a) autor(a).

CLÁUSULA 7ª — DA RESCISÃO
Qualquer parte pode rescindir com aviso prévio de 7 (sete) dias, mediante pagamento proporcional aos serviços executados.

CLÁUSULA 8ª — DO FORO
Fica eleito o foro da comarca de ${d.cidade} para dirimir controvérsias.

${d.cidade}, ${d.data}.

_______________________________          _______________________________
${d.contratante}                            ${d.contratado}
CONTRATANTE                                 CONTRATADO(A)

⚠️ Este documento é um modelo-base. Recomenda-se revisão por advogado(a) antes do uso.`
  },

  nda: {
    nome: 'Acordo de Confidencialidade (NDA)',
    campos: ['parte1', 'cpfContratante', 'parte2', 'cpfContratado', 'finalidade', 'prazo', 'cidade'],
    gerar: (d) => `ACORDO DE CONFIDENCIALIDADE (NDA)

PARTE REVELADORA: ${d.parte1}, CPF/CNPJ: ${d.cpfContratante}
PARTE RECEPTORA: ${d.parte2}, CPF/CNPJ: ${d.cpfContratado}

CLÁUSULA 1ª — DO OBJETO
As partes trocarão informações confidenciais para a seguinte finalidade: ${d.finalidade}.

CLÁUSULA 2ª — DO SIGILO
A PARTE RECEPTORA compromete-se a não divulgar, copiar ou utilizar as informações para fim diverso do pactuado, pelo prazo de ${d.prazo}.

CLÁUSULA 3ª — DAS EXCEÇÕES
Não se consideram confidenciais informações: (I) já públicas; (II) desenvolvidas independentemente; (III) exigidas por ordem judicial.

CLÁUSULA 4ª — DA VIOLAÇÃO
A violação sujeita o infrator a indenização por perdas e danos, sem prejuízo de medidas judiciais cabíveis (art. 389 do Código Civil).

CLÁUSULA 5ª — DO FORO
Foro da comarca de ${d.cidade}.

${d.cidade}, ${d.data}.

_______________________________          _______________________________
${d.parte1}                                 ${d.parte2}

⚠️ Modelo-base educacional. Recomenda-se revisão por advogado(a).`
  },

  socialmedia: {
    nome: 'Contrato de Gestão de Redes Sociais (recorrente)',
    campos: ['contratante', 'cpfContratante', 'contratado', 'cpfContratado', 'valor', 'cidade'],
    gerar: (d) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE REDES SOCIAIS

CONTRATANTE: ${d.contratante}, CPF/CNPJ: ${d.cpfContratante}
CONTRATADO(A): ${d.contratado}, CPF: ${d.cpfContratado}

CLÁUSULA 1ª — DO OBJETO E ESCOPO
Gestão mensal das redes sociais do(a) CONTRATANTE, incluindo: criação e agendamento de conteúdo, calendário editorial e relatório mensal de desempenho.
Parágrafo único. Serviços fora do escopo (tráfego pago, produção de vídeo, etc.) serão orçados à parte.

CLÁUSULA 2ª — DO VALOR E VIGÊNCIA
Valor mensal: ${d.valor}. Vigência: indeterminada, com fidelidade mínima de 3 (três) meses, renovável automaticamente.

CLÁUSULA 3ª — DAS APROVAÇÕES
O(a) CONTRATANTE aprovará o calendário em até 3 dias úteis; ausência de resposta implica aprovação tácita.

CLÁUSULA 4ª — DO SIGILO E ACESSOS
Credenciais fornecidas serão usadas exclusivamente para execução do serviço e devolvidas/alteradas ao término.

CLÁUSULA 5ª — DA RESCISÃO
Após o período de fidelidade, qualquer parte pode rescindir com 30 dias de aviso.

CLÁUSULA 6ª — DO FORO
Foro da comarca de ${d.cidade}.

${d.cidade}, ${d.data}.

_______________________________          _______________________________
${d.contratante}                            ${d.contratado}

⚠️ Modelo-base educacional. Recomenda-se revisão por advogado(a).`
  }
};

export function listarTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, nome: t.nome, campos: t.campos }));
}
