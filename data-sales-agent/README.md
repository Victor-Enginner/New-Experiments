# 🚀 Data-to-Sales Agent

**Sistema automatizado completo: Dados → Conteúdo → Landing Page → Vendas**

Este sistema orquestra um pipeline de 4 módulos que transforma dados brutos (raspados, simulados ou importados) em um produto comercializável: dataset limpo, guia técnico (e-book), landing page com dashboard interativo, tudo pronto para venda no Gumroad/Stripe.

---

## 📦 O que o sistema gera?

| Módulo | Saída | Descrição |
|--------|-------|-----------|
| 1 - Data Collector | `dataset_limpo.json`, `.csv`, `metadados.json` | Coleta, limpa e normaliza dados |
| 2 - Content Generator | `guia_tecnico.md`, `resumo_executivo.json` | E-book com 7 capítulos de análise |
| 3 - Landing Builder | `index.html` (com Chart.js) | Landing Page responsiva com Dashboard |
| 4 - Relatório | `relatorio_final.json` | Resumo executivo do projeto |

---

## ⚡ Instalação

```bash
# Entre no diretório
cd data-sales-agent

# Instale as dependências
pnpm install
# ou: npm install
# ou: yarn install
```

## 🎯 Uso Básico

```bash
# Pipeline COMPLETO (recomendado)
node main.js

# Especificar módulo
node main.js --module 1          # Apenas coleta de dados
node main.js --module 2          # Apenas geração de conteúdo
node main.js --module 3          # Apenas landing page

# Usar configuração personalizada
node main.js --config config/meu-projeto.js

# Diretório de saída personalizado
node main.js --output ./meu-projeto-venda

# Modo simulação (não cria arquivos)
node main.js --dry-run
```

## 📋 Comandos

```bash
node main.js                        # Pipeline completo (4 módulos)
node main.js --full-pipeline        # Pipeline completo
node main.js --module 1             # Apenas Módulo 1
node main.js --module 2             # Apenas Módulo 2
node main.js --module 3             # Apenas Módulo 3
node main.js --module 1,2           # Módulos 1 e 2
node main.js --config custom.js     # Config personalizada
node main.js --output ./venda       # Output customizado
node main.js --skip-collect         # Pula coleta (usa dataset existente)
node main.js --dry-run              # Simulação
node main.js --help                 # Ajuda completa
node main.js --version              # Versão
```

---

## 🏗️ Arquitetura

```
data-sales-agent/
├── main.js                    # 🚀 Orquestrador principal (CLI)
├── package.json               # Dependências
├── README.md                  # Este arquivo
│
├── config/
│   ├── default.js             # Configuração padrão
│   └── (seus-projetos).js     # Suas configs personalizadas
│
├── modules/
│   ├── dataCollector.js       # 📊 Módulo 1: Coleta e Limpeza
│   ├── contentGenerator.js    # 📚 Módulo 2: Geração de Conteúdo
│   └── landingBuilder.js      # 🌐 Módulo 3: Landing Page + Dashboard
│
├── templates/                 # Templates (para customizações futuras)
│
└── output/                    # 📁 Saída gerada
    ├── dataset_limpo.json     # Dataset limpo (JSON)
    ├── dataset_limpo.csv      # Dataset limpo (CSV)
    ├── dataset_metadados.json # Metadados
    ├── guia_tecnico.md        # E-book/Guia técnico
    ├── resumo_executivo.json  # Resumo para landing page
    ├── index.html             # Landing Page completa
    ├── index-standalone.html  # Versão standalone
    └── relatorio_final.json   # Relatório do pipeline
```

---

## 🎨 Personalizando para seu Nicho

### 1. Crie um arquivo de configuração

Crie `config/imoveis-rj.js` (ou qualquer nome):

```javascript
export default {
  project: {
    name: "Dados de Imóveis Rio de Janeiro",
    slug: "imoveis-rj",
    niche: "Mercado Imobiliário Carioca",
    description: "Dataset completo com preços de imóveis no Rio de Janeiro.",
    price: "R$ 39,90",
    currency: "BRL"
  },

  dataSource: {
    type: "simulated",  // ou "scraped", "csv", "json"
    simulated: {
      recordCount: 100,  // Quantidade de registros
      schema: {
        // ... seu schema personalizado
      }
    }
  },

  frontend: {
    primaryColor: "#e11d48",   // Vermelho (tema Rio)
    secondaryColor: "#7c3aed",  // Roxo
    accentColor: "#f59e0b",     // Amarelo
    // ... outras configurações
  }
};
```

### 2. Execute com sua config

```bash
node main.js --config config/imoveis-rj.js --output ./projeto-rj
```

---

## 🧠 Criando um Schema Personalizado

No arquivo de configuração, você define o schema dos dados:

```javascript
simulated: {
  recordCount: 100,
  schema: {
    id: { type: "auto" },
    titulo: { type: "string", prefix: "Imóvel" },
    preco: { type: "number", min: 200000, max: 5000000 },
    bairro: { type: "location", neighborhoods: ["Copacabana", "Ipanema", "Leblon"] },
    quartos: { type: "number", min: 1, max: 6 },
    tipo: { type: "select", options: ["Apartamento", "Casa", "Cobertura"] }
  }
}
```

### Tipos disponíveis:
- `auto` - ID auto-incremental
- `string` - Texto com prefixo
- `number` - Números em intervalo
- `location` - Seleção aleatória de bairros
- `select` - Seleção de opções
- `date` - Datas aleatórias no último ano

---

## 🌐 Landing Page Gerada

A landing page gerada inclui:

- ✅ **Navbar** fixa com navegação suave
- ✅ **Hero section** com call-to-action
- ✅ **Features** destacando benefícios do dataset
- ✅ **Estatísticas animadas** (contadores)
- ✅ **Dashboard interativo** com 3 gráficos Chart.js:
  - 📊 Distribuição de Preços (bar chart)
  - 🏷️ Distribuição por Categoria (doughnut)
  - 📈 Tendências (line chart)
- ✅ **Seção de Preço** com card de compra
- ✅ **FAQ** com accordion interativo
- ✅ **Footer** com informações
- ✅ **Design responsivo** (mobile-friendly)
- ✅ **Animações** com Intersection Observer
- ✅ **Modo escuro** (dark theme)

---

## 🔗 Integração com Pagamento

No arquivo de configuração, configure o link de pagamento:

```javascript
frontend: {
  payment: {
    provider: "gumroad",  // "gumroad" | "stripe" | "paypal" | "none"
    gumroadUrl: "https://gum.co/seu-produto",
    // stripeLink: "https://buy.stripe.com/...",
    // paypalLink: "https://paypal.me/...",
  }
}
```

---

## 📈 Exemplos de Uso Prático

### Exemplo 1: Imóveis (50 registros simulados)

```bash
# Usando a config padrão
node main.js
```

### Exemplo 2: Produtos E-commerce (100 registros)

Crie `config/ecommerce.js` com schema de produtos, depois:

```bash
node main.js --config config/ecommerce.js --output ./loja-virtual
```

### Exemplo 3: Scraping real de site público

```javascript
// config/dados-publicos.js
dataSource: {
  type: "scraped",
  url: "https://exemplo.com/dados-publicos",
  selectors: {
    container: ".table tr",
    title: "td:nth-child(1)",
    price: "td:nth-child(2)",
    location: "td:nth-child(3)"
  }
}
```

### Exemplo 4: Scraping com paginação (crawl multi-página)

```javascript
// config/dados-paginados.js
dataSource: {
  type: "scraped",
  url: "https://exemplo.com/listagem",
  selectors: {
    container: ".item",
    title: ".item h3",
    price: ".item .preco"
  },
  pagination: {
    enabled: true,
    mode: "query",          // "query" (?page=2, ?page=3...) | "next" (segue link "próxima")
    pageParam: "page",      // nome do parâmetro de query (modo "query")
    startPage: 2,           // primeira página após a base (modo "query")
    maxPages: 10,           // limite de páginas a visitar
    nextSelector: "",       // seletor do link "próxima" no modo "next"; ex: "a.next"
    stopWhenEmpty: true     // para quando uma página não retorna registros
  }
}
```

Cada página passa pelas mesmas proteções: **robots.txt** (RFC 9309, verificado por path), **rate limit** (atraso mínimo + Crawl-delay declarado no site) e **retry com backoff** — além de deduplicação automática de registros repetidos entre páginas.

### Exemplo 5: Privacidade — mascaramento de IPs antes da exportação

O pipeline mascara automaticamente **qualquer IP encontrado em campos string do dataset** antes de exportar JSON/CSV, usando o `ip-masker` compartilhado de `ai-experiments/lib`:

```javascript
// config/meu-projeto.js — comportamento padrão (não precisa configurar)
dataSource: {
  type: "scraped",
  // ...
  privacy: {
    maskIPs: true   // false desativa o mascaramento
  }
}
```

Como funciona:
- 🔒 **IP da máquina** (auto-detectado nas interfaces de rede) vira `[IP_MAQUINA]` — **nunca reversível, nunca vaza** para o dataset/CSV/logs
- 🎭 **Demais IPs** (IPv4 e IPv6, incluindo mapeados `::ffff:a.b.c.d`) viram `[IP4:0001]`/`[IP6:0001]` — reversíveis apenas via mapa, que **não é persistido** (proteção de saída)
- 📊 O dataset final ganha um campo `privacy` com contagem de IPs mascarados
- Precedência de config: `dataSource.privacy > config.privacy > padrão (ativado)`

---

## ⚠️ Atenção

### Ética e Legalidade
- Respeite sempre o `robots.txt` dos sites ao fazer scraping
- Use apenas dados públicos que permitam uso comercial
- Não colete dados pessoais sem consentimento
- Verifique os termos de uso das fontes de dados

### Dependências
- `axios` - Requisições HTTP
- `cheerio` - Web scraping
- `fs-extra` - Manipulação de arquivos
- `chalk` - Cores no terminal
- `ora` - Spinners de carregamento
- `jsdom` - DOM para scraping (opcional)

---

## 🚀 Próximos Passos Após Gerar

1. ✅ **Sirva local:** `cd data-sales-agent && npm run serve` → http://127.0.0.1:4173
2. 💳 **Configure o link de pagamento** no config/default.js (Gumroad/Stripe/Hotmart)
3. 🌍 **(Opcional) exponha sem Vercel:** Cloudflare Tunnel ou VPS própria
4. 📊 **Faça upload do dataset** no Kaggle/Gumroad
5. 📣 **Divulgue** seu produto nas redes sociais

---

## 📝 Licença

Este projeto é fornecido como ferramenta educacional e de automação. O usuário é responsável pelo uso ético e legal do sistema.

---

*Gerado com ❤️ pelo Data-to-Sales Agent v1.0.0*
</content_permission>Agora vou corrigir a configuração de output para sair no diretório correto:

<replace_in_file>
<path>data-sales-agent/config/default.js</path>
<diff>
------- SEARCH
    outputDir: "./output/public",
=======
    outputDir: "./output",
+++++++ REPLACE
</diff>
</replace_in_file>