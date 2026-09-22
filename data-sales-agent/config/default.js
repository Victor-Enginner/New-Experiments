/**
 * 🎯 Configuração Padrão do Data-to-Sales Agent
 * 
 * Altere estas configurações para cada nicho/projeto.
 * Você pode criar arquivos de configuração separados (ex: config/imoveis-sp.js)
 * e passá-los como argumento na execução.
 */

export default {
  // === INFORMAÇÕES DO PROJETO ===
  project: {
    name: "Dados de Imóveis SP",
    slug: "imoveis-sp",
    niche: "Mercado Imobiliário de São Paulo",
    description: "Dataset completo com preços, localização e características de imóveis na cidade de São Paulo.",
    price: "R$ 49,90",
    currency: "BRL",
    version: "1.0.0",
    author: "Data Sales Agent",
    year: new Date().getFullYear()
  },

  // === FONTE DE DADOS ===
  dataSource: {
    type: "simulated",       // "scraped" | "api" | "csv" | "simulated"
    url: "",                 // URL para scraping (se type = "scraped")
    apiEndpoint: "",         // Endpoint de API (se type = "api")
    csvPath: "",             // Caminho para CSV local (se type = "csv")
    selectors: {             // Seletores CSS para scraping
      container: "",
      title: "",
      price: "",
      location: "",
      description: ""
    },

    // Política de scraping (pode ser sobrescrita por config.scraping)
    scraping: {
      userAgent: "DataSalesAgent/1.0 (+https://github.com/data-sales-agent; contato@exemplo.com)",
      respectRobots: true,   // respeita robots.txt (RFC 9309)
      retries: 3,            // tentativas após a primeira
      retryBaseDelayMs: 1000,
      retryMaxDelayMs: 10000,
      minDelayMs: 1000,      // rate limit: atraso mínimo entre requisições
      maxJitterMs: 500,
      timeout: 30000
    },

    // Paginação / crawl multi-página (usado quando type = "scraped")
    pagination: {
      enabled: false,        // ativa crawl multi-página
      mode: "query",         // "query" (?page=2, ?page=3...) | "next" (segue link "próxima")
      pageParam: "page",     // nome do parâmetro de query (modo "query")
      startPage: 2,          // primeira página após a base (modo "query")
      maxPages: 5,           // limite de páginas a visitar
      nextSelector: "",      // seletor CSS do link "próxima" (modo "next"); ex: "a.next"
      stopWhenEmpty: true    // para quando uma página não retorna registros
    },

    // Privacidade dos dados: mascaramento de IPs antes da exportação
    // (usa o ip-masker compartilhado de ai-experiments/lib — IPs da máquina
    //  nunca vazam; IPs de referência viram [IP4:0001]/[IP6:0001])
    // Pode ser sobrescrito por config.privacy
    privacy: {
      maskIPs: true          // mascara IPs em todos os campos string do dataset
    },
    simulated: {
      recordCount: 50,
      schema: {
        id: { type: "auto" },
        title: { type: "string", prefix: "Imóvel" },
        price: { type: "number", min: 200000, max: 5000000, format: "BRL" },
        location: { type: "location", neighborhoods: ["Centro", "Jardins", "Pinheiros", "Vila Mariana", "Moema", "Itaim Bibi", "Perdizes", "Higienópolis", "Brooklin", "Tatuapé"] },
        bedrooms: { type: "number", min: 1, max: 6 },
        bathrooms: { type: "number", min: 1, max: 5 },
        area: { type: "number", min: 40, max: 500, unit: "m²" },
        propertyType: { type: "select", options: ["Apartamento", "Casa", "Cobertura", "Kitnet", "Studio"] },
        listingType: { type: "select", options: ["Venda", "Aluguel", "Lançamento"] },
        createdAt: { type: "date" }
      }
    }
  },

  // === CONFIGURAÇÃO DO LLM ===
  llm: {
    provider: "local",       // "openai" | "local" | "mock"
    apiKey: "",              // Sua chave da API (se provider = "openai")
    model: "gpt-4",          // Modelo a usar
    localEndpoint: "http://localhost:11434/api/generate",  // Para Ollama local
    localModel: "gemma2:latest",    // Modelo local (instalado via Ollama)
    temperature: 0.7,
    maxTokens: 2000
  },

  // === CONFIGURAÇÃO DO CONTEÚDO GERADO ===
  content: {
    ebookTitle: "Guia Técnico: {{niche}}",
    ebookSubtitle: "Análise de Mercado, Tendências e Dados Estruturados para Profissionais",
    chapters: [
      "Introdução ao Mercado {{niche}}",
      "Panorama Geral: Preços e Volume de Negócios",
      "Análise por Região/ Bairro",
      "Tendências e Projeções",
      "Perfil do Comprador e Vendedor",
      "Oportunidades de Investimento",
      "Conclusão e Recomendações"
    ],
    includeCharts: true,
    includeStatistics: true,
    includeComparison: true,
    language: "pt-BR"
  },

  // === CONFIGURAÇÃO DO FRONTEND ===
  frontend: {
    template: "modern",      // "modern" | "minimal" | "corporate"
    primaryColor: "#2563eb",  // Azul Tailwind
    secondaryColor: "#7c3aed", // Roxo
    accentColor: "#06b6d4",   // Ciano
    fontFamily: "'Inter', sans-serif",
    showHero: true,
    showFeatures: true,
    showDashboard: true,
    showTestimonials: true,
    showPricing: true,
    showFAQ: true,
    showFooter: true,
    // Integração com pagamento
    payment: {
      provider: "gumroad",   // "gumroad" | "stripe" | "paypal" | "none"
      gumroadUrl: "",        // Link do Gumroad (ex: https://gum.co/seuproduto)
      stripeLink: "",        // Link de checkout Stripe
      paypalLink: "",        // Link do PayPal
      useCheckoutPage: false
    }
  },

  // === CONFIGURAÇÃO DE PUBLICAÇÃO (LOCAL-FIRST, sem Vercel) ===
  deploy: {
    platform: "local",       // "local" — tudo servido da própria máquina
    outputDir: "./output",
    domain: "",              // Domínio personalizado (opcional, ex: via Cloudflare Tunnel)
    local: {
      host: "127.0.0.1",
      port: 4173,            // `npm run serve` → http://127.0.0.1:4173
      dir: "public"          // subpasta servida dentro de output/
    }
  }
};