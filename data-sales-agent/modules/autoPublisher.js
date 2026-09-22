/**
 * 📦 Módulo 4: Auto Publisher
 *
 * Responsabilidades:
 * - Gerar landing page individual para cada dataset (dark theme, preço R$,
 *   badges, tabela amostra, pagamento multi-plataforma)
 * - Gerar descrição Kaggle (listing-kaggle.md)
 * - Gerar descrição de produto para Gumroad/Hotmart
 * - Gerar PWA manifest e assets para a dataset-store
 *
 * Cada dataset da lista (gerada pelo dataFactory) recebe:
 *   data-sales-agent/output/datasets/[slug]/index.html
 *   data-sales-agent/output/datasets/[slug]/manifest.json
 *
 * Também gera o agregado:
 *   data-sales-agent/output/listing-kaggle.md
 *   data-sales-agent/output/product-descriptions.md
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

// ============================================================
//  LOGGING
// ============================================================
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━')),
};

// ============================================================
//  HELPERS
// ============================================================

/**
 * Formata valor numérico no padrão brasileiro (R$ 1.234,56)
 */
function formatBRL(value) {
  if (typeof value === 'number') {
    return 'R$ ' + value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (typeof value === 'string' && value.startsWith('R$')) return value;
  return 'R$ ' + String(value);
}

/**
 * Trunca texto para um número máximo de caracteres
 */
function truncate(text, max = 120) {
  if (!text || text.length <= max) return text || '';
  return text.slice(0, max).trimEnd() + '…';
}

/**
 * Escapa HTML para evitar injeção
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Gera cor complementar para badge/distinção baseada num hash do nome
 */
function hashColor(name, offset = 0) {
  let hash = offset;
  for (let i = 0; i < (name || '').length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Gera um placeholder SVG para gráfico (mini-sparkline visual)
 */
function chartPlaceholderSVG(width, height, label, datasetName) {
  const points = [];
  for (let i = 0; i < 8; i++) {
    const x = (i / 7) * (width - 40) + 20;
    const y = 20 + Math.random() * (height - 60);
    points.push(`${x},${y}`);
  }
  const polyline = points.join(' ');
  const color = hashColor(datasetName);
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="8" fill="#1e293b"/>
  <polyline points="${polyline}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="4" fill="${color}"/>
  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="Inter, sans-serif">${escapeHtml(label)}</text>
</svg>`;
}

// ============================================================
//  CSS — TEMA ESCURO MODERNO (autônomo, inline para cada página)
// ============================================================
function landingCSS(dataset) {
  const primary = hashColor(dataset.slug || dataset.name, 10);
  const secondary = hashColor(dataset.slug || dataset.name, 120);

  return `
/* ── reset & base ── */
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0b0f1a;
  color: #e2e8f0;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0b0f1a; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }

/* ── utilities ── */
.container { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }

/* ── navbar ── */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: rgba(11,15,26,0.85); backdrop-filter: blur(16px);
  border-bottom: 1px solid #1e293b;
  padding: 0.75rem 0;
  transition: background 0.3s;
}
.navbar .container { display: flex; align-items: center; justify-content: space-between; }
.navbar-brand {
  display: flex; align-items: center; gap: 0.6rem;
  font-weight: 700; font-size: 1rem; color: #f1f5f9;
  text-decoration: none;
}
.navbar-brand .brand-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, ${primary}, ${secondary});
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.navbar-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.navbar-links a {
  color: #94a3b8; text-decoration: none; font-size: 0.875rem;
  font-weight: 500; transition: color 0.2s;
}
.navbar-links a:hover { color: #f1f5f9; }
.navbar-cta {
  background: linear-gradient(135deg, ${primary}, ${secondary});
  color: #fff !important; padding: 0.4rem 1.2rem;
  border-radius: 8px; font-weight: 600 !important;
}
.mobile-btn { display: none; background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }

/* ── hero ── */
.hero {
  min-height: 100vh; display: flex; align-items: center;
  padding: 5rem 0 3rem; position: relative; overflow: hidden;
}
.hero-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse at 25% 40%, ${primary}18 0%, transparent 60%),
    radial-gradient(ellipse at 75% 60%, ${secondary}12 0%, transparent 50%);
}
.hero-content { position: relative; z-index: 1; text-align: center; max-width: 820px; margin: 0 auto; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: ${primary}18; border: 1px solid ${primary}35;
  color: ${primary}; padding: 0.35rem 1rem;
  border-radius: 100px; font-size: 0.8rem; font-weight: 600;
  margin-bottom: 1.5rem;
}
.hero h1 {
  font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 800; line-height: 1.15;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f1f5f9, ${primary});
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero p {
  font-size: 1.05rem; color: #94a3b8; max-width: 640px;
  margin: 0 auto 2rem; line-height: 1.7;
}
.hero-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

/* ── stats badges ── */
.stats-bar {
  display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;
  margin: 2rem 0;
}
.stat-badge {
  display: flex; align-items: center; gap: 0.4rem;
  background: #1e293b; border: 1px solid #334155;
  padding: 0.5rem 1rem; border-radius: 100px;
  font-size: 0.85rem; font-weight: 500;
}
.stat-badge .num { color: ${primary}; font-weight: 700; }
.stat-badge .lbl { color: #94a3b8; }

/* ── buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1.75rem; border-radius: 10px;
  font-weight: 600; font-size: 0.95rem;
  text-decoration: none; transition: all 0.25s; cursor: pointer; border: none;
}
.btn-primary {
  background: linear-gradient(135deg, ${primary}, ${secondary});
  color: #fff; box-shadow: 0 4px 14px ${primary}30;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${primary}40; }
.btn-secondary {
  background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
}
.btn-secondary:hover { border-color: ${primary}; background: ${primary}08; }
.btn-lg { padding: 0.9rem 2.2rem; font-size: 1rem; }
.btn-whatsapp { background: #25d366; color: #fff; }
.btn-whatsapp:hover { background: #20bd5a; transform: translateY(-2px); }
.btn-pix { background: linear-gradient(135deg, #00b4d8, #0077b6); color: #fff; }
.btn-pix:hover { transform: translateY(-2px); }

/* ── sections ── */
.section { padding: 4rem 0; }
.section-header { text-align: center; max-width: 680px; margin: 0 auto 2.5rem; }
.section-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; }
.section-header p { color: #94a3b8; font-size: 1rem; }

.section-alt { background: #0f172a; }

/* ── features grid ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}
.feature-card {
  background: #1e293b; border: 1px solid #334155;
  border-radius: 12px; padding: 1.75rem;
  transition: all 0.3s;
}
.feature-card:hover {
  border-color: ${primary}50; transform: translateY(-3px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
}
.feature-icon {
  width: 44px; height: 44px;
  background: ${primary}18; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; margin-bottom: 1rem;
}
.feature-card h3 { font-size: 1.05rem; font-weight: 600; margin-bottom: 0.5rem; }
.feature-card p { color: #94a3b8; font-size: 0.875rem; line-height: 1.55; }

/* ── sample table ── */
.table-wrapper {
  overflow-x: auto; border-radius: 12px;
  border: 1px solid #1e293b;
}
table.sample-table {
  width: 100%; border-collapse: collapse;
  font-size: 0.85rem;
}
table.sample-table thead {
  background: #1e293b;
}
table.sample-table th {
  padding: 0.75rem 1rem; text-align: left;
  font-weight: 600; color: #94a3b8; text-transform: uppercase;
  font-size: 0.75rem; letter-spacing: 0.04em;
  border-bottom: 1px solid #334155;
}
table.sample-table td {
  padding: 0.65rem 1rem; border-bottom: 1px solid #1e293b;
  color: #cbd5e1;
}
table.sample-table tbody tr:hover { background: #1e293b40; }
table.sample-table tbody tr:last-child td { border-bottom: none; }

/* ── pricing card ── */
.pricing-card {
  background: linear-gradient(145deg, #1e293b, #182335);
  border: 1px solid #334155; border-radius: 16px;
  padding: 2.5rem 2rem; text-align: center;
  max-width: 420px; margin: 0 auto;
  position: relative; overflow: hidden;
}
.pricing-card.featured { border-color: ${primary}; box-shadow: 0 0 30px ${primary}15; }
.pricing-badge {
  position: absolute; top: 1rem; right: -2rem;
  background: linear-gradient(135deg, ${primary}, ${secondary});
  color: #fff; padding: 0.25rem 2.8rem;
  font-size: 0.75rem; font-weight: 700;
  transform: rotate(45deg);
}
.pricing-price { font-size: 3rem; font-weight: 800; margin: 1.25rem 0 0.25rem; }
.pricing-price small { font-size: 1rem; color: #94a3b8; font-weight: 400; }
.pricing-desc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
.pricing-features { list-style: none; margin: 1.5rem 0; text-align: left; }
.pricing-features li {
  padding: 0.6rem 0; border-bottom: 1px solid #1e293b;
  display: flex; align-items: center; gap: 0.6rem;
  color: #cbd5e1; font-size: 0.85rem;
}
.pricing-features li::before { content: "✓"; color: #22c55e; font-weight: 700; }

/* ── payment platforms ── */
.payment-platforms {
  display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center;
  margin: 1.25rem 0;
}
.payment-btn {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.8rem; font-weight: 600; text-decoration: none;
  transition: all 0.2s; border: 1px solid #334155; background: #0f172a; color: #e2e8f0;
}
.payment-btn:hover { border-color: ${primary}; background: ${primary}10; }
.payment-btn.hotmart { border-color: #e91e63; }
.payment-btn.hotmart:hover { background: #e91e6315; }
.payment-btn.kiwify { border-color: #7c3aed; }
.payment-btn.kiwify:hover { background: #7c3aed15; }
.payment-btn.pix { border-color: #00b4d8; }
.payment-btn.pix:hover { background: #00b4d815; }

/* ── author badge ── */
.author-badge {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid ${primary}40; border-radius: 12px;
  padding: 0.75rem 1.25rem; margin: 1.5rem 0;
}
.author-badge-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: linear-gradient(135deg, ${primary}, ${secondary});
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; color: #fff; font-weight: 700; flex-shrink: 0;
}
.author-badge-info { text-align: left; }
.author-badge-info .name { font-weight: 600; font-size: 0.9rem; color: #f1f5f9; }
.author-badge-info .certs { font-size: 0.75rem; color: ${primary}; font-weight: 500; }

/* ── whatsapp / pix info box ── */
.info-box {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155; border-radius: 12px;
  padding: 1.5rem; margin: 1.5rem 0;
  display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;
  justify-content: space-between;
}
.info-box .left { display: flex; align-items: center; gap: 0.75rem; }
.info-box .left .emoji { font-size: 1.5rem; }
.info-box .left .text { font-size: 0.9rem; }
.info-box .left .text strong { color: #f1f5f9; }
.info-box .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.info-box .btn-sm { padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 8px; }

/* ── footer ── */
.footer {
  border-top: 1px solid #1e293b; padding: 2rem 0;
  text-align: center; color: #64748b; font-size: 0.8rem;
}
.footer a { color: ${primary}; text-decoration: none; }

/* ── responsive ── */
@media (max-width: 768px) {
  .navbar-links { display: none; position: absolute; top: 100%; left: 0; right: 0;
    background: #0b0f1a; border-bottom: 1px solid #1e293b;
    padding: 1rem; flex-direction: column; gap: 1rem;
  }
  .navbar-links.open { display: flex; }
  .mobile-btn { display: block; }
  .hero h1 { font-size: 1.8rem; }
  .info-box { flex-direction: column; align-items: stretch; text-align: center; }
  .info-box .left { justify-content: center; }
  .info-box .actions { justify-content: center; }
}
`;
}

// ============================================================
//  LANDING PAGE HTML
// ============================================================
function generateLandingHTML(dataset, options = {}) {
  const {
    hotmartUrl = '#',
    kiwifyUrl = '#',
    pixKey = 'exemplo@pix.com.br',
    whatsappNumber = '5511999999999',
    whatsappText = 'Olá! Tenho interesse no dataset',
  } = options;

  const slug = dataset.slug || dataset.name.toLowerCase().replace(/\s+/g, '-');
  const name = dataset.name || 'Dataset';
  const niche = dataset.niche || name;
  const description = dataset.description || `Dataset premium sobre ${niche}.`;
  const price = dataset.price ? formatBRL(dataset.price) : 'R$ 49,90';
  const records = dataset.data ? dataset.data.length : (dataset.recordCount || 0);
  const sampleData = dataset.data ? dataset.data.slice(0, 5) : (dataset.sampleData || []);
  const features = dataset.features || [
    'Dados estruturados e normalizados',
    'Pronto para análises e modelos de IA',
    'Guia técnico incluso (7 capítulos)',
    'Formatos JSON e CSV',
    'Atualizações gratuitas por 30 dias',
    'Suporte via e-mail e WhatsApp',
  ];
  const fields = dataset.fields || (sampleData.length > 0 ? Object.keys(sampleData[0]) : []);

  const primary = hashColor(slug, 10);

  // Stats badges
  const statsBadges = [
    { label: 'Registros', value: records.toLocaleString('pt-BR') },
    { label: 'Campos', value: fields.length },
    { label: 'Qualidade', value: (dataset.qualityScore || 96) + '%' },
    { label: 'Preço', value: price },
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} — Dataset Premium</title>
  <meta name="description" content="${escapeHtml(truncate(description, 160))}">
  <meta property="og:title" content="${escapeHtml(name)} — Dataset Premium">
  <meta property="og:description" content="${escapeHtml(truncate(description, 160))}">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="${primary}">
  <link rel="manifest" href="manifest.json">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${landingCSS(dataset)}</style>
</head>
<body>
  <!-- ═══ NAVBAR ═══ -->
  <nav class="navbar">
    <div class="container">
      <a href="../" class="navbar-brand">
        <span class="brand-icon">📊</span>
        Datasets Premium
      </a>
      <button class="mobile-btn" onclick="document.querySelector('.navbar-links').classList.toggle('open')">☰</button>
      <ul class="navbar-links">
        <li><a href="#features">Recursos</a></li>
        <li><a href="#amostra">Amostra</a></li>
        <li><a href="#preco">Preço</a></li>
        <li><a href="#contato">Contato</a></li>
        <li><a href="#preco" class="navbar-cta">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <!-- ═══ HERO ═══ -->
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="container">
      <div class="hero-content">
        <div class="hero-badge">🔥 Dataset Premium</div>
        <h1>${escapeHtml(name)}</h1>
        <p>${escapeHtml(truncate(description, 280))}</p>

        <!-- Stats Badges -->
        <div class="stats-bar">
          ${statsBadges.map(s => `
            <span class="stat-badge">
              <span class="num">${s.value}</span>
              <span class="lbl">${s.label}</span>
            </span>
          `).join('')}
        </div>

        <div class="hero-actions">
          <a href="#preco" class="btn btn-primary btn-lg">🚀 Adquirir — ${escapeHtml(price)}</a>
          <a href="#amostra" class="btn btn-secondary btn-lg">📋 Ver Amostra</a>
        </div>

        <!-- Author Badge -->
        <div style="display:flex; justify-content:center;">
          <div class="author-badge">
            <div class="author-badge-avatar">IA</div>
            <div class="author-badge-info">
              <div class="name">Data Sales Agent</div>
              <div class="certs">🏅 4 certificações em IA • Dados verificados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ FEATURES ═══ -->
  <section class="section section-alt" id="features">
    <div class="container">
      <div class="section-header">
        <h2>🎯 O que está incluso</h2>
        <p>Dataset completo, pronto para uso imediato em análises, modelos de IA e pesquisas.</p>
      </div>
      <div class="features-grid">
        ${features.map((f, i) => {
          const icons = ['📊','📈','📚','🎯','🔄','🔒','📋','⚡'];
          return `
          <div class="feature-card">
            <div class="feature-icon">${icons[i % icons.length]}</div>
            <h3>${f.split(':')[0] || f}</h3>
            <p>${f.includes(':') ? f.split(':').slice(1).join(':').trim() : 'Dados de alta qualidade processados e validados.'}</p>
          </div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <!-- ═══ SAMPLE TABLE ═══ -->
  <section class="section" id="amostra">
    <div class="container">
      <div class="section-header">
        <h2>📋 Amostra dos Dados</h2>
        <p>Veja as primeiras ${Math.min(sampleData.length, 5)} linhas do dataset com ${records.toLocaleString('pt-BR')} registros.</p>
      </div>

      ${sampleData.length > 0 ? `
      <div class="table-wrapper">
        <table class="sample-table">
          <thead>
            <tr>${fields.slice(0, 8).map(f => `<th>${escapeHtml(f)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${sampleData.map(row => `
              <tr>${fields.slice(0, 8).map(f => {
                const val = row[f];
                const display = val !== null && val !== undefined
                  ? (typeof val === 'number' ? val.toLocaleString('pt-BR') : String(val))
                  : '—';
                return `<td>${escapeHtml(display.length > 30 ? display.slice(0, 30) + '…' : display)}</td>`;
              }).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="text-align:center; margin-top:1rem; color:#64748b; font-size:0.85rem;">
        Mostrando ${Math.min(sampleData.length, 5)} de ${records.toLocaleString('pt-BR')} registros • ${fields.length} campos
      </p>` : `
      <div style="text-align:center; padding:3rem; background:#1e293b; border-radius:12px; border:1px solid #334155;">
        <p style="color:#94a3b8;">Amostra indisponível no momento.</p>
      </div>`}
    </div>
  </section>

  <!-- ═══ CHART PLACEHOLDERS ═══ -->
  <section class="section section-alt">
    <div class="container">
      <div class="section-header">
        <h2>📊 Visualização dos Dados</h2>
        <p>Gráficos ilustrativos da distribuição e tendências do dataset.</p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:1.25rem;">
        <div style="background:#1e293b; border-radius:12px; border:1px solid #334155; padding:1rem;">
          <h3 style="font-size:0.85rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">
            📈 Distribuição de Preços
          </h3>
          ${chartPlaceholderSVG(320, 180, 'Preço (R$)', name)}
        </div>
        <div style="background:#1e293b; border-radius:12px; border:1px solid #334155; padding:1rem;">
          <h3 style="font-size:0.85rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">
            🏷️ Categorias
          </h3>
          ${chartPlaceholderSVG(320, 180, 'Distribuição', name)}
        </div>
        <div style="background:#1e293b; border-radius:12px; border:1px solid #334155; padding:1rem;">
          <h3 style="font-size:0.85rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">
            📊 Tendências
          </h3>
          ${chartPlaceholderSVG(320, 180, 'Tendências', name)}
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ PRICING ═══ -->
  <section class="section" id="preco">
    <div class="container">
      <div class="section-header">
        <h2>💎 Adquira o Dataset Completo</h2>
        <p>Pacote completo com dados, guia técnico e suporte.</p>
      </div>

      <div class="pricing-card featured">
        <div class="pricing-badge">MELHOR OFERTA</div>
        <h3>Pacote Completo</h3>
        <div class="pricing-price">
          ${escapeHtml(price)}
          <small>pagamento único</small>
        </div>
        <p class="pricing-desc">Dataset + Guia Técnico + Suporte</p>

        <ul class="pricing-features">
          <li>Dataset com ${records.toLocaleString('pt-BR')} registros (JSON + CSV)</li>
          <li>Guia técnico com 7 capítulos de análise</li>
          <li>Estatísticas descritivas completas</li>
          <li>Metadados e documentação técnica</li>
          <li>Atualizações gratuitas por 30 dias</li>
          <li>Suporte via e-mail e WhatsApp</li>
        </ul>

        <!-- Multi-plataforma payment buttons -->
        <div class="payment-platforms">
          <a href="${escapeHtml(hotmartUrl)}" target="_blank" rel="noopener" class="payment-btn hotmart">
            <span>🛒</span> Hotmart
          </a>
          <a href="${escapeHtml(kiwifyUrl)}" target="_blank" rel="noopener" class="payment-btn kiwify">
            <span>🛍️</span> Kiwify
          </a>
          <a href="#" onclick="copiarPix()" class="payment-btn pix">
            <span>💳</span> PIX
          </a>
        </div>

        <a href="${escapeHtml(hotmartUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-lg" style="width:100%; justify-content:center;">
          🚀 Comprar Agora — ${escapeHtml(price)}
        </a>

        <p style="margin-top:0.75rem; color:#64748b; font-size:0.8rem;">
          ✅ Pagamento 100% seguro • Download imediato • Suporte 7 dias
        </p>
      </div>

      <!-- PIX Info Box -->
      <div class="info-box" id="contato">
        <div class="left">
          <span class="emoji">💳</span>
          <div class="text">
            <strong>Pague via PIX</strong><br>
            <span style="color:#94a3b8; font-size:0.8rem;">Chave: ${escapeHtml(pixKey)}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-sm btn-pix" onclick="copiarPix()">📋 Copiar Chave PIX</button>
          <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText + ' — ' + name)}"
             target="_blank" rel="noopener" class="btn btn-sm btn-whatsapp">
            💬 Fale no WhatsApp
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ FOOTER ═══ -->
  <footer class="footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} Data Sales Agent • Todos os direitos reservados.</p>
      <p style="margin-top:0.25rem;">
        Dataset: <strong>${escapeHtml(name)}</strong> • Gerado em ${new Date().toLocaleDateString('pt-BR')}
      </p>
    </div>
  </footer>

  <!-- ═══ JS ═══ -->
  <script>
    function copiarPix() {
      const chave = ${JSON.stringify(pixKey)};
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chave).then(function() {
          alert('✅ Chave PIX copiada: ' + chave);
        }).catch(function() {
          prompt('📋 Copie a chave PIX:', chave);
        });
      } else {
        prompt('📋 Copie a chave PIX:', chave);
      }
    }
    // Navbar scroll effect
    const nav = document.querySelector('.navbar');
    document.addEventListener('scroll', function() {
      nav.style.background = window.scrollY > 40
        ? 'rgba(11,15,26,0.98)'
        : 'rgba(11,15,26,0.85)';
    });
    // Close mobile menu on link click
    document.querySelectorAll('.navbar-links a').forEach(function(a) {
      a.addEventListener('click', function() {
        document.querySelector('.navbar-links').classList.remove('open');
      });
    });
  </script>
</body>
</html>`;
}

// ============================================================
//  PWA MANIFEST
// ============================================================
function generateManifest(dataset) {
  const slug = dataset.slug || dataset.name.toLowerCase().replace(/\s+/g, '-');
  const primary = hashColor(slug, 10);
  return {
    name: dataset.name + ' — Dataset Premium',
    short_name: dataset.name.length > 20 ? dataset.name.slice(0, 18) + '…' : dataset.name,
    description: dataset.description || `Dataset premium sobre ${dataset.niche || dataset.name}.`,
    start_url: './index.html',
    display: 'standalone',
    background_color: '#0b0f1a',
    theme_color: primary,
    orientation: 'portrait-primary',
    icons: [
      {
        src: 'icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['datasets', 'data', dataset.niche || 'data'],
  };
}

// ============================================================
//  KAGGLE DESCRIPTION (listing-kaggle.md)
// ============================================================
function generateKaggleDescription(datasets) {
  const lines = [];
  const now = new Date().toLocaleString('pt-BR');

  lines.push('# 📊 Data Sales Agent — Datasets Premium\n');
  lines.push(`> *Catálogo de datasets gerado automaticamente em ${now}*\n`);
  lines.push('---\n');
  lines.push('## 📋 Visão Geral\n');
  lines.push(`Este repositório contém **${datasets.length} datasets** premium sobre diversos nichos de mercado.`);
  lines.push('Cada dataset é cuidadosamente coletado, limpo e estruturado para uso imediato em análises,');
  lines.push('modelos de machine learning, pesquisas acadêmicas e estudos de mercado.\n');
  lines.push('---\n');
  lines.push('## 📦 Datasets Disponíveis\n');
  lines.push('');

  datasets.forEach((ds, idx) => {
    const name = ds.name || ds.project?.name || `Dataset #${idx + 1}`;
    const desc = ds.description || ds.project?.description || '';
    const records = ds.data ? ds.data.length : (ds.recordCount || 0);
    const slug = ds.slug || name.toLowerCase().replace(/\s+/g, '-');
    const price = ds.price ? `R$ ${ds.price}` : 'R$ 49,90';
    const fields = ds.fields || (ds.data && ds.data.length > 0 ? Object.keys(ds.data[0]) : []);

    lines.push(`### ${idx + 1}. ${name}\n`);
    lines.push(`- **Slug:** \`${slug}\``);
    lines.push(`- **Nicho:** ${ds.niche || 'Geral'}`);
    lines.push(`- **Registros:** ${records.toLocaleString('pt-BR')}`);
    lines.push(`- **Campos:** ${fields.length}`);
    lines.push(`- **Preço:** ${price}`);
    lines.push(`- **Descrição:** ${truncate(desc, 200)}`);
    lines.push(`- **Landing Page:** [Ver página](${slug}/index.html)`);
    lines.push('');
  });

  lines.push('---\n');
  lines.push('## 🔬 Metodologia\n');
  lines.push('Os dados são coletados de fontes públicas utilizando técnicas automatizadas de scraping,');
  lines.push('respeitando os termos de uso e robots.txt. Cada dataset passa por um processo de limpeza');
  lines.push('e validação que inclui:\n');
  lines.push('- Remoção de duplicatas e outliers');
  lines.push('- Normalização de formatos (moeda, data, unidades)');
  lines.push('- Validação cruzada com fontes oficiais');
  lines.push('- Enriquecimento com metadados descritivos\n');
  lines.push('---\n');
  lines.push('## 🚀 Como Usar\n');
  lines.push('1. Escolha um dataset da lista acima');
  lines.push('2. Acesse a landing page para mais detalhes');
  lines.push('3. Adquira via Hotmart, Kiwify ou PIX');
  lines.push('4. Faça o download imediato em JSON e CSV\n');
  lines.push('---\n');
  lines.push('## 📄 Licença\n');
  lines.push('Os datasets são licenciados para uso comercial e acadêmico,');
  lines.push('mas não é permitida a revenda direta do dataset bruto.\n');
  lines.push('---\n');
  lines.push(`*Gerado automaticamente pelo Data Sales Agent em ${now}*\n`);

  return lines.join('\n');
}

// ============================================================
//  PRODUCT DESCRIPTION (Gumroad/Hotmart)
// ============================================================
function generateProductDescription(dataset) {
  const name = dataset.name || 'Dataset Premium';
  const desc = dataset.description || '';
  const records = dataset.data ? dataset.data.length : (dataset.recordCount || 0);
  const price = dataset.price ? `R$ ${dataset.price}` : 'R$ 49,90';
  const fields = dataset.fields || (dataset.data && dataset.data.length > 0 ? Object.keys(dataset.data[0]) : []);

  const lines = [];

  // --- Gumroad version ---
  lines.push('========================================');
  lines.push('  DESCRIÇÃO PARA GUMROAD / HOTMART');
  lines.push('========================================\n');

  lines.push(`Título: ${name} — Dataset Premium\n`);

  lines.push(`Descrição Curta:
Dataset completo com ${records.toLocaleString('pt-BR')} registros sobre ${dataset.niche || name}. Dados limpos, estruturados e prontos para análises, modelos de IA e pesquisas de mercado. Inclui guia técnico com 7 capítulos.\n`);

  lines.push('Descrição Longa:\n');
  lines.push(`## 📊 Dataset Premium: ${name}\n`);
  lines.push(`${desc}\n`);
  lines.push(`### ✅ O que você recebe:\n`);
  lines.push(`- 📁 **${records.toLocaleString('pt-BR')} registros** em JSON e CSV`);
  lines.push(`- 📋 **${fields.length} campos** por registro`);
  lines.push('- 📚 **Guia Técnico** com 7 capítulos de análise detalhada');
  lines.push('- 📈 **Estatísticas descritivas** completas');
  lines.push('- 📄 **Metadados** e documentação técnica');
  lines.push('- 🔄 **Atualizações gratuitas** por 30 dias');
  lines.push('- 💬 **Suporte** via e-mail e WhatsApp\n');

  lines.push('### 🎯 Para quem é este dataset?\n');
  lines.push('- Cientistas de dados e analistas');
  lines.push('- Pesquisadores acadêmicos');
  lines.push('- Profissionais de marketing e BI');
  lines.push('- Estudantes de tecnologia e dados');
  lines.push('- Empresas em busca de insights de mercado\n');

  lines.push('### 💳 Formas de Pagamento:\n');
  lines.push('- **Cartão de crédito** (via Hotmart/Kiwify)');
  lines.push('- **Boleto bancário** (via Hotmart)');
  lines.push('- **PIX** (transferência direta)');
  lines.push('- **PayPal** (via Hotmart)\n');

  lines.push(`**Preço:** ${price} (pagamento único)\n`);

  lines.push('### 🔒 Garantia:\n');
  lines.push('Satisfação garantida ou seu dinheiro de volta em até 7 dias.\n');

  lines.push('---\n');
  lines.push('Tags: dataset, dados, ' + (dataset.niche || 'data') + ', machine learning, análise de dados, csv, json, pesquisa de mercado, inteligência artificial\n');

  lines.push('========================================\n');

  return lines.join('\n');
}

// ============================================================
//  PWA ICONS (SVG placeholders for manifest)
// ============================================================
function generatePlaceholderIconSVG(size, datasetName) {
  const color = hashColor(datasetName || 'dataset', 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0b0f1a"/>
  <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.7}" height="${size * 0.7}" rx="${size * 0.1}" fill="${color}" opacity="0.9"/>
  <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle" fill="#fff" font-size="${size * 0.34}" font-weight="800" font-family="system-ui">D</text>
</svg>`;
}

// ============================================================
//  MAIN EXPORT
// ============================================================

/**
 * Publica todos os datasets: gera landing pages, descrições e PWA assets.
 *
 * @param {Array<Object>} datasets - Lista de datasets (formato padronizado)
 *   Cada dataset deve ter: name, slug, niche, description, data (array),
 *   price (number), features (array de strings)
 * @param {Object} config - Configuração do projeto (opcional)
 * @param {Object} [paymentOptions] - Opções de pagamento
 * @returns {Promise<Object>} Relatório dos arquivos gerados
 */
export async function publishDatasets(datasets, config = {}, paymentOptions = {}) {
  log.section('📦 MÓDULO 4: AUTO PUBLISHER');

  if (!datasets || datasets.length === 0) {
    log.error('Nenhum dataset fornecido para publicação.');
    return null;
  }

  const defaults = {
    hotmartUrl: 'https://pay.hotmart.com/',
    kiwifyUrl: 'https://kiwify.com.br/',
    pixKey: 'datasets@exemplo.com.br',
    whatsappNumber: '5511999999999',
    whatsappText: 'Olá! Tenho interesse no dataset',
  };

  const opts = { ...defaults, ...paymentOptions };
  const baseOutputDir = config.deploy?.outputDir || './output';
  const datasetsDir = path.join(baseOutputDir, 'datasets');
  const allLandingPages = [];
  const errors = [];

  log.info(`Publicando ${datasets.length} datasets...`);
  log.info(`Diretório base: ${datasetsDir}`);

  for (let i = 0; i < datasets.length; i++) {
    const ds = datasets[i];
    const slug = ds.slug || ds.name?.toLowerCase().replace(/\s+/g, '-') || `dataset-${i + 1}`;
    const dsDir = path.join(datasetsDir, slug);

    const spinner = ora(`[${i + 1}/${datasets.length}] Gerando ${slug}...`).start();

    try {
      await fs.ensureDir(dsDir);

      // 1. Landing page
      const html = generateLandingHTML(ds, opts);
      const htmlPath = path.join(dsDir, 'index.html');
      await fs.writeFile(htmlPath, html, 'utf-8');

      // 2. PWA manifest
      const manifest = generateManifest(ds);
      const manifestPath = path.join(dsDir, 'manifest.json');
      await fs.writeJSON(manifestPath, manifest, { spaces: 2 });

      // 3. PWA icons (placeholder SVG)
      const icon192 = generatePlaceholderIconSVG(192, ds.name);
      await fs.writeFile(path.join(dsDir, 'icon-192.png'), icon192, 'utf-8');
      const icon512 = generatePlaceholderIconSVG(512, ds.name);
      await fs.writeFile(path.join(dsDir, 'icon-512.png'), icon512, 'utf-8');

      spinner.succeed(`${slug} — landing page + manifest ok`);
      allLandingPages.push({
        slug,
        name: ds.name || slug,
        htmlPath,
        manifestPath,
        records: ds.data ? ds.data.length : (ds.recordCount || 0),
        price: ds.price,
      });
    } catch (err) {
      spinner.fail(`Erro ao publicar ${slug}: ${err.message}`);
      errors.push({ slug, error: err.message });
    }
  }

  // ── Gera Kaggle listing ──
  const kaggleSpinner = ora('Gerando listing-kaggle.md...').start();
  try {
    const kaggleContent = generateKaggleDescription(datasets);
    const kagglePath = path.join(baseOutputDir, 'listing-kaggle.md');
    await fs.writeFile(kagglePath, kaggleContent, 'utf-8');
    kaggleSpinner.succeed(`listing-kaggle.md gerado`);
  } catch (err) {
    kaggleSpinner.fail(`Erro no listing-kaggle: ${err.message}`);
    errors.push({ file: 'listing-kaggle.md', error: err.message });
  }

  // ── Gera product descriptions ──
  const prodSpinner = ora('Gerando product-descriptions.md...').start();
  try {
    const prodLines = datasets.map(ds => generateProductDescription(ds));
    const prodContent = prodLines.join('\n');
    const prodPath = path.join(baseOutputDir, 'product-descriptions.md');
    await fs.writeFile(prodPath, prodContent, 'utf-8');
    prodSpinner.succeed(`product-descriptions.md gerado`);
  } catch (err) {
    prodSpinner.fail(`Erro no product-descriptions: ${err.message}`);
    errors.push({ file: 'product-descriptions.md', error: err.message });
  }

  // ── Resumo ──
  log.section('✅ PUBLICAÇÃO CONCLUÍDA');
  log.success(`${allLandingPages.length} landing pages geradas`);
  log.success(`${baseOutputDir}/listing-kaggle.md`);
  log.success(`${baseOutputDir}/product-descriptions.md`);
  if (errors.length > 0) {
    log.warn(`${errors.length} erro(s) encontrados:`);
    errors.forEach(e => log.error(`  • ${e.slug || e.file}: ${e.error}`));
  }

  return {
    landingPages: allLandingPages,
    files: {
      kaggle: path.join(baseOutputDir, 'listing-kaggle.md'),
      productDescriptions: path.join(baseOutputDir, 'product-descriptions.md'),
    },
    errors,
  };
}

// ============================================================
//  EXPORT INDIVIDUAL GENERATORS (para uso direto)
// ============================================================
export {
  generateLandingHTML,
  generateManifest,
  generateKaggleDescription,
  generateProductDescription,
  generatePlaceholderIconSVG,
  chartPlaceholderSVG,
};

// ============================================================
//  STANDALONE EXECUTION
// ============================================================
async function main() {
  const configPath = process.argv[2] || './config/default.js';
  const datasetsPath = process.argv[3] || './output/datasets.json';

  try {
    const config = (await import(path.resolve(configPath))).default;
    let datasets;

    if (await fs.pathExists(path.resolve(datasetsPath))) {
      datasets = await fs.readJSON(path.resolve(datasetsPath));
    } else {
      // Tenta carregar do dataset_limpo.json (single dataset)
      const singlePath = path.resolve(config.deploy.outputDir || './output', 'dataset_limpo.json');
      if (await fs.pathExists(singlePath)) {
        const single = await fs.readJSON(singlePath);
        datasets = [single];
      } else {
        log.error(`Nenhum dataset encontrado em ${datasetsPath} ou ${singlePath}`);
        process.exit(1);
      }
    }

    const result = await publishDatasets(datasets, config);
    if (result) {
      log.section('RESUMO');
      log.info(`${result.landingPages.length} landing pages geradas`);
      log.info(`Kaggle listing: ${result.files.kaggle}`);
      log.info(`Prod. descriptions: ${result.files.productDescriptions}`);
    }
  } catch (error) {
    log.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && (
  process.argv[1].includes('autoPublisher') ||
  process.argv[1].endsWith('/autoPublisher.js') ||
  process.argv[1].endsWith('\\autoPublisher.js')
);

if (isMainModule) {
  main();
}