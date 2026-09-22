# 📋 REVISÃO HUMANA OBRIGATÓRIA — Checklist

**Antes de publicar QUALQUER produto, configure as plataformas abaixo.**

---

## 🔧 CONTAS QUE VOCÊ PRECISA CRIAR (uma vez)

| Plataforma | Tipo | Taxa | Pra que |
|------------|------|------|---------|
| [Hotmart](https://hotmart.com) | Marketplace BR | ~10% | E-books, cursos, packs |
| [Kiwify](https://kiwify.com.br) | Marketplace BR | ~8% | Infoprodutos, alternativa Hotmart |
| [PromptBase](https://promptbase.com) | Marketplace US | 20% | Prompts individuais em dólar |
| [Etsy](https://etsy.com) | Marketplace global | ~6,5% | PDF digital do pack |
| [Render](https://render.com) | Hospedagem grátis | zero | API Sentimento + Micro-SaaS |
| [Stripe](https://stripe.com/br) | Pagamentos BR | 2.9% + R$0,49 | Assinatura do Gerador de Contratos |
| **PIX direto** | Sua chave PIX | **0%** | Venda manual sem taxa |

---

## 1️⃣ Pack Prompts Advocacia (`produtos/prompts-ia-advocacia/`)

### Conteúdo
- [ ] Ler cada prompt e verificar leis/artigos citados — NENHUM prompt pode ter lei falsa (caso 2025)
- [ ] Ajustar linguagem artificial para seu tom pessoal
- [ ] Colocar SEU nome real e seus 4 certificados

### Publicação (escolha 1 ou mais)
- [ ] **Hotmart**: criar produto digital → upload do PDF (gerado de `pack-prompts.pdf.html`)
  - [ ] Preço: R$ 47,00
  - [ ] Copiar link e colar na `pagina-venda.html` (substituir `SEU-LINK-PACK-PROMPTS`)
- [ ] **Kiwify**: mesmo processo, link diferente
- [ ] **PromptBase**: publicar cada prompt individualmente por US$ 2,99-4,99 (10 listagens)
- [ ] **Etsy**: upload do PDF como produto digital
- [ ] **PIX direto**: deixar sua chave e WhatsApp na página

### O que editar na página de vendas
- [ ] Substituir `SEU-LINK-PACK-PROMPTS` pelo link Hotmart
- [ ] Substituir `SEU-LINK-EBOOK-CONTABILIDADE` pelo link do e-book
- [ ] Substituir `seuemail@provedor.com` pelo seu email/chave PIX
- [ ] Substituir `(11) 9XXXX-XXXX` pelo seu WhatsApp

---

## 2️⃣ E-book Contabilidade (`produtos/ebook-ia-contabilidade/`)

### Conteúdo (CRÍTICO — template genérico)
- [ ] Editar `ebook.md` capítulo por capítulo:
  - **Cap. 1**: Sua visão real sobre IA na contabilidade
  - **Cap. 2**: Fundamentos explicados por você (exemplos reais)
  - **Cap. 3**: 5 fluxos REAIS que você testou ou conhece
  - **Cap. 4**: Ferramentas que você de fato usa
  - **Cap. 5**: LGPD na contabilidade — artigos e cuidados reais
  - **Cap. 6**: Casos reais (anônimos de fóruns/grupos de contabilidade)
  - **Cap. 7**: Plano de 30 dias seu (personalizado)
- [ ] Seu nome + 4 certificados na capa e na página de vendas

### Publicação
- [ ] **Hotmart**: subir PDF por R$ 67,00
- [ ] **Kiwify**: alternativa
- [ ] **PIX direto**: chave na página de vendas

### PDF
- [ ] Abrir `ebook.html` → Ctrl+P → Salvar como PDF
- [ ] Verificar layout (capa, capítulos, rodapé)

---

## 3️⃣ Dataset Imóveis SP (`data-sales-agent/output/`)

- [ ] Publicar no [Kaggle](https://kaggle.com) como dataset público (gratuito, gera autoridade)
- [ ] Listar no Hotmart/Kiwify por R$ 49,90 com landing page já gerada
- [ ] Na landing `output/index.html` → trocar link de pagamento

---

## 4️⃣ API Sentimento PT-BR (`api-sentimento/`) + APP MOBILE

### Deploy
- [ ] Deploy no Render:
  1. GitHub → Novo Web Service
  2. Root dir: `fabrica-renda-ia/api-sentimento`
  3. Start: `node server.js`
  4. Porta: 3000
- [ ] Testar: `curl https://seuapp.onrender.com/health`
- [ ] Criar chave paga: `node server.js --criar-key cliente@email.com pro`
- [ ] Listar no RapidAPI como provedor

### APP Mobile (PWA)
- [ ] Já pronto em `api-sentimento/public/` — é um PWA instalável
- [ ] Publicar na Play Store:
  1. No seu PC com Java/Android Studio:
     ```bash
     cd fabrica-renda-ia
     npx cap add android
     npx cap copy
     npx cap open android
     ```
  2. No Android Studio: Build → Generate Signed Bundle → fazer upload na Play Console
- [ ] Publicar na App Store (precisa de Mac):
  - `npx cap add ios` + Xcode

---

## 5️⃣ Micro-SaaS Contratos + APP MOBILE

### Deploy
- [ ] Deploy no Render ou Railway
- [ ] Criar assinatura Stripe de R$ 47/mês
- [ ] Colocar link Stripe no `microsaas-contratos/public/index.html`

### APP Mobile (PWA)
- [ ] Já pronto em `microsaas-contratos/public/` — PWA instalável no celular
- [ ] Para Play Store: mesmo processo do Capacitor acima

---

## 6️⃣ APP MOBILE — Gerador de Prompts (novo)

- [ ] App independente em `apps/prompts-app/` — PWA com:
  - Lista dos 10 prompts jurídicos
  - Copiar prompt com 1 toque
  - Abrir no ChatGPT/Claude diretamente
  - PWA instalável + Capacitor para lojas

---

## 7️⃣ Distribuição (o que realmente vende)

### LinkedIn (15 min/dia)
- [ ] Post 1: "OAB + Stanford lançam pesquisa sobre IA — o que isso muda para advogados?"
- [ ] Post 2: "O caso do advogado condenado por IA em 2025: o erro não foi usar IA"
- [ ] Post 3: "4 dias por mês: quanto tempo a IA devolve a escritórios (com dados)"
- [ ] Post 4: "3 coisas que advogados NUNCA devem colocar no ChatGPT (LGPD)"
- [ ] Post 5: "Contabilidade automatizada: 1 contador com IA vale por 3"

### Grupos de nicho
- [ ] Grupos de WhatsApp/Telegram de advocacia
- [ ] Grupos de contabilidade
- [ ] Responder perguntas com link do produto (sem spam)

---

## 🚀 PRIORIDADE DE PUBLICAÇÃO (o mais rápido primeiro)

| # | Ação | Tempo | Resultado |
|---|------|-------|-----------|
| 1 | Criar conta Hotmart + subir pack de prompts | 15 min | 1º produto no ar |
| 2 | Post LinkedIn sobre OAB/Stanford | 15 min | Primeiro lead |
| 3 | Configurar PIX na página de vendas | 5 min | Venda sem taxa |
| 4 | Revisar 1 capítulo do e-book | 20 min/dia | Conteúdo real em 1 semana |
| 5 | Deploy da API no Render | 10 min | API no ar |

---

## 🔗 LINKS RÁPIDOS

| Produto | Página de Vendas | Onde Publicar |
|---------|-----------------|---------------|
| Pack Prompts Advocacia | `produtos/prompts-ia-advocacia/pagina-venda.html` | Hotmart, Kiwify, PromptBase, Etsy |
| E-book Contabilidade | `produtos/ebook-ia-contabilidade/pagina-venda.html` | Hotmart, Kiwify |
| Dataset Imóveis SP | `data-sales-agent/output/index.html` | Kaggle + Hotmart |
| API Sentimento | `api-sentimento/` | Render + RapidAPI |
| Micro-SaaS Contratos | `microsaas-contratos/public/index.html` | Render + Stripe |

---

⚠️ **LEMBRE-SE:** 1 produto publicado HOJE > 5 produtos perfeitos mês que vem. Comece pelo Hotmart do pack de prompts — são 15 minutos.
