/**
 * 🚀 PILAR 4 — API de Sentimento PT-BR (pay-per-call, RapidAPI-ready)
 *
 * Endpoints:
 *   GET  /health                → status (público)
 *   POST /v1/analisar           → análise de 1 texto (requer API key)
 *   POST /v1/analisar-lote      → análise de até 100 textos (requer API key)
 *   GET  /v1/uso                → consumo da API key (requer API key)
 *
 * Monetização:
 *   - Local: chaves em keys.json (criadas automaticamente na 1ª execução)
 *   - RapidAPI: suba este serviço (Render/Railway/Fly.io) e liste no marketplace;
 *     o RapidAPI injeta o header X-RapidAPI-Key — o middleware aceita nativamente.
 *
 * Uso:
 *   npm install
 *   npm start          → http://localhost:3000
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { analisar, analisarLote } from './sentiment-ptbr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTA = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'keys.json');

// === GERENCIAMENTO DE CHAVES (pay-per-call) ===
function carregarKeys() {
  if (!fs.existsSync(KEYS_FILE)) {
    const inicial = {
      chaves: {
        demo: { key: 'demo-key-gratuita', plano: 'demo', limiteMensal: 100, uso: 0, criadaEm: new Date().toISOString() }
      },
      observacao: 'Gere chaves pagas com: node server.js --criar-key email@cliente.com pro'
    };
    fs.writeFileSync(KEYS_FILE, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
}

function salvarKeys(db) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(db, null, 2));
}

// Criação de chave via CLI: node server.js --criar-key cliente@email.com pro
const args = process.argv.slice(2);
if (args.includes('--criar-key')) {
  const email = args[args.indexOf('--criar-key') + 1];
  const plano = args[args.indexOf('--criar-key') + 2] || 'basico';
  const limites = { demo: 100, basico: 5000, pro: 50000, enterprise: 500000 };
  const db = carregarKeys();
  const key = `sk-ptbr-${crypto.randomBytes(16).toString('hex')}`;
  db.chaves[email] = { key, plano, limiteMensal: limites[plano] || 5000, uso: 0, criadaEm: new Date().toISOString() };
  salvarKeys(db);
  console.log(`\n✅ Chave criada para ${email} (plano ${plano}, limite ${limites[plano]}/mês):\n\n   ${key}\n`);
  process.exit(0);
}

const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Rate limit excedido. Tente novamente em instantes.' },
});

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// === MIDDLEWARE DE AUTENTICAÇÃO + CONTROLE DE USO ===
function autenticar(req, res, next) {
  // Aceita header próprio OU header do RapidAPI (quando listado no marketplace)
  const key = req.headers['x-api-key'] || req.headers['x-rapidapi-key'];
  if (!key) {
    return res.status(401).json({ erro: 'API key ausente. Envie header X-API-Key.', docs: 'https://rapidapi.com/SEU-USUARIO/api/sentimento-ptbr' });
  }

  const db = carregarKeys();
  const conta = Object.values(db.chaves).find(c => c.key === key);
  if (!conta) return res.status(403).json({ erro: 'API key inválida.' });

  if (conta.uso >= conta.limiteMensal) {
    return res.status(429).json({ erro: 'Limite mensal atingido.', plano: conta.plano, limite: conta.limiteMensal, upgrade: 'Fale conosco para migrar de plano.' });
  }

  conta.uso += 1;
  salvarKeys(db);
  req.conta = conta;
  next();
}

// === APP ===
const app = express();
app.disable('x-powered-by');
app.use(apiRateLimit);
app.use(express.json({ limit: '1mb' }));

// CORS aberto (APIs públicas de marketplace precisam disso)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-RapidAPI-Key, X-RapidAPI-Host');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servico: 'sentimento-ptbr', versao: '1.0.0', ts: new Date().toISOString() });
});

app.post('/v1/analisar', autenticar, (req, res) => {
  const { texto } = req.body || {};
  if (!isText(texto)) return res.status(400).json({ erro: 'Campo "texto" deve ser uma string não-vazia.', exemplo: { texto: 'Adorei o atendimento!' } });
  const resultado = analisar(texto);
  res.json({ ...resultado, texto: texto.substring(0, 200) });
});

app.post('/v1/analisar-lote', autenticar, (req, res) => {
  const { textos } = req.body || {};
  if (!Array.isArray(textos) || textos.length === 0 || !textos.every(isText)) {
    return res.status(400).json({ erro: 'Campo "textos" deve ser um array não-vazio de strings.', exemplo: { textos: ['Ótimo!', 'Péssimo.'] } });
  }
  try {
    res.json(analisarLote(textos));
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.get('/v1/uso', autenticar, (req, res) => {
  const { plano, limiteMensal, uso } = req.conta;
  res.json({ plano, limiteMensal, usado: uso, restante: limiteMensal - uso });
});

// Documentação mínima na raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'API de Sentimento PT-BR 🇧🇷',
    descricao: 'Análise de sentimento especializada em português do Brasil: negações, intensificadores e expressões idiomáticas.',
    endpoints: {
      'POST /v1/analisar': '{ "texto": "..." } → sentimento, score, confiança',
      'POST /v1/analisar-lote': '{ "textos": [...] } → até 100 por chamada',
      'GET /v1/uso': 'consumo da sua chave'
    },
    autenticacao: 'Header X-API-Key (teste grátis: demo-key-gratuita)',
    exemploCurl: `curl -X POST http://localhost:${PORTA}/v1/analisar -H "Content-Type: application/json" -H "X-API-Key: demo-key-gratuita" -d "{\\"texto\\":\\"O atendimento não foi ruim, mas demorou demais\\"}"`
  });
});

app.listen(PORTA, () => {
  console.log(`\n🇧🇷 API Sentimento PT-BR rodando em http://localhost:${PORTA}`);
  console.log(`   Chave demo: demo-key-gratuita (100 chamadas/mês)`);
  console.log(`   Criar chave paga: node server.js --criar-key email@cliente.com pro\n`);
});
