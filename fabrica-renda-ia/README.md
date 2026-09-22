# 🏭 Fábrica de Renda IA

**Hub de agentes autônomos: 5 pilares de renda sem depender de contratação (RH).**

Você tem 4 certificados em IA + um computador + LLM local (Ollama/gemma2). Este sistema transforma isso em **produtos vendáveis**. A IA faz 80% do trabalho braçal; seus certificados e revisão técnica são os 20% que justificam o preço.

---

## 📊 Os 5 Pilares

| # | Pilar | Produto | Onde vender | Ticket | Velocidade |
|---|-------|---------|-------------|--------|-----------|
| 1 | `datasets` | Datasets limpos de nicho | Kaggle / Gumroad / direto | R$ 49,90 | 🟡 médio |
| 2 | `ebooks` | Guias técnicos práticos | Hotmart / KDP / Gumroad | R$ 37–67 | 🟢 rápido |
| 3 | `prompts` | Packs de prompts testados | PromptBase / Etsy / site | R$ 27–37 | 🟢 muito rápido |
| 4 | `api` | API sentimento PT-BR | RapidAPI (pay-per-call) | assinatura | 🟡 médio |
| 5 | `microsaas` | Gerador de contratos | Stripe (recorrente) | R$ 47/mês | 🔴 lento, mas recorrente |

---

## ⚡ Quick Start

```bash
cd fabrica-renda-ia
npm install

# Ver status dos 5 pilares + ordem de ataque
node main.js

# Ver nichos priorizados (com tickets sugeridos)
node main.js --nichos

# Gerar um produto (exemplos)
node main.js --agente prompts --nicho ia-advocacia     # pack de prompts
node main.js --agente ebooks --nicho ia-contabilidade  # guia técnico
node main.js --agente datasets                          # delega ao ../data-sales-agent
node main.js --agente api                               # sobe API na porta 3000
node main.js --agente microsaas                         # sobe SaaS na porta 3100
```

**Modo `--mock`**: gera a estrutura completa sem chamar o LLM (instantâneo). Use para validar o pipeline; depois gere o conteúdo final com IA real.

---

## 🧠 Sobre o LLM local (leia — importante)

Seu Ollama (`gemma2:latest`) funciona, mas é **lento nesta máquina** (~100s para 120 tokens). Implicações práticas:

| Estratégia | Custo | Tempo p/ e-book | Qualidade |
|-----------|-------|-----------------|-----------|
| Ollama local | grátis | ~2–4h (rode de madrugada) | boa, exige revisão |
| GPT-4o-mini (`OPENAI_API_KEY`) | **< R$ 0,50** por e-book | ~5 min | muito boa |
| Modo `--mock` + sua escrita | grátis | depende de você | máxima (sua autoridade) |

**Recomendação honesta:** comece com `--mock` para ter a estrutura hoje, refine 2–3 capítulos por dia com o LLM local à noite, e considere uma API paga quando o primeiro produto vender (o custo é irrisório perto do ticket).

O `lib/llm.js` detecta automaticamente: Ollama → OpenAI → template. Nada para configurar.

---

## 🚀 Plano de 7 dias (desempregado → primeira venda)

**Dia 1 — Prompts (dinheiro mais rápido):**
```bash
node main.js --agente prompts --nicho ia-advocacia
```
Teste cada um dos 10 prompts num caso real (obrigatório — prompt testado vende, genérico gera reembolso). Crie conta no PromptBase e Etsy. Publique. **Meta: produto no ar em 24h.**

**Dia 2–3 — E-book:**
```bash
node main.js --agente ebooks --nicho ia-advocacia
```
Revise cada capítulo com SUA experiência. Gere o PDF (abra `ebook.html` → Ctrl+P → Salvar PDF). Suba na Hotmart (aprovação rápida) com a `pagina-venda.html` como referência.

**Dia 4 — Datasets:**
```bash
cd ../data-sales-agent && node main.js --config config/default.js
```
Crie uma config de nicho real (dados públicos do IBGE, dados.gov.br, Portal da Transparência — scraping só de fontes que permitem). Publique no Kaggle + Gumroad.

**Dia 5 — API:**
Deploy do `api-sentimento/` no Render/Railway (free tier). Liste no RapidAPI com plano gratuito de 100 calls/mês → planos pagos acima.

**Dia 6 — Micro-SaaS:**
Deploy do `microsaas-contratos/` + Stripe Payment Link. Ofereça 3 contratos grátis → paywall. Nicho inicial: freelancers do seu círculo.

**Dia 7 — Distribuição (o que realmente vende):**
LinkedIn: 1 post/dia mostrando o produto resolvendo um problema real. Grupos de nicho (advogados, contadores) no Facebook/WhatsApp. Responder comentários com link. **Produto sem distribuição = R$ 0.**

---

## ⚠️ Regras de ouro (não pule)

1. **Revisão humana sempre.** IA alucina. Um dataset errado ou guia com erro factual destrói sua reputação antes de nascer.
2. **Scraping ético.** Só dados públicos com permissão; respeite `robots.txt` e termos de uso. Prefira APIs oficiais (dados.gov.br, IBGE).
3. **LGPD.** Nunca processe/venda dados pessoais. Nos produtos jurídicos/saúde, o disclaimer não é opcional.
4. **Um nicho por vez.** "IA para todos" não vende. "IA para advogados trabalhistas" vende.
5. **Seus certificados vão na bio de TUDO.** É sua prova de autoridade contra o oceano de conteúdo genérico de IA.

---

## 📁 Estrutura

```
fabrica-renda-ia/
├── main.js                    # 🏭 Orquestrador (node main.js)
├── lib/llm.js                 # 🧠 Cliente LLM unificado (Ollama→OpenAI→template)
├── config/nichos.json         # 🎯 5 nichos priorizados com tickets
├── agentes/
│   ├── ebooks.js              # 📚 Pilar 2
│   └── prompts.js             # 🎯 Pilar 3
├── api-sentimento/            # 🇧🇷 Pilar 4 (standalone, deploy-ready)
├── microsaas-contratos/       # 💼 Pilar 5 (standalone, deploy-ready)
└── produtos/                  # 📦 Tudo que você gerar aparece aqui

../data-sales-agent/           # 📊 Pilar 1 (projeto completo separado)
```

---

*Cada pilar funciona de forma independente. Falhou um, os outros continuam. Comece pelo mais rápido, não pelo mais bonito.*
