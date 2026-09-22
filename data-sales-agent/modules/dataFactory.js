/**
 * 🏭 Módulo: Data Factory - Gerador Realista de Datasets
 * 
 * Gera automaticamente 10 datasets realistas para nichos de mercado,
 * utilizando dados semânticos nativos (nomes de ruas, cidades, estados,
 * produtos, preços realistas) sem dependências externas.
 * 
 * Recursos:
 * - Leitura de nichos-dataset.json (ou fallback interno)
 * - Geração com distribuições estatísticas reais
 * - Exportação CSV e JSON por nicho
 * - Metadados compatíveis com Kaggle (datapackage.json)
 * - Sumário executivo com estatísticas descritivas
 * - Histogramas de preço e distribuição geográfica
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

// ===================== LOGGING =====================
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━'))
};

// ===================== NATIVE DATASETS =====================

/** 🌎 Estados brasileiros (UF + nome + região) */
const ESTADOS_BR = [
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte' },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { uf: 'AC', nome: 'Acre', regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte' }
];

/** 🏘️ Bairros de São Paulo */
const BAIRROS_SP = [
  'Centro', 'Jardins', 'Pinheiros', 'Vila Mariana', 'Moema',
  'Itaim Bibi', 'Perdizes', 'Higienópolis', 'Brooklin', 'Tatuapé',
  'Vila Olímpia', 'Morumbi', 'Butantã', 'Santana', 'Jabaquara',
  'Santo Amaro', 'Lapa', 'Cambuci', 'Vila Leopoldina', 'Barra Funda'
];

/** 🏘️ Bairros Rio de Janeiro */
const BAIRROS_RJ = [
  'Copacabana', 'Ipanema', 'Leblon', 'Botafogo', 'Flamengo',
  'Tijuca', 'Barra da Tijuca', 'Recreio', 'Centro', 'Laranjeiras',
  'Gávea', 'São Conrado', 'Jardim Botânico', 'Urca', 'Leme'
];

/** 🚗 Marcas de veículos */
const MARCAS_VEICULOS = [
  'Fiat', 'Volkswagen', 'Chevrolet', 'Ford', 'Toyota',
  'Honda', 'Hyundai', 'Nissan', 'Renault', 'Jeep',
  'Mercedes-Benz', 'BMW', 'Audi', 'Kia', 'Peugeot'
];

/** 🚗 Modelos por marca */
const MODELOS_VEICULOS = {
  'Fiat': ['Uno', 'Mobi', 'Argo', 'Cronos', 'Strada', 'Toro', 'Pulse'],
  'Volkswagen': ['Gol', 'Voyage', 'Polo', 'T-Cross', 'Nivus', 'Taos', 'Amarok'],
  'Chevrolet': ['Onix', 'Prisma', 'Cruze', 'Tracker', 'Equinox', 'S10', 'Spin'],
  'Ford': ['Ka', 'Fiesta', 'Focus', 'EcoSport', 'Ranger', 'Territory', 'Mustang'],
  'Toyota': ['Corolla', 'Hilux', 'Yaris', 'Camry', 'SW4', 'Etios', 'Prius'],
  'Honda': ['Civic', 'Fit', 'HR-V', 'CR-V', 'City', 'Accord', 'WR-V'],
  'Hyundai': ['HB20', 'Creta', 'Tucson', 'Santa Fe', 'Azera', 'i30', 'Elantra'],
  'Nissan': ['Kicks', 'Versa', 'Sentra', 'Frontier', 'Leaf', 'March', 'Altima'],
  'Renault': ['Kwid', 'Sandero', 'Logan', 'Duster', 'Captur', 'Zoe', 'Master'],
  'Jeep': ['Compass', 'Renegade', 'Wrangler', 'Cherokee', 'Grand Cherokee', 'Commander'],
  'Mercedes-Benz': ['Classe A', 'Classe C', 'Classe E', 'Classe S', 'GLA', 'GLC', 'GLE'],
  'BMW': ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5', 'X6'],
  'Audi': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8'],
  'Kia': ['Sportage', 'Sorento', 'Cerato', 'Optima', 'Soul', 'Picanto', 'Stonic'],
  'Peugeot': ['208', '308', '2008', '3008', '5008', 'Partner', 'Expert']
};

/** 🏪 Produtos de e-commerce por categoria */
const PRODUTOS_ECOMMERCE = {
  'Eletrônicos': ['Smartphone Galaxy S23', 'iPhone 15', 'Notebook Dell XPS', 'iPad Air', 'Smart TV LG 55"', 'Fone Bluetooth JBL', 'Câmera Canon EOS', 'Console PS5', 'Tablet Samsung', 'Kindle Paperwhite'],
  'Informática': ['Mouse Logitech', 'Teclado Mecânico Redragon', 'Monitor LG 27"', 'SSD Kingston 1TB', 'Memória RAM 16GB', 'Hub USB 7 portas', 'Webcam Full HD', 'Microfone Condensador', 'Caixa de Som', 'Roteador Wi-Fi 6'],
  'Casa e Cozinha': ['Liquidificador Philips', 'Cafeteira Nespresso', 'Panela de Pressão Elétrica', 'Jogo de Facas Tramontina', 'Air Fryer Mondial', 'Batedeira KitchenAid', 'Fogão 4 Bocas', 'Geladeira Frost Free', 'Micro-ondas 30L', 'Aspirador Robô']
};

/** 🍽️ Restaurantes e cozinhas */
const RESTAURANTES = {
  tipos: ['Pizzaria', 'Hamburgueria', 'Restaurante Japonês', 'Restaurante Italiano', 'Comida Brasileira', 'Café', 'Comida Mexicana', 'Comida Árabe', 'Vegano', 'Frutos do Mar'],
  nomes: ['Don Carlo', 'Sushi House', 'El Mariachi', 'Veggie Planet', 'Mar e Terra', 'Fogão de Lenha', 'Sabor do Norte', 'Mesa do Chef', 'Bom Apetite', 'Paladar',
          'Cantina do Zé', 'La Trattoria', 'Sakura Temaki', 'Burger Prime', 'Café do Porto', 'Aromas da Terra', 'Tempero Baiano', 'Cozinha Mineira', 'Delícias do Mar']
};

/** 💻 Vagas de TI */
const VAGAS_TI = {
  cargos: ['Desenvolvedor Front-end', 'Desenvolvedor Back-end', 'Desenvolvedor Full Stack', 'Analista de Dados', 'Cientista de Dados', 'Engenheiro de Software', 'Arquiteto de Soluções', 'DevOps Engineer', 'QA Tester', 'Product Manager', 'UX Designer', 'Tech Lead', 'Analista de Segurança', 'Administrador de Banco de Dados', 'Scrum Master'],
  empresas: ['Google Brasil', 'Microsoft Brasil', 'IBM Brasil', 'Oracle Brasil', 'Amazon Web Services', 'Meta Brasil', 'PagSeguro', 'Nubank', 'iFood', 'Stone', 'PicPay', 'Mercado Livre', 'VTEX', 'Zé Delivery', 'QuintoAndar']
};

/** 🏋️ Academias e equipamentos */
const ACADEMIAS = {
  tipos: ['Musculação', 'CrossFit', 'Funcional', 'Yoga', 'Pilates', 'Natação', 'Artes Marciais', 'Dança', 'Spinning', 'HIIT'],
  equipamentos: ['Halteres Ajustáveis', 'Barra Olímpica', 'Banco Supino', 'Leg Press', 'Cadeira Extensora', 'Cross Over', 'Esteira', 'Bicicleta Ergométrica', 'Remo', 'Kettlebell']
};

/** 🌾 Produtos agrícolas */
const AGRICULTURA = {
  culturas: ['Soja', 'Milho', 'Café', 'Algodão', 'Cana-de-Açúcar', 'Arroz', 'Feijão', 'Trigo', 'Laranja', 'Tomate'],
  estadosProdutores: ['MT', 'GO', 'MS', 'PR', 'BA', 'MG', 'SP', 'RS', 'SC', 'RO']
};

/** ✈️ Destinos turísticos */
const TURISMO = {
  destinosNacionais: ['Rio de Janeiro', 'Salvador', 'Fortaleza', 'Porto de Galinhas', 'Gramado', 'Bonito', 'Fernando de Noronha', 'Foz do Iguaçu', 'Manaus', 'Caldas Novas'],
  destinosInternacionais: ['Paris', 'Nova York', 'Londres', 'Cancún', 'Buenos Aires', 'Lisboa', 'Roma', 'Orlando', 'Miami', 'Tóquio'],
  tiposHospedagem: ['Hotel 3 estrelas', 'Hotel 4 estrelas', 'Hotel 5 estrelas', 'Pousada', 'Resort', 'Hostel', 'Airbnb', 'Flat']
};

/** 👗 Produtos de moda */
const MODA = {
  categorias: ['Camisetas', 'Calças Jeans', 'Vestidos', 'Blazers', 'Sapatos', 'Bolsas', 'Relógios', 'Óculos de Sol', 'Cintos', 'Moletons'],
  materiais: ['Algodão', 'Linho', 'Seda', 'Poliéster', 'Couro', 'Lã', 'Viscose', 'Jeans']
};

/** ⚡ Consumo energético */
const ENERGIA = {
  fontes: ['Hidrelétrica', 'Eólica', 'Solar', 'Biomassa', 'Gás Natural', 'Carvão Mineral', 'Petróleo', 'Nuclear'],
  estadosGeradores: ['SP', 'PR', 'MG', 'BA', 'RN', 'CE', 'PE', 'RS', 'SC', 'GO']
};

/** 👤 Nomes e sobrenomes brasileiros */
const NOMES_BR = [
  { nome: 'João', sobrenomes: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Carvalho', 'Almeida', 'Ferreira'] },
  { nome: 'Maria', sobrenomes: ['Santos', 'Oliveira', 'Lima', 'Costa', 'Silva', 'Souza', 'Pereira', 'Carvalho', 'Almeida', 'Ferreira'] },
  { nome: 'Pedro', sobrenomes: ['Alves', 'Barbosa', 'Dias', 'Freitas', 'Gomes', 'Martins', 'Ribeiro', 'Teixeira', 'Vieira', 'Nunes'] },
  { nome: 'Ana', sobrenomes: ['Carvalho', 'Ferreira', 'Gomes', 'Martins', 'Ribeiro', 'Alves', 'Barbosa', 'Dias', 'Freitas', 'Nunes'] },
  { nome: 'Carlos', sobrenomes: ['Mendes', 'Monteiro', 'Moraes', 'Moreira', 'Moura', 'Neves', 'Nogueira', 'Novaes', 'Paz', 'Peixoto'] },
  { nome: 'Juliana', sobrenomes: ['Ramos', 'Reis', 'Rocha', 'Rodrigues', 'Sales', 'Siqueira', 'Soares', 'Tavares', 'Torres', 'Vargas'] },
  { nome: 'Lucas', sobrenomes: ['Vasconcelos', 'Viana', 'Xavier', 'Aragão', 'Barros', 'Bastos', 'Beltrão', 'Borges', 'Braga', 'Brandão'] },
  { nome: 'Fernanda', sobrenomes: ['Brito', 'Cabral', 'Campos', 'Cardoso', 'Castro', 'Chaves', 'Cunha', 'Duarte', 'Dutra', 'Escobar'] },
  { nome: 'Rafael', sobrenomes: ['Esteves', 'Fernandes', 'Fonseca', 'Fragoso', 'Godói', 'Guerra', 'Guimarães', 'Henriques', 'Holanda', 'Leão'] },
  { nome: 'Beatriz', sobrenomes: ['Leite', 'Lemos', 'Lopes', 'Lorena', 'Macedo', 'Machado', 'Magalhães', 'Marques', 'Matos', 'Medeiros'] },
];

// ===================== UTILITY FUNCTIONS =====================

/**
 * Gera um número aleatório entre min e max (inclusive)
 */
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gera um número float aleatório entre min e max com precisão especificada
 */
function randomFloat(min, max, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

/**
 * Escolhe um item aleatório de um array
 */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Escolhe N itens aleatórios de um array (sem repetição)
 */
function randomItems(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * Gera um nome completo aleatório
 */
function gerarNomeCompleto() {
  const pessoa = randomItem(NOMES_BR);
  const sobrenome1 = randomItem(pessoa.sobrenomes);
  const sobrenome2 = randomItem(Object.values(NOMES_BR).flatMap(p => p.sobrenomes));
  return `${pessoa.nome} ${sobrenome1} ${sobrenome2}`;
}

/**
 * Gera uma data aleatória entre duas datas
 */
function randomDate(startYear = 2020, endYear = 2024) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const date = new Date(start + Math.random() * (end - start));
  return date.toISOString().split('T')[0];
}

/**
 * Distribuição normal (Box-Muller transform)
 */
function normalRandom(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stdDev * z;
}

/**
 * Gera um valor seguindo distribuição log-normal (comum em preços)
 */
function gerarPrecoLogNormal(min, max) {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  let price;
  do {
    const u = Math.random();
    const logPrice = logMin + u * (logMax - logMin);
    price = Math.round(Math.exp(logPrice));
  } while (price < min || price > max);
  return price;
}

/**
 * Cria histograma de dados numéricos
 */
function criarHistograma(values, bins = 10) {
  if (values.length === 0) return { labels: [], counts: [], min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binWidth = range / bins;
  const labels = [];
  const counts = new Array(bins).fill(0);

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    labels.push(`${formatNumberLocale(binStart)}-${formatNumberLocale(binEnd)}`);
  }

  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  });

  return { labels, counts, min, max, binWidth };
}

/**
 * Formata número com separador brasileiro
 */
function formatNumberLocale(num) {
  if (typeof num !== 'number') return String(num);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.', ',') + ' M';
  }
  if (num >= 1000) {
    return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

/**
 * Gera um telefone brasileiro (formato (XX) XXXXX-XXXX)
 */
function gerarTelefone() {
  const ddd = randomRange(11, 99);
  const parte1 = randomRange(90000, 99999);
  const parte2 = randomRange(1000, 9999);
  return `(${ddd}) ${parte1}-${parte2}`;
}

/**
 * Gera uma data de registro mais recente quanto mais próximo do fim
 */
function gerarDataRegistro(recordsCount, index) {
  // Simula tendência: registros mais recentes aparecem mais no final
  const daysAgo = Math.max(1, Math.round((1 - index / recordsCount) * 730));
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// ===================== NICHE DATASET GENERATORS =====================

/**
 * Gera dataset para nicho de Imóveis
 */
function generateImoveis(recordCount = 200) {
  const data = [];
  const tiposImovel = ['Apartamento', 'Casa', 'Cobertura', 'Kitnet', 'Studio', 'Sobrado'];
  const estados = [ESTADOS_BR[0], ESTADOS_BR[1], ESTADOS_BR[2], ESTADOS_BR[4]];
  const condicoes = ['Novo', 'Ótimo', 'Bom', 'Regular', 'Renovado'];
  const vagas = [1, 2, 2, 2, 3, 3, 3, 4];
  const suites = [0, 0, 1, 1, 1, 2, 2, 3];

  for (let i = 0; i < recordCount; i++) {
    const tipo = randomItem(tiposImovel);
    const estado = randomItem(estados);
    const bairro = estado.uf === 'SP' ? randomItem(BAIRROS_SP) : randomItem(BAIRROS_RJ);
    const area = tipo === 'Kitnet' ? randomRange(20, 50) : tipo === 'Studio' ? randomRange(25, 70) :
                 tipo === 'Cobertura' ? randomRange(150, 500) : randomRange(40, 400);
    const quartos = tipo === 'Kitnet' ? 1 : tipo === 'Cobertura' ? randomRange(3, 6) : randomRange(1, 5);
    const banheiros = quartos <= 2 ? randomRange(1, 2) : randomRange(2, 4);
    const suitesCount = randomItem(suites.filter(s => s <= banheiros));
    const precoBase = 
      tipo === 'Kitnet' ? gerarPrecoLogNormal(120000, 400000) :
      tipo === 'Studio' ? gerarPrecoLogNormal(150000, 500000) :
      tipo === 'Cobertura' ? gerarPrecoLogNormal(800000, 5000000) :
      tipo === 'Casa' ? gerarPrecoLogNormal(300000, 3000000) :
      tipo === 'Sobrado' ? gerarPrecoLogNormal(350000, 2500000) :
      gerarPrecoLogNormal(200000, 2000000);

    // Ajuste por área
    const preco = Math.round(precoBase * (area / 80));
    const iptu = Math.round(preco * randomFloat(0.003, 0.008));
    const condominio = tipo === 'Casa' ? 0 : randomRange(300, 2500);

    data.push({
      id: i + 1,
      titulo: `${tipo} em ${bairro} - ${area}m² - ${quartos} quartos`,
      tipo,
      area_m2: area,
      quartos,
      banheiros,
      suites: suitesCount,
      vagas_garagem: randomItem(vagas),
      preco: preco,
      preco_m2: Math.round(preco / area),
      iptu_anual: iptu,
      condominio,
      bairro,
      cidade: estado.nome,
      uf: estado.uf,
      regiao: estado.regiao,
      condicao: randomItem(condicoes),
      data_registro: gerarDataRegistro(recordCount, i),
      titulo_escritura: gerarNomeCompleto(),
      contato: gerarTelefone()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Veículos Usados
 */
function generateVeiculos(recordCount = 200) {
  const data = [];
  const combustiveis = ['Gasolina', 'Álcool', 'Flex', 'Diesel', 'Elétrico', 'Híbrido'];
  const cores = ['Branco', 'Preto', 'Prata', 'Cinza', 'Azul', 'Vermelho', 'Verde', 'Marrom', 'Bege', 'Amarelo'];
  const transmissoes = ['Manual', 'Automática', 'CVT', 'Automática Sequencial', 'Automática Dupla Embreagem'];
  const categorias = ['Hatch', 'Sedan', 'SUV', 'Picape', 'Esportivo', 'Minivan', 'Crossover'];

  for (let i = 0; i < recordCount; i++) {
    const marca = randomItem(MARCAS_VEICULOS);
    const modelo = randomItem(MODELOS_VEICULOS[marca] || ['Modelo Genérico']);
    const ano = randomRange(2010, 2024);
    const km = ano < 2015 ? randomRange(80000, 200000) :
               ano < 2020 ? randomRange(30000, 100000) :
               randomRange(1000, 50000);
    const estado = randomItem(ESTADOS_BR);

    // Preço base por marca, ano e km
    const tabelaFipe = randomRange(20000, 250000);
    const depreciacaoAno = Math.max(0, (2024 - ano) * 0.05);
    const kmPenalty = km / 100000 * 0.1;
    const fator = 1 - depreciacaoAno - kmPenalty + randomFloat(-0.05, 0.05);
    const preco = Math.round(tabelaFipe * Math.max(0.3, fator));

    data.push({
      id: i + 1,
      titulo: `${marca} ${modelo} ${ano}`,
      marca,
      modelo,
      ano_fabricacao: ano,
      ano_modelo: ano,
      categoria: randomItem(categorias),
      quilometragem: km,
      combustivel: randomItem(combustiveis),
      transmissao: randomItem(transmissoes),
      cor: randomItem(cores),
      portas: randomRange(2, 4),
      potencia_cv: randomRange(80, 350),
      preco: Math.max(5000, preco),
      ipva_anual: Math.round(Math.max(500, preco * 0.04)),
      cidade: randomItem(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Recife', 'Fortaleza', 'Goiânia']),
      uf: estado.uf,
      regiao: estado.regiao,
      proprietario_anterior: randomRange(0, 4),
      aceita_troca: Math.random() > 0.5,
      data_registro: gerarDataRegistro(recordCount, i),
      vendedor: gerarNomeCompleto(),
      contato: gerarTelefone()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de E-commerce (produtos)
 */
function generateEcommerce(recordCount = 200) {
  const data = [];
  const categorias = Object.keys(PRODUTOS_ECOMMERCE);
  const condicoes = ['Novo', 'Usado - Como novo', 'Usado - Bom estado', 'Recondicionado', 'Aberto'];
  const vendedores = ['Magazine Luiza', 'Amazon Brasil', 'Mercado Livre', 'Shopee', 'Americanas', 'Submarino', 'Casas Bahia', 'Kabum!', 'Ponto Frio', 'Carrefour'];

  for (let i = 0; i < recordCount; i++) {
    const categoria = randomItem(categorias);
    const produto = randomItem(PRODUTOS_ECOMMERCE[categoria]);
    const precoCusto = gerarPrecoLogNormal(10, 8000);
    const markup = randomFloat(1.2, 2.5);
    const precoVenda = Math.round(precoCusto * markup);
    const estoque = Math.random() > 0.8 ? 0 : randomRange(1, 500);
    const estado = randomItem(ESTADOS_BR);

    data.push({
      id: i + 1,
      nome: `${produto} - ${randomItem(['Oficial', 'Premium', 'Plus', 'Edição Limitada', 'Original'])}`,
      categoria,
      subcategoria: categoria === 'Eletrônicos' ? randomItem(['Smartphones', 'TVs', 'Áudio', 'Câmeras', 'Games']) :
                    categoria === 'Informática' ? randomItem(['Periféricos', 'Hardware', 'Acessórios', 'Armazenamento', 'Redes']) :
                    randomItem(['Utensílios', 'Eletroportáteis', 'Panelas', 'Cafeteiras', 'Ferramentas']),
      preco_custo: precoCusto,
      preco_venda: precoVenda,
      margem_lucro: parseFloat(((precoVenda - precoCusto) / precoVenda * 100).toFixed(1)),
      estoque_atual: estoque,
      estoque_minimo: randomRange(5, 50),
      peso_kg: randomFloat(0.05, 15, 2),
      altura_cm: randomRange(5, 100),
      largura_cm: randomRange(5, 80),
      comprimento_cm: randomRange(5, 100),
      condicao: randomItem(condicoes),
      avaliacao_media: randomFloat(1.0, 5.0, 1),
      total_avaliacoes: randomRange(0, 5000),
      vendedor: randomItem(vendedores),
      cidade: randomItem(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Blumenau', 'Campinas', 'Ribeirão Preto', 'Uberlândia', 'Joinville', 'Porto Alegre']),
      uf: estado.uf,
      regiao: estado.regiao,
      data_cadastro: gerarDataRegistro(recordCount, i),
      sku: `SKU-${String(i + 1).padStart(5, '0')}`
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Empregos TI
 */
function generateEmpregosTI(recordCount = 150) {
  const data = [];
  const niveis = ['Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista', 'Tech Lead', 'Coordenador', 'Gerente'];
  const modalidades = ['Presencial', 'Híbrido', 'Remoto'];
  const contratos = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Cooperado'];

  for (let i = 0; i < recordCount; i++) {
    const cargo = randomItem(VAGAS_TI.cargos);
    const nivel = randomItem(niveis);
    const empresa = randomItem(VAGAS_TI.empresas);
    const estado = randomItem(ESTADOS_BR.slice(0, 10));

    // Salário base por nível
    const salarioBase = nivel === 'Estágio' ? randomRange(1200, 3000) :
                        nivel === 'Júnior' ? randomRange(3000, 7000) :
                        nivel === 'Pleno' ? randomRange(6000, 12000) :
                        nivel === 'Sênior' ? randomRange(10000, 20000) :
                        nivel === 'Especialista' ? randomRange(15000, 28000) :
                        nivel === 'Tech Lead' ? randomRange(18000, 35000) :
                        nivel === 'Coordenador' ? randomRange(15000, 25000) :
                        randomRange(20000, 40000);

    const salario = Math.round(salarioBase + normalRandom(0, salarioBase * 0.15));

    data.push({
      id: i + 1,
      titulo: `${cargo} ${nivel}`,
      cargo,
      nivel,
      empresa,
      setor: randomItem(['Tecnologia', 'Fintech', 'E-commerce', 'Saúde', 'Educação', 'Logística', 'Governo', 'Consultoria']),
      salario_min: Math.round(salario * 0.85),
      salario_max: Math.round(salario * 1.15),
      salario_medio: salario,
      modalidade: randomItem(modalidades),
      tipo_contrato: randomItem(contratos),
      beneficios: randomItems(['Vale Refeição', 'Vale Transporte', 'Plano de Saúde', 'Plano Odontológico', 'Seguro de Vida', 'Gympass', 'Home Office', 'Horário Flexível'], randomRange(3, 7)).join('; '),
      estado: estado.uf,
      cidade: randomItem(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Campinas', 'Florianópolis', 'Recife', 'Salvador']),
      regiao: estado.regiao,
      data_publicacao: gerarDataRegistro(recordCount, i),
      candidatos_inscritos: randomRange(5, 500),
      tempo_experiencia_anos: randomRange(1, 15),
      requer_ingles: Math.random() > 0.6,
      descricao_resumida: `Oportunidade para ${cargo} ${nivel} na ${empresa}. Requer experiência em ${randomItem(['JavaScript', 'Python', 'Java', 'C#', 'React', 'Node.js', 'AWS', 'Docker', 'SQL', 'TypeScript', 'Go', 'Ruby'])}.`
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Restaurantes
 */
function generateRestaurantes(recordCount = 200) {
  const data = [];
  const faixasPreco = ['$', '$$', '$$$', '$$$$'];
  const cidadesGrandes = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Florianópolis'];

  for (let i = 0; i < recordCount; i++) {
    const tipo = randomItem(RESTAURANTES.tipos);
    const nome = `${randomItem(RESTAURANTES.nomes)} ${tipo.split(' ')[0]}`;
    const cidade = randomItem(cidadesGrandes);
    const estado = ESTADOS_BR.find(e => e.nome === cidade || (cidade === 'Brasília' ? e.uf === 'DF' : false)) || randomItem(ESTADOS_BR);
    const nota = randomFloat(2.0, 5.0, 1);
    const precoMedio = tipo === 'Pizzaria' ? randomRange(40, 150) :
                       tipo === 'Hamburgueria' ? randomRange(25, 80) :
                       tipo === 'Restaurante Japonês' ? randomRange(50, 200) :
                       tipo === 'Restaurante Italiano' ? randomRange(60, 250) :
                       tipo === 'Café' ? randomRange(10, 40) :
                       tipo === 'Comida Brasileira' ? randomRange(30, 120) :
                       tipo === 'Frutos do Mar' ? randomRange(80, 300) :
                       randomRange(30, 180);

    data.push({
      id: i + 1,
      nome,
      tipo_cozinha: tipo,
      endereco: `Rua ${randomItem(['Augusta', 'Oscar Freire', 'Haddock Lobo', 'Fradique Coutinho', 'Consolação', 'Bela Cintra', 'Mourato Coelho', 'Aspicuelta', 'Teodoro Sampaio', 'Cardeal Arcoverde'])} ${randomRange(100, 2000)}`,
      bairro: cidade === 'São Paulo' ? randomItem(BAIRROS_SP.slice(0, 10)) : randomItem(BAIRROS_RJ.slice(0, 8)),
      cidade,
      uf: estado.uf,
      regiao: estado.regiao,
      nota_media: nota,
      total_avaliacoes: randomRange(50, 8000),
      preco_medio: precoMedio,
      faixa_preco: faixasPreco[precoMedio > 150 ? 3 : precoMedio > 100 ? 2 : precoMedio > 50 ? 1 : 0],
      capacidade_pessoas: randomRange(20, 300),
      tempo_espera_min: randomRange(5, 60),
      reserva_obrigatoria: Math.random() > 0.7,
      estrela_michelin: Math.random() > 0.97 ? randomRange(1, 3) : 0,
      data_avaliacao: gerarDataRegistro(recordCount, i),
      proprietario: gerarNomeCompleto(),
      telefone: gerarTelefone()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Fitness / Academias
 */
function generateFitness(recordCount = 150) {
  const data = [];
  const redes = ['Smart Fit', 'Company', 'Bluefit', 'Bodytech', 'Runner', 'Curves', 'Abyara', 'Bio Ritmo', 'Fórmula', 'Unidade Independente'];
  const bairros = BAIRROS_SP.concat(BAIRROS_RJ);

  for (let i = 0; i < recordCount; i++) {
    const tipo = randomItem(ACADEMIAS.tipos);
    const rede = Math.random() > 0.4 ? randomItem(redes) : 'Independente';
    const cidade = randomItem(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Campinas', 'Santos', 'Niterói', 'Brasília', 'Salvador']);
    const estado = ESTADOS_BR.find(e => e.nome === cidade || (cidade === 'Brasília' ? e.uf === 'DF' : false)) || randomItem(ESTADOS_BR);
    const mensalidade = tipo === 'CrossFit' ? randomRange(150, 400) :
                        tipo === 'Yoga' ? randomRange(100, 300) :
                        tipo === 'Pilates' ? randomRange(120, 350) :
                        tipo === 'Musculação' ? randomRange(79, 250) :
                        tipo === 'Natação' ? randomRange(150, 400) :
                        tipo === 'Artes Marciais' ? randomRange(100, 300) :
                        randomRange(80, 350);

    data.push({
      id: i + 1,
      nome: rede === 'Independente' ? `${randomItem(['Corpo & Movimento', 'Vida Ativa', 'Força Total', 'Bem-Estar Fit', 'Ação Fit', 'Evolução Sports', 'Novo Corpo', 'Plus Fitness', 'Vital Center', 'Shape Up'])} - ${cidade}` : `${rede} - ${cidade} ${randomItems(bairros, 1)[0]}`,
      tipo_modalidade: tipo,
      rede,
      mensalidade,
      matrícula: randomRange(0, 200),
      total_alunos: randomRange(50, 5000),
      avaliacao_media: randomFloat(2.5, 5.0, 1),
      total_avaliacoes: randomRange(10, 2000),
      horario_funcionamento: `${randomItem(['06:00', '05:00', '07:00'])}-${randomItem(['22:00', '23:00', '00:00', '21:00'])}`,
      aberto_fds: Math.random() > 0.3,
      area_m2: randomRange(100, 2000),
      possui_estacionamento: Math.random() > 0.5,
      equipamentos: randomItems(ACADEMIAS.equipamentos, randomRange(4, 10)).join('; '),
      cidade,
      uf: estado.uf,
      data_inauguracao: randomDate(2000, 2023),
      contato: gerarTelefone(),
      proprietario: gerarNomeCompleto()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Agricultura
 */
function generateAgricultura(recordCount = 150) {
  const data = [];
  const mesesPlantio = {
    'Soja': 'Outubro', 'Milho': 'Setembro', 'Café': 'Janeiro', 'Algodão': 'Fevereiro',
    'Cana-de-Açúcar': 'Janeiro', 'Arroz': 'Agosto', 'Feijão': 'Outubro', 'Trigo': 'Março',
    'Laranja': 'Janeiro', 'Tomate': 'Agosto'
  };
  const unidadePorCultura = {
    'Soja': 'saca 60kg', 'Milho': 'saca 60kg', 'Café': 'saca 60kg', 'Algodão': 'arroba',
    'Cana-de-Açúcar': 'tonelada', 'Arroz': 'saca 50kg', 'Feijão': 'saca 60kg', 'Trigo': 'saca 60kg',
    'Laranja': 'kg', 'Tomate': 'kg'
  };

  for (let i = 0; i < recordCount; i++) {
    const cultura = randomItem(AGRICULTURA.culturas);
    const ufProdutor = randomItem(AGRICULTURA.estadosProdutores);
    const estado = ESTADOS_BR.find(e => e.uf === ufProdutor) || randomItem(ESTADOS_BR);
    const unidade = unidadePorCultura[cultura] || 'kg';

    // Preços realistas por cultura
    const precoBase = {
      'Soja': 130, 'Milho': 70, 'Café': 900, 'Algodão': 120, 'Cana-de-Açúcar': 180,
      'Arroz': 100, 'Feijão': 250, 'Trigo': 85, 'Laranja': 3, 'Tomate': 5
    }[cultura] || 50;

    const preco = precoBase + normalRandom(0, precoBase * 0.2);
    const producao = randomRange(500, 50000);
    const areaPlantada = randomRange(5, 5000);

    data.push({
      id: i + 1,
      cultura,
      variedade: randomItem(['Convencional', 'Transgênica', 'Orgânica', 'Certificada', 'Híbrida']),
      safra: randomRange(2020, 2024),
      mes_plantio: mesesPlantio[cultura] || 'Janeiro',
      mes_colheita: randomItem(['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']),
      area_plantada_ha: areaPlantada,
      producao_total: producao,
      produtividade_ha: Math.round(producao / Math.max(1, areaPlantada)),
      preco_por_unidade: parseFloat(preco.toFixed(2)),
      unidade,
      receita_estimada: Math.round(producao * preco),
      custo_producao_ha: randomRange(3000, 15000),
      margem_estimada_pct: randomFloat(5, 45, 1),
      municipio: randomItem(['Dourados-MS', 'Lucas do Rio Verde-MT', 'Jataí-GO', 'Balsas-MA', 'Barreiras-BA', 'Cristalina-GO', 'Primavera do Leste-MT', 'Sorriso-MT', 'Rio Verde-GO', 'Campo do Meio-MG']),
      uf: ufProdutor,
      regiao: estado.regiao,
      tipo_solo: randomItem(['Latossolo', 'Argissolo', 'Neossolo', 'Cambissolo', 'Nitossolo']),
      uso_irrigacao: Math.random() > 0.6,
      data_registro: gerarDataRegistro(recordCount, i),
      produtor: gerarNomeCompleto()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Turismo
 */
function generateTurismo(recordCount = 150) {
  const data = [];
  const temporadas = ['Baixa', 'Média', 'Alta', 'Super Alta'];
  const meiosTransporte = ['Aéreo', 'Rodoviário', 'Marítimo', 'Ferroviário'];

  for (let i = 0; i < recordCount; i++) {
    const destinoNac = Math.random() > 0.5;
    const destino = destinoNac ? randomItem(TURISMO.destinosNacionais) : randomItem(TURISMO.destinosInternacionais);
    const hospedagem = randomItem(TURISMO.tiposHospedagem);
    const diarias = randomRange(2, 21);

    // Preço base por tipo de hospedagem
    const precoPorNoite = hospedagem === 'Hostel' ? randomRange(50, 150) :
                          hospedagem === 'Pousada' ? randomRange(150, 400) :
                          hospedagem === 'Hotel 3 estrelas' ? randomRange(200, 500) :
                          hospedagem === 'Hotel 4 estrelas' ? randomRange(350, 900) :
                          hospedagem === 'Hotel 5 estrelas' ? randomRange(700, 2500) :
                          hospedagem === 'Resort' ? randomRange(500, 2000) :
                          hospedagem === 'Airbnb' ? randomRange(150, 800) :
                          randomRange(100, 600);

    const custoTotal = precoPorNoite * diarias;
    const taxaOcupacao = randomFloat(30, 95, 1);
    const estado = randomItem(ESTADOS_BR);

    data.push({
      id: i + 1,
      destino,
      tipo_destino: destinoNac ? 'Nacional' : 'Internacional',
      pais: destinoNac ? 'Brasil' : randomItem(['França', 'Estados Unidos', 'Reino Unido', 'México', 'Argentina', 'Portugal', 'Itália', 'Japão']),
      tipo_hospedagem: hospedagem,
      diarias,
      preco_por_noite: precoPorNoite,
      custo_total_estimado: Math.round(custoTotal * 1.3), // inclui alimentação e transporte
      taxa_ocupacao_media: taxaOcupacao,
      temporada: randomItem(temporadas),
      meio_transporte: randomItem(meiosTransporte),
      distancia_km: destinoNac ? randomRange(300, 4000) : randomRange(8000, 20000),
      avaliacao_media: randomFloat(2.5, 5.0, 1),
      total_avaliacoes: randomRange(10, 10000),
      cidade_origem: randomItem(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Campinas', 'Florianópolis']),
      uf_origem: estado.uf,
      data_viagem: randomDate(2024, 2025),
      data_reserva: gerarDataRegistro(recordCount, i),
      agente: gerarNomeCompleto(),
      telefone_contato: gerarTelefone()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Moda
 */
function generateModa(recordCount = 150) {
  const data = [];
  const tamanhos = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', '48'];
  const marcas = ['Nike', 'Adidas', 'Zara', 'Renner', 'C&A', 'Marisa', 'Lojas Riachuelo', 'Reserva', 'Hering', 'Levis', 'Colcci', 'Puma', 'Vans', 'Oakley', 'Lacoste'];
  const generos = ['Masculino', 'Feminino', 'Unissex'];

  for (let i = 0; i < recordCount; i++) {
    const categoria = randomItem(MODA.categorias);
    const marca = randomItem(marcas);
    const material = randomItem(MODA.materiais);
    const precoCusto = gerarPrecoLogNormal(15, 800);
    const markup = randomFloat(2.0, 4.0);
    const precoVenda = Math.round(precoCusto * markup);

    data.push({
      id: i + 1,
      nome_produto: `${marca} ${categoria} ${material} - ${generos[Math.floor(Math.random() * generos.length)]}`,
      marca,
      categoria,
      subcategoria: categoria === 'Camisetas' ? randomItem(['Básica', 'Estampada', 'Polo', 'Regata', 'Manga Longa']) :
                    categoria === 'Calças Jeans' ? randomItem(['Skinny', 'Reto', 'Slim', 'Wide Leg', 'Bootcut']) :
                    categoria === 'Sapatos' ? randomItem(['Tênis', 'Sapato Social', 'Bota', 'Sandalha', 'Mocassim']) :
                    categoria === 'Vestidos' ? randomItem(['Longo', 'Curto', 'Midi', 'Tube', 'Envelope']) :
                    randomItem(['Clássico', 'Moderno', 'Esportivo', 'Social', 'Casual']),
      genero: randomItem(generos),
      material,
      tamanhos_disponiveis: randomItems(tamanhos, randomRange(3, 7)).join(', '),
      cor: randomItem(['Preto', 'Branco', 'Azul Petróleo', 'Vermelho', 'Verde Militar', 'Rosa', 'Bege', 'Marrom', 'Cinza', 'Caramelo']),
      preco_custo: precoCusto,
      preco_venda: precoVenda,
      margem_lucro_pct: parseFloat(((precoVenda - precoCusto) / precoVenda * 100).toFixed(1)),
      estoque: randomRange(0, 2000),
      vendas_ultimo_mes: randomRange(0, 500),
      avaliacao_media: randomFloat(2.0, 5.0, 1),
      frete_gratis: Math.random() > 0.6,
      tempo_entrega_dias: randomRange(2, 20),
      cidade_producao: randomItem(['São Paulo', 'Fortaleza', 'Belo Horizonte', 'Blumenau', 'Goiânia', 'Americana', 'Caruaru', 'Nova Friburgo']),
      data_cadastro: gerarDataRegistro(recordCount, i),
      fornecedor: gerarNomeCompleto()
    });
  }
  return data;
}

/**
 * Gera dataset para nicho de Energia
 */
function generateEnergia(recordCount = 150) {
  const data = [];
  const unidadesConsumidoras = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Poder Público'];

  for (let i = 0; i < recordCount; i++) {
    const fonte = randomItem(ENERGIA.fontes);
    const ufGerador = randomItem(ENERGIA.estadosGeradores);
    const estado = ESTADOS_BR.find(e => e.uf === ufGerador) || randomItem(ESTADOS_BR);
    const mes = randomRange(1, 12);
    const mesNome = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mes - 1];
    const ano = randomRange(2020, 2024);

    // Geração de energia em MWh por fonte
    const geracaoBase = {
      'Hidrelétrica': randomRange(50000, 200000),
      'Eólica': randomRange(20000, 80000),
      'Solar': randomRange(10000, 50000),
      'Biomassa': randomRange(8000, 30000),
      'Gás Natural': randomRange(30000, 120000),
      'Carvão Mineral': randomRange(20000, 70000),
      'Petróleo': randomRange(10000, 40000),
      'Nuclear': randomRange(40000, 100000)
    }[fonte] || randomRange(10000, 50000);

    const consumo = randomRange(100, 50000);
    const tarifaMedia = randomFloat(0.45, 0.95, 3);

    data.push({
      id: i + 1,
      fonte_energia: fonte,
      tipo_fonte: ['Hidrelétrica', 'Eólica', 'Solar', 'Biomassa'].includes(fonte) ? 'Renovável' : 'Não Renovável',
      capacidade_instalada_mw: Math.round(geracaoBase / 100),
      geracao_mwh: geracaoBase,
      consumo_mwh: consumo,
      tarifa_media_kwh: tarifaMedia,
      receita_estimada: Math.round(consumo * tarifaMedia * 1000),
      mes_referencia: mesNome,
      ano,
      trimestre: `Q${Math.ceil(mes / 3)}-${ano}`,
      uf_geracao: ufGerador,
      estado_geracao: estado.nome,
      regiao: estado.regiao,
      tipo_consumidor: randomItem(unidadesConsumidoras),
      numero_consumidores: randomRange(1000, 500000),
      perda_distribuicao_pct: randomFloat(2, 20, 1),
      investimento_expansao: Math.round(randomRange(100000, 5000000)),
      data_coleta: randomDate(2020, 2024),
      operadora: randomItem(['Eletrobras', 'CPFL', 'CEMIG', 'Light', 'Eletropaulo', 'Copel', 'Celesc', 'Coelba', 'Celpe', 'Cemar'])
    });
  }
  return data;
}

// ===================== NICHE DEFINITIONS =====================

/**
 * Define os 10 nichos de dataset com seus geradores e metadados
 */
const NICHE_GENERATORS = {
  'imoveis-sp': {
    name: 'Mercado Imobiliário de São Paulo',
    slug: 'imoveis-sp',
    description: 'Dataset completo com preços, localização e características de imóveis na cidade de São Paulo e Rio de Janeiro.',
    price: 'R$ 49,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Mercado Imobiliário',
    tags: ['imóveis', 'preços', 'SP', 'RJ', 'moradia', 'investimento'],
    recordCount: 250,
    generator: generateImoveis,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      titulo: { type: 'string', description: 'Título do anúncio' },
      tipo: { type: 'string', enum: ['Apartamento', 'Casa', 'Cobertura', 'Kitnet', 'Studio', 'Sobrado'], description: 'Tipo do imóvel' },
      area_m2: { type: 'number', description: 'Área em metros quadrados' },
      quartos: { type: 'integer', description: 'Número de quartos' },
      banheiros: { type: 'integer', description: 'Número de banheiros' },
      preco: { type: 'number', description: 'Preço de venda (R$)' },
      preco_m2: { type: 'number', description: 'Preço por metro quadrado (R$)' },
      bairro: { type: 'string', description: 'Bairro do imóvel' },
      cidade: { type: 'string', description: 'Cidade' },
      uf: { type: 'string', description: 'Unidade Federativa' },
      regiao: { type: 'string', description: 'Região geográfica' },
      data_registro: { type: 'date', description: 'Data de registro do anúncio' }
    },
    target: 'Profissionais do mercado imobiliário, investidores, corretores, estudantes de economia.'
  },
  'veiculos-usados': {
    name: 'Veículos Usados',
    slug: 'veiculos-usados',
    description: 'Dataset com anúncios de veículos usados em todo o Brasil: marcas, modelos, preços, quilometragem e condições.',
    price: 'R$ 39,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Automotivo',
    tags: ['carros', 'veículos', 'preços', 'marcas', 'usados'],
    recordCount: 250,
    generator: generateVeiculos,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      titulo: { type: 'string', description: 'Título do anúncio' },
      marca: { type: 'string', description: 'Marca do veículo' },
      modelo: { type: 'string', description: 'Modelo do veículo' },
      ano_fabricacao: { type: 'integer', description: 'Ano de fabricação' },
      quilometragem: { type: 'integer', description: 'Quilometragem rodada' },
      combustivel: { type: 'string', description: 'Tipo de combustível' },
      transmissao: { type: 'string', description: 'Tipo de transmissão' },
      cor: { type: 'string', description: 'Cor predominante' },
      preco: { type: 'number', description: 'Preço de venda (R$)' },
      cidade: { type: 'string', description: 'Cidade do anúncio' },
      uf: { type: 'string', description: 'Unidade Federativa' },
      data_registro: { type: 'date', description: 'Data do anúncio' }
    },
    target: 'Compradores e vendedores de veículos, seguradoras, financeiras, pesquisadores de mercado automotivo.'
  },
  'ecommerce': {
    name: 'Produtos E-commerce',
    slug: 'ecommerce',
    description: 'Dataset de produtos eletrônicos, informática e casa com preços, avaliações e dados de venda.',
    price: 'R$ 44,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'E-commerce',
    tags: ['produtos', 'preços', 'eletrônicos', 'informática', 'avaliações'],
    recordCount: 250,
    generator: generateEcommerce,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      nome: { type: 'string', description: 'Nome do produto' },
      categoria: { type: 'string', description: 'Categoria principal' },
      preco_venda: { type: 'number', description: 'Preço de venda (R$)' },
      preco_custo: { type: 'number', description: 'Preço de custo (R$)' },
      margem_lucro: { type: 'number', description: 'Margem de lucro (%)' },
      estoque_atual: { type: 'integer', description: 'Quantidade em estoque' },
      avaliacao_media: { type: 'number', description: 'Avaliação média (1-5)' },
      total_avaliacoes: { type: 'integer', description: 'Total de avaliações' },
      vendedor: { type: 'string', description: 'Nome do vendedor' },
      cidade: { type: 'string', description: 'Cidade do vendedor' },
      data_cadastro: { type: 'date', description: 'Data de cadastro' }
    },
    target: 'Lojistas, marketplaces, analistas de precificação, profissionais de e-commerce.'
  },
  'empregos-ti': {
    name: 'Vagas de Tecnologia',
    slug: 'empregos-ti',
    description: 'Dataset de vagas de emprego em tecnologia: cargos, salários, empresas e requisitos.',
    price: 'R$ 44,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Recursos Humanos',
    tags: ['vagas', 'TI', 'salários', 'carreira', 'tecnologia'],
    recordCount: 200,
    generator: generateEmpregosTI,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      titulo: { type: 'string', description: 'Título da vaga' },
      cargo: { type: 'string', description: 'Nome do cargo' },
      nivel: { type: 'string', description: 'Nível hierárquico' },
      empresa: { type: 'string', description: 'Nome da empresa' },
      salario_medio: { type: 'number', description: 'Salário médio (R$)' },
      modalidade: { type: 'string', description: 'Presencial/Híbrido/Remoto' },
      tipo_contrato: { type: 'string', description: 'CLT/PJ/Estágio' },
      cidade: { type: 'string', description: 'Cidade da vaga' },
      data_publicacao: { type: 'date', description: 'Data de publicação' },
      candidatos_inscritos: { type: 'integer', description: 'Total de candidatos' }
    },
    target: 'Profissionais de TI, recrutadores, RH, headhunters, empresas de tecnologia.'
  },
  'restaurantes': {
    name: 'Avaliações de Restaurantes',
    slug: 'restaurantes',
    description: 'Dataset de restaurantes com avaliações, preços médios, tipos de cozinha e localização.',
    price: 'R$ 34,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Alimentação',
    tags: ['restaurantes', 'avaliações', 'gastronomia', 'preços', 'culinária'],
    recordCount: 200,
    generator: generateRestaurantes,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      nome: { type: 'string', description: 'Nome do restaurante' },
      tipo_cozinha: { type: 'string', description: 'Tipo de culinária' },
      nota_media: { type: 'number', description: 'Nota média das avaliações' },
      preco_medio: { type: 'number', description: 'Preço médio por pessoa (R$)' },
      total_avaliacoes: { type: 'integer', description: 'Total de avaliações' },
      bairro: { type: 'string', description: 'Bairro' },
      cidade: { type: 'string', description: 'Cidade' },
      capacidade_pessoas: { type: 'integer', description: 'Capacidade máxima' },
      estrela_michelin: { type: 'integer', description: 'Estrelas Michelin (0 se não tem)' }
    },
    target: 'Donos de restaurantes, críticos gastronômicos, investidores do setor alimentício, food lovers.'
  },
  'fitness': {
    name: 'Academias e Fitness',
    slug: 'fitness',
    description: 'Dataset de academias, estúdios e centros de fitness com mensalidades, avaliações e infraestrutura.',
    price: 'R$ 29,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Saúde & Bem-Estar',
    tags: ['academias', 'fitness', 'mensalidades', 'saúde', 'exercício'],
    recordCount: 150,
    generator: generateFitness,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      nome: { type: 'string', description: 'Nome da academia' },
      tipo_modalidade: { type: 'string', description: 'Modalidade principal' },
      mensalidade: { type: 'number', description: 'Valor da mensalidade (R$)' },
      total_alunos: { type: 'integer', description: 'Total de alunos matriculados' },
      avaliacao_media: { type: 'number', description: 'Avaliação média (1-5)' },
      cidade: { type: 'string', description: 'Cidade' },
      area_m2: { type: 'number', description: 'Área em metros quadrados' },
      data_inauguracao: { type: 'date', description: 'Data de inauguração' }
    },
    target: 'Donos de academia, personal trainers, profissionais de educação física, investidores.'
  },
  'agricultura': {
    name: 'Produção Agrícola Brasileira',
    slug: 'agricultura',
    description: 'Dataset de produção agrícola por cultura, estado: áreas plantadas, produtividade, preços e safras.',
    price: 'R$ 49,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Agronegócio',
    tags: ['agricultura', 'safras', 'preços', 'produção', 'agronegócio'],
    recordCount: 200,
    generator: generateAgricultura,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      cultura: { type: 'string', description: 'Cultura agrícola' },
      safra: { type: 'integer', description: 'Ano safra' },
      area_plantada_ha: { type: 'number', description: 'Área plantada em hectares' },
      producao_total: { type: 'number', description: 'Produção total na unidade' },
      produtividade_ha: { type: 'number', description: 'Produtividade por hectare' },
      preco_por_unidade: { type: 'number', description: 'Preço por unidade (R$)' },
      receita_estimada: { type: 'number', description: 'Receita estimada (R$)' },
      municipio: { type: 'string', description: 'Município produtor' },
      uf: { type: 'string', description: 'Unidade Federativa' },
      tipo_solo: { type: 'string', description: 'Tipo de solo predominante' }
    },
    target: 'Produtores rurais, cooperativas, traders de commodities, analistas de agronegócio.'
  },
  'turismo': {
    name: 'Pacotes de Viagem e Turismo',
    slug: 'turismo',
    description: 'Dataset de destinos turísticos, hospedagens, preços e avaliações para planejamento de viagens.',
    price: 'R$ 39,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Turismo',
    tags: ['turismo', 'viagens', 'hospedagem', 'destinos', 'preços'],
    recordCount: 150,
    generator: generateTurismo,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      destino: { type: 'string', description: 'Nome do destino' },
      tipo_destino: { type: 'string', description: 'Nacional/Internacional' },
      tipo_hospedagem: { type: 'string', description: 'Tipo de hospedagem' },
      diarias: { type: 'integer', description: 'Número de diárias' },
      preco_por_noite: { type: 'number', description: 'Preço por diária (R$)' },
      custo_total_estimado: { type: 'number', description: 'Custo total estimado (R$)' },
      taxa_ocupacao_media: { type: 'number', description: 'Taxa de ocupação média (%)' },
      avaliacao_media: { type: 'number', description: 'Avaliação média (1-5)' },
      temporada: { type: 'string', description: 'Temporada (Baixa/Média/Alta)' }
    },
    target: 'Agências de viagem, hoteleiros, turistas, operadores turísticos, investidores.'
  },
  'moda': {
    name: 'Produtos de Moda e Vestuário',
    slug: 'moda',
    description: 'Dataset de produtos de moda: roupas, calçados e acessórios com preços, marcas e avaliações.',
    price: 'R$ 34,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Moda & Vestuário',
    tags: ['moda', 'roupas', 'preços', 'marcas', 'vestuário'],
    recordCount: 200,
    generator: generateModa,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      nome_produto: { type: 'string', description: 'Nome do produto' },
      marca: { type: 'string', description: 'Marca' },
      categoria: { type: 'string', description: 'Categoria do produto' },
      genero: { type: 'string', description: 'Gênero alvo' },
      material: { type: 'string', description: 'Material predominante' },
      preco_venda: { type: 'number', description: 'Preço de venda (R$)' },
      estoque: { type: 'integer', description: 'Quantidade em estoque' },
      vendas_ultimo_mes: { type: 'integer', description: 'Vendas no último mês' },
      avaliacao_media: { type: 'number', description: 'Avaliação média (1-5)' },
      data_cadastro: { type: 'date', description: 'Data de cadastro' }
    },
    target: 'Lojistas de moda, estilistas, e-commerces de vestuário, analistas de tendências.'
  },
  'energia': {
    name: 'Matriz Energética Brasileira',
    slug: 'energia',
    description: 'Dataset de geração e consumo de energia por fonte, estado e mês: capacidade, tarifas e investimentos.',
    price: 'R$ 49,90',
    currency: 'BRL',
    version: '1.0.0',
    category: 'Energia',
    tags: ['energia', 'elétrica', 'fontes', 'consumo', 'sustentabilidade'],
    recordCount: 200,
    generator: generateEnergia,
    schema: {
      id: { type: 'integer', description: 'Identificador único' },
      fonte_energia: { type: 'string', description: 'Fonte de energia' },
      tipo_fonte: { type: 'string', description: 'Renovável/Não Renovável' },
      capacidade_instalada_mw: { type: 'number', description: 'Capacidade instalada (MW)' },
      geracao_mwh: { type: 'number', description: 'Geração no período (MWh)' },
      consumo_mwh: { type: 'number', description: 'Consumo no período (MWh)' },
      tarifa_media_kwh: { type: 'number', description: 'Tarifa média (R$/kWh)' },
      mes_referencia: { type: 'string', description: 'Mês de referência' },
      ano: { type: 'integer', description: 'Ano de referência' },
      uf_geracao: { type: 'string', description: 'UF de geração' },
      regiao: { type: 'string', description: 'Região geográfica' }
    },
    target: 'Engenheiros de energia, analistas de sustentabilidade, governo, investidores do setor elétrico.'
  }
};

// ===================== KAGGLE METADATA GENERATOR =====================

/**
 * Gera metadados no formato Kaggle (datapackage.json)
 */
function generateKaggleMetadata(nicheKey, nicheConfig, data) {
  const now = new Date().toISOString();
  const fields = data.length > 0 ? Object.keys(data[0]).map(key => {
    const schemaField = nicheConfig.schema[key] || {};
    const sample = data[0][key];
    let type = schemaField.type || typeof sample === 'number' ? 'number' : 'string';
    if (type === 'integer') type = 'integer';
    else if (type === 'number') type = 'number';
    else type = 'string';

    return {
      name: key,
      type: type === 'integer' ? 'integer' : type === 'number' ? 'number' : 'string',
      description: schemaField.description || `${key} field`
    };
  }) : [];

  // Estatísticas básicas para metadados
  const numericFields = {};
  const categoricalFields = {};

  if (data.length > 0) {
    Object.keys(data[0]).forEach(key => {
      const values = data.map(r => r[key]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return;

      if (typeof values[0] === 'number') {
        numericFields[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
        };
      } else if (typeof values[0] === 'string') {
        const freq = {};
        values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
        const topEntries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
        categoricalFields[key] = {
          unique_count: Object.keys(freq).length,
          top_values: topEntries.map(([k, v]) => ({ value: k, count: v }))
        };
      }
    });
  }

  return {
    title: nicheConfig.name,
    id: `datasales-${nicheKey}`,
    description: nicheConfig.description,
    license: 'CC-BY-4.0',
    version: nicheConfig.version,
    created: now,
    updated: now,
    url: `https://kaggle.com/datasets/datasales/${nicheKey}`,
    dataset: {
      total_records: data.length,
      total_fields: fields.length,
      file_size_estimate_bytes: data.length * fields.length * 50,
      format: ['JSON', 'CSV']
    },
    fields,
    features: {
      numeric: numericFields,
      categorical: categoricalFields
    },
    suitability: {
      use_cases: [
        'Treinamento de modelos de machine learning',
        'Análise exploratória de dados',
        'Pesquisa acadêmica e científica',
        'Dashboards e visualizações',
        'Estudos de mercado e tendências'
      ],
      algorithms: [
        'Regressão linear e polinomial',
        'Árvores de decisão e Random Forest',
        'Redes neurais',
        'Análise de cluster (K-means, DBSCAN)',
        'Séries temporais (ARIMA, Prophet)'
      ]
    },
    target_audience: nicheConfig.target || 'Profissionais, pesquisadores e entusiastas.',
    tags: nicheConfig.tags || ['dataset', 'brasil'],
    version_history: [
      {
        version: nicheConfig.version,
        date: now,
        changes: 'Versão inicial do dataset gerado automaticamente.'
      }
    ]
  };
}

// ===================== SUMMARY GENERATOR =====================

/**
 * Gera sumário executivo detalhado com estatísticas realistas
 */
function generateSummary(data, nicheKey) {
  if (!data || data.length === 0) {
    return { error: 'No data available', totalRecords: 0 };
  }

  const numericFields = {};
  const categoricalFields = {};
  const dateFields = {};
  const nullCounts = {};
  const fields = Object.keys(data[0]);

  fields.forEach(field => {
    const values = data.map(r => r[field]).filter(v => v !== null && v !== undefined && v !== '');
    nullCounts[field] = data.length - values.length;

    if (values.length === 0) return;

    if (typeof values[0] === 'number') {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      numericFields[field] = {
        count: values.length,
        nulls: nullCounts[field],
        min: Math.min(...values),
        max: Math.max(...values),
        mean: parseFloat(mean.toFixed(2)),
        median: sorted.length % 2 === 0
          ? parseFloat(((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(2))
          : parseFloat(sorted[Math.floor(sorted.length / 2)].toFixed(2)),
        std: parseFloat(stdDev.toFixed(2)),
        q1: parseFloat(sorted[Math.floor(sorted.length * 0.25)].toFixed(2)),
        q3: parseFloat(sorted[Math.floor(sorted.length * 0.75)].toFixed(2)),
        histogram: criarHistograma(values, 10)
      };
    } else if (typeof values[0] === 'string') {
      const freq = {};
      values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

      categoricalFields[field] = {
        count: values.length,
        nulls: nullCounts[field],
        unique: Object.keys(freq).length,
        top: sorted.slice(0, 10).map(([k, v]) => ({
          value: k,
          count: v,
          percentage: parseFloat(((v / values.length) * 100).toFixed(1))
        }))
      };
    } else if (values[0] instanceof Date || (typeof values[0] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(values[0]))) {
      const dates = values.map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const sorted = dates.sort((a, b) => a - b);
        dateFields[field] = {
          count: dates.length,
          min: sorted[0].toISOString().split('T')[0],
          max: sorted[sorted.length - 1].toISOString().split('T')[0],
          range_days: Math.round((sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24))
        };
      }
    }
  });

  // Qualidade geral
  const totalCells = data.length * fields.length;
  const totalNulls = Object.values(nullCounts).reduce((a, b) => a + b, 0);
  const completeness = totalCells > 0 ? ((totalCells - totalNulls) / totalCells * 100) : 0;
  const qualityScore = Math.round(Math.min(100, completeness * 1.1 + (Object.keys(numericFields).length > 0 ? 5 : 0)));

  // Distribuição geográfica (se houver campos de localização)
  const geoDistribution = {};
  ['uf', 'UF', 'estado', 'cidade', 'cidade', 'regiao', 'regiao'].forEach(key => {
    if (!geoDistribution[key] && categoricalFields[key]) {
      geoDistribution.nivel = key;
      geoDistribution.distribuicao = categoricalFields[key].top;
    }
  });

  return {
    project: nicheKey,
    generatedAt: new Date().toISOString(),
    totalRecords: data.length,
    totalFields: fields.length,
    quality: {
      completeness: parseFloat(completeness.toFixed(1)),
      nullPercentage: parseFloat((totalNulls / totalCells * 100).toFixed(1)),
      score: qualityScore,
      classification: qualityScore >= 90 ? 'Excelente' : qualityScore >= 80 ? 'Bom' : qualityScore >= 70 ? 'Regular' : 'Ruim'
    },
    numericFields,
    categoricalFields,
    dateFields,
    geographicDistribution: geoDistribution,
    sampleRecords: data.slice(0, 5),
    fieldNullCounts: nullCounts
  };
}

// ===================== EXPORT FUNCTIONS =====================

/**
 * Exporta dataset para CSV
 */
async function exportToCSV(data, outputPath) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const fields = Object.keys(data[0]);
  const csvHeader = fields.join(',');
  const csvRows = data.map(record => {
    return fields.map(field => {
      let value = record[field];
      if (value === null || value === undefined) return '';
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  // Ensure BOM for proper Excel encoding of Brazilian data
  const bom = '\uFEFF';
  await fs.writeFile(outputPath, bom + csvContent, 'utf-8');
  return outputPath;
}

/**
 * Exporta dataset para JSON
 */
async function exportToJSON(data, outputPath) {
  await fs.writeJSON(outputPath, data, { spaces: 2 });
  return outputPath;
}

/**
 * Exporta metadados Kaggle
 */
async function exportKaggleMetadata(metadata, outputPath) {
  await fs.writeJSON(outputPath, metadata, { spaces: 2 });
  return outputPath;
}

/**
 * Exporta sumário
 */
async function exportSummary(summary, outputPath) {
  await fs.writeJSON(outputPath, summary, { spaces: 2 });
  return outputPath;
}

// ===================== ORCHESTRATOR =====================

/**
 * Lê a configuração de nichos de dataset
 * Tenta ler nichos-dataset.json primeiro, usa fallback interno
 */
async function readNiches(nichosPath) {
  try {
    if (await fs.pathExists(nichosPath)) {
      const content = await fs.readJSON(nichosPath);
      if (content && content.niches && Array.isArray(content.niches)) {
        log.success(`Carregados ${content.niches.length} nichos de ${nichosPath}`);
        return content.niches.map(n => {
          // Mapeia para o formato interno
          const generatorEntry = NICHE_GENERATORS[n.slug];
          if (generatorEntry) {
            return {
              ...generatorEntry,
              recordCount: n.recordCount || generatorEntry.recordCount,
              price: n.price || generatorEntry.price,
              description: n.description || generatorEntry.description
            };
          }
          return n;
        });
      }
      log.warn('nichos-dataset.json inválido, usando fallback interno');
    } else {
      log.info('nichos-dataset.json não encontrado, usando configuração padrão com 10 nichos');
    }
  } catch (err) {
    log.warn(`Erro ao ler ${nichosPath}: ${err.message}. Usando configuração padrão.`);
  }

  // Fallback: retorna todos os nichos internos
  return Object.entries(NICHE_GENERATORS).map(([key, config]) => ({
    ...config,
    slug: key
  }));
}

/**
 * Função principal: gera todos os datasets realistas
 * @param {Object} [options] - Opções de configuração
 * @param {string} [options.outputDir='./output/datasets'] - Diretório base de saída
 * @param {number} [options.recordCount] - Sobrescreve contagem de registros para todos nichos
 * @param {string} [options.nichesPath='./config/nichos-dataset.json'] - Caminho do config
 * @param {string[]} [options.onlyNiches] - Lista de slugs para gerar apenas alguns nichos
 * @returns {Object} Relatório com resultados
 */
async function generateAllDatasets(options = {}) {
  log.section('🏭 DATA FACTORY - GERADOR DE DATASETS REALISTAS');

  const outputDir = path.resolve(options.outputDir || './output/datasets');
  const nichosPath = path.resolve(options.nichesPath || './config/nichos-dataset.json');
  const startTime = Date.now();

  // 1. Carrega nichos
  const allNiches = await readNiches(nichosPath);

  // Filtra se especificado
  const niches = options.onlyNiches
    ? allNiches.filter(n => options.onlyNiches.includes(n.slug))
    : allNiches;

  if (niches.length === 0) {
    log.error('Nenhum nicho para gerar datasets.');
    return null;
  }

  log.info(`${niches.length} nichos para processar`);
  log.info(`Diretório de saída: ${outputDir}\n`);

  await fs.ensureDir(outputDir);

  const results = [];
  let totalRecords = 0;
  let errors = [];

  // 2. Processa cada nicho
  for (let idx = 0; idx < niches.length; idx++) {
    const niche = niches[idx];
    const nicheSlug = niche.slug;
    const nicheDir = path.join(outputDir, nicheSlug);
    const recordCount = options.recordCount || niche.recordCount || 200;

    const spinner = ora(`[${idx + 1}/${niches.length}] ${niche.name} (${recordCount} registros)...`).start();

    try {
      // Gera dados realistas
      const generator = niche.generator || NICHE_GENERATORS[nicheSlug]?.generator;
      if (!generator) {
        throw new Error(`Nenhum generator encontrado para o nicho: ${nicheSlug}`);
      }

      const data = generator(recordCount);
      totalRecords += data.length;

      // Cria diretório do nicho
      await fs.ensureDir(nicheDir);

      // Exporta JSON
      const jsonPath = path.join(nicheDir, 'dataset.json');
      await exportToJSON(data, jsonPath);

      // Exporta CSV
      const csvPath = path.join(nicheDir, 'dataset.csv');
      await exportToCSV(data, csvPath);

      // Gera metadados Kaggle
      const kaggleMetadata = generateKaggleMetadata(nicheSlug, niche, data, nicheDir);
      const kagglePath = path.join(nicheDir, 'kaggle-metadata.json');
      await exportKaggleMetadata(kaggleMetadata, kagglePath);

      // Gera sumário
      const summary = generateSummary(data, nicheSlug);
      const summaryPath = path.join(nicheDir, 'summary.json');
      await exportSummary(summary, summaryPath);

      spinner.succeed(`${niche.name}: ${data.length} registros → ${nicheSlug}/`);

      results.push({
        slug: nicheSlug,
        name: niche.name,
        records: data.length,
        files: {
          json: jsonPath,
          csv: csvPath,
          kaggle: kagglePath,
          summary: summaryPath
        },
        summary
      });

    } catch (err) {
      spinner.fail(`${niche.name}: ERRO - ${err.message}`);
      errors.push({ slug: nicheSlug, error: err.message });
    }
  }

  // 3. Relatório final
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalFiles = results.length * 4; // 4 arquivos por nicho

  log.section('📋 RELATÓRIO FINAL');
  log.success(`⏱️  Tempo total: ${elapsed}s`);
  log.success(`📊 Total de registros gerados: ${totalRecords}`);
  log.success(`📁 Total de arquivos: ${totalFiles}`);
  log.success(`✅ Nichos processados: ${results.length}`);
  if (errors.length > 0) {
    log.warn(`❌ Nichos com erro: ${errors.length}`);
    errors.forEach(e => log.error(`  - ${e.slug}: ${e.error}`));
  }

  // Mostra tabela de resultados
  console.log('');
  console.log(chalk.bold('📊 RESULTADOS POR NICHO:'));
  console.log(chalk.dim('  ' + '─'.repeat(60)));
  console.log(chalk.dim('  ' + 'Nicho'.padEnd(35) + 'Registros'.padEnd(15) + 'Status'));
  console.log(chalk.dim('  ' + '─'.repeat(60)));

  results.forEach(r => {
    const name = r.name.length > 33 ? r.name.substring(0, 30) + '...' : r.name;
    console.log(`  ${name.padEnd(35)} ${String(r.records).padEnd(15)} ✅`);
  });

  if (errors.length > 0) {
    errors.forEach(e => {
      console.log(`  ${e.slug.padEnd(35)} ${''.padEnd(15)} ❌`);
    });
  }

  console.log(chalk.dim('  ' + '─'.repeat(60)));
  console.log('');

  // Gera índice geral
  const index = {
    generatedAt: new Date().toISOString(),
    totalNiches: results.length,
    totalRecords,
    totalFiles,
    errors: errors.length,
    results: results.map(r => ({
      slug: r.slug,
      name: r.name,
      records: r.records,
      quality: r.summary?.quality?.score || 0
    }))
  };
  const indexPath = path.join(outputDir, 'index.json');
  await fs.writeJSON(indexPath, index, { spaces: 2 });
  log.success(`Índice geral salvo: ${indexPath}`);

  log.success('\n🏭 Data Factory concluído com sucesso!');

  return {
    success: results,
    errors,
    totalRecords,
    totalFiles,
    elapsed,
    outputDir
  };
}

// ===================== STANDALONE EXECUTION =====================

/**
 * Execução via linha de comando
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI args
  args.forEach((arg, i) => {
    if (arg === '--output' && args[i + 1]) {
      options.outputDir = args[i + 1];
    }
    if (arg === '--records' && args[i + 1]) {
      options.recordCount = parseInt(args[i + 1]);
    }
    if (arg === '--niches' && args[i + 1]) {
      options.nichesPath = args[i + 1];
    }
    if (arg === '--only' && args[i + 1]) {
      options.onlyNiches = args[i + 1].split(',');
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`
🏭 Data Factory - Gerador Realista de Datasets

USO:
  node modules/dataFactory.js [opções]

OPÇÕES:
  --output <dir>    Diretório de saída (padrão: ./output/datasets)
  --records <n>     Total de registros por dataset (sobrescreve padrão)
  --niches <path>   Caminho do arquivo nichos-dataset.json
  --only <slugs>    Apenas nichos específicos (ex: imoveis-sp,veiculos-usados)
  --help, -h        Mostra esta ajuda

EXEMPLOS:
  node modules/dataFactory.js
  node modules/dataFactory.js --output ./meus-datasets
  node modules/dataFactory.js --records 500
  node modules/dataFactory.js --only imoveis-sp,veiculos-usados
      `);
      process.exit(0);
    }
  });

  const result = await generateAllDatasets(options);

  if (!result) {
    process.exit(1);
  }

  // Mostra próximos passos
  console.log(chalk.bold('\n📌 PRÓXIMOS PASSOS:'));
  console.log(chalk.dim('  1. Explore os datasets em:'), result.outputDir);
  console.log(chalk.dim('  2. Faça upload dos CSVs para o Kaggle'));
  console.log(chalk.dim('  3. Use os dados nas landing pages'));
  console.log(chalk.dim('  4. Publique na Dataset Store\n'));
}

// Se executado diretamente
const isMainModule = process.argv[1] && (
  process.argv[1].includes('dataFactory') ||
  process.argv[1].endsWith('/dataFactory.js') ||
  process.argv[1].endsWith('\\dataFactory.js')
);

if (isMainModule) {
  main();
}

// ===================== EXPORTS =====================

export {
  generateAllDatasets,
  generateImoveis,
  generateVeiculos,
  generateEcommerce,
  generateEmpregosTI,
  generateRestaurantes,
  generateFitness,
  generateAgricultura,
  generateTurismo,
  generateModa,
  generateEnergia,
  generateSummary,
  generateKaggleMetadata,
  exportToCSV,
  exportToJSON,
  NICHE_GENERATORS
};