/**
 * 💼 PILAR 5 — Micro-SaaS: Gerador de Contratos Jurídicos Básicos
 *
 * Stack: Express + HTML estático. Zero build, zero dependência pesada.
 * Modelo de negócio: assinatura (Stripe) — aqui rodando em modo demo.
 *
 * Fluxo de monetização real:
 *   1. Deploy no Render/Railway (plano free)
 *   2. Stripe Payment Link na landing (R$ 47/mês ou R$ 9,90/contrato avulso)
 *   3. Middleware de auth (aqui simulado com ?plano=pro)
 *
 * Uso:
 *   npm install && npm start → http://localhost:3100
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, listarTemplates } from './templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTA = process.env.PORT || 3100;
const app = express();
app.disable('x-powered-by');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lista templates disponíveis (alimenta o formulário dinâmico)
app.get('/api/templates', (req, res) => {
  res.json({ templates: listarTemplates() });
});

// Gera o contrato (determinístico — contrato não pode alucinar)
app.post('/api/gerar', async (req, res) => {
  const { templateId, dados, clausulasExtras } = req.body || {};
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return res.status(400).json({ erro: 'Campo "dados" deve ser um objeto.' });
  }

  const template = TEMPLATES[templateId];
  if (!template) {
    return res.status(400).json({ erro: 'Template inválido.', disponiveis: Object.keys(TEMPLATES) });
  }

  // Valida campos obrigatórios
  const faltantes = template.campos.filter(c => typeof dados[c] !== 'string' || !dados[c].trim());
  if (faltantes.length > 0) {
    return res.status(400).json({ erro: `Campos obrigatórios ausentes: ${faltantes.join(', ')}` });
  }

  let contrato = template.gerar({ ...dados, data: new Date().toLocaleDateString('pt-BR') });

  // Cláusulas extras personalizadas (texto livre do usuário — opcionalmente refinável via LLM)
  if (typeof clausulasExtras === 'string' && clausulasExtras.trim()) {
    contrato = contrato.replace(
      '⚠️',
      `CLÁUSULA ADICIONAL — DISPOSIÇÕES ESPECÍFICAS\n${clausulasExtras.trim()}\n\n⚠️`
    );
  }

  res.json({ contrato, template: template.nome, geradoEm: new Date().toISOString() });
});

app.listen(PORTA, () => {
  console.log(`\n💼 Micro-SaaS Contratos rodando em http://localhost:${PORTA}`);
  console.log(`   Templates: ${listarTemplates().map(t => t.id).join(', ')}\n`);
});
