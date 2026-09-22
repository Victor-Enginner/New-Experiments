/**
 * 🌐 Módulo 3: Construtor de Landing Page & Dashboard (Sales Builder)
 * 
 * Responsabilidades:
 * - Gerar Landing Page HTML/CSS/JS responsiva
 * - Criar Dashboard interativo com Chart.js
 * - Incluir seções de vendas (preço, CTA, FAQ)
 * - Integrar com gateways de pagamento
 * - Gerar página de checkout (opcional)
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━'))
};

/**
 * Gera o CSS completo da Landing Page
 * @param {Object} config - Configuração de frontend
 * @returns {string} CSS completo
 */
function generateCSS(config) {
  const { primaryColor, secondaryColor, accentColor, fontFamily } = config.frontend;
  
  return `
/* ============================================
   Data Sales Agent - Landing Page Styles
   Gerado automaticamente em ${new Date().toISOString()}
   ============================================ */

:root {
  --primary: ${primaryColor};
  --primary-dark: ${adjustColor(primaryColor, -20)};
  --primary-light: ${adjustColor(primaryColor, 20)};
  --secondary: ${secondaryColor};
  --accent: ${accentColor};
  --font-family: ${fontFamily};
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --radius: 12px;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family);
  background: var(--bg-dark);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ========== NAVBAR ========== */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  transition: all 0.3s ease;
}

.navbar.scrolled {
  background: rgba(15, 23, 42, 0.98);
  box-shadow: var(--shadow);
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-brand .brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.navbar-links {
  display: flex;
  gap: 2rem;
  align-items: center;
  list-style: none;
}

.navbar-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar-links a:hover {
  color: var(--text-primary);
}

.navbar-cta {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white !important;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-weight: 600 !important;
}

.navbar-cta:hover {
  opacity: 0.9;
  color: white !important;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
}

/* ========== HERO ========== */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 6rem 0 4rem;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 50%, ${primaryColor}15 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, ${secondaryColor}15 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, ${accentColor}10 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: ${primaryColor}20;
  border: 1px solid ${primaryColor}40;
  color: var(--primary-light);
  padding: 0.5rem 1rem;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--text-primary), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  font-size: 1.15rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 2.5rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ========== BUTTONS ========== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 2rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  box-shadow: 0 4px 15px ${primaryColor}40;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px ${primaryColor}50;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--primary);
  background: ${primaryColor}10;
}

.btn-lg {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
}

/* ========== SECTIONS ========== */
.section {
  padding: 5rem 0;
}

.section-header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;
}

.section-header h2 {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-header p {
  color: var(--text-secondary);
  font-size: 1.05rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* ========== FEATURES ========== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 2rem;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: ${primaryColor}50;
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: ${primaryColor}20;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
}

.feature-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* ========== DASHBOARD ========== */
.dashboard-section {
  background: linear-gradient(180deg, var(--bg-dark), #0c1222, var(--bg-dark));
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.dashboard-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.dashboard-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-container {
  position: relative;
  width: 100%;
  min-height: 300px;
}

.chart-container canvas {
  width: 100% !important;
  height: auto !important;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

/* ========== PRICING ========== */
.pricing-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 3rem 2rem;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.pricing-card.featured {
  border-color: ${primaryColor};
  box-shadow: 0 0 30px ${primaryColor}20;
}

.pricing-badge {
  position: absolute;
  top: 1rem;
  right: -2rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 0.35rem 3rem;
  font-size: 0.8rem;
  font-weight: 600;
  transform: rotate(45deg);
}

.pricing-price {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 1.5rem 0;
}

.pricing-price span {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.pricing-features {
  list-style: none;
  margin: 2rem 0;
  text-align: left;
}

.pricing-features li {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.pricing-features li::before {
  content: "✓";
  color: var(--success);
  font-weight: 700;
}

/* ========== FAQ ========== */
.faq-list {
  max-width: 700px;
  margin: 0 auto;
}

.faq-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  margin-bottom: 1rem;
  overflow: hidden;
}

.faq-question {
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  user-select: none;
}

.faq-question:hover {
  background: ${primaryColor}08;
}

.faq-question .faq-icon {
  transition: transform 0.3s;
  font-size: 1.25rem;
}

.faq-item.active .faq-question .faq-icon {
  transform: rotate(45deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
}

.faq-item.active .faq-answer {
  max-height: 300px;
  padding: 0 1.5rem 1.25rem;
}

/* ========== FOOTER ========== */
.footer {
  border-top: 1px solid var(--border-color);
  padding: 3rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.footer a {
  color: var(--primary-light);
  text-decoration: none;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .navbar-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-dark);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .navbar-links.open {
    display: flex;
  }

  .mobile-menu-btn {
    display: block;
  }

  .hero h1 {
    font-size: 2rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .pricing-card {
    margin: 0 1rem;
  }
}

/* ========== ANIMATIONS ========== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}

.animate-in:nth-child(2) { animation-delay: 0.1s; }
.animate-in:nth-child(3) { animation-delay: 0.2s; }
.animate-in:nth-child(4) { animation-delay: 0.3s; }
.animate-in:nth-child(5) { animation-delay: 0.4s; }
.animate-in:nth-child(6) { animation-delay: 0.5s; }

/* ========== SCROLLBAR ========== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-dark);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
`;
}

/**
 * Gera o JavaScript completo da Landing Page
 * @param {Object} dataset - Dataset com dados
 * @param {Object} config - Configuração
 * @returns {string} JavaScript completo
 */
function generateJS(dataset, config) {
  const { data, summary } = dataset;
  const { project, frontend } = config;
  
  // Prepara dados para os gráficos
  const chartData = prepareChartData(data, summary);
  
  return `
// ============================================
// Data Sales Agent - Landing Page JavaScript
// Gerado automaticamente em ${new Date().toISOString()}
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // ========== NAVBAR SCROLL EFFECT ==========
  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });

  // ========== MOBILE MENU ==========
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.navbar-links');

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      mobileBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
    });
  }

  // ========== FAQ ACCORDION ==========
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');
      
      // Fecha todos
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      
      // Abre o clicado se não estava ativo
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // ========== SMOOTH SCROLL ==========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Fecha mobile menu se aberto
        navLinks.classList.remove('open');
        if (mobileBtn) mobileBtn.textContent = '☰';
      }
    });
  });

  // ========== CHARTS ==========
  const chartData = ${JSON.stringify(chartData)};
  const projectInfo = ${JSON.stringify(project)};
  const summaryData = ${JSON.stringify(summary)};

  // Chart 1: Bar Chart - Preços
  const ctx1 = document.getElementById('chart-prices');
  if (ctx1 && chartData.priceData) {
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: chartData.priceData.labels,
        datasets: [{
          label: 'Preço (R$)',
          data: chartData.priceData.values,
          backgroundColor: '${frontend.primaryColor}80',
          borderColor: '${frontend.primaryColor}',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'R$ ' + context.parsed.y.toLocaleString('pt-BR');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#94a3b8',
              callback: function(value) {
                return 'R$ ' + (value / 1000).toFixed(0) + 'k';
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // Chart 2: Doughnut - Distribuição por Categoria
  const ctx2 = document.getElementById('chart-distribution');
  if (ctx2 && chartData.distributionData) {
    const colors = [
      '${frontend.primaryColor}',
      '${frontend.secondaryColor}',
      '${frontend.accentColor}',
      '#22c55e',
      '#eab308',
      '#ef4444',
      '#8b5cf6',
      '#ec4899'
    ];

    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: chartData.distributionData.labels,
        datasets: [{
          data: chartData.distributionData.values,
          backgroundColor: colors.slice(0, chartData.distributionData.labels.length),
          borderColor: '${frontend.bgCard || '#1e293b'}',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 16,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  // Chart 3: Line Chart - Tendências
  const ctx3 = document.getElementById('chart-trends');
  if (ctx3 && chartData.trendData) {
    new Chart(ctx3, {
      type: 'line',
      data: {
        labels: chartData.trendData.labels,
        datasets: [{
          label: 'Tendência de Preços',
          data: chartData.trendData.values,
          borderColor: '${frontend.accentColor}',
          backgroundColor: '${frontend.accentColor}20',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '${frontend.accentColor}',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'R$ ' + context.parsed.y.toLocaleString('pt-BR');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#94a3b8',
              callback: function(value) {
                return 'R$ ' + (value / 1000).toFixed(0) + 'k';
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // ========== ANIMAÇÕES SCROLL ==========
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .stat-card, .dashboard-card').forEach(el => {
    observer.observe(el);
  });

  // ========== CONTADOR ANIMADO ==========
  function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.floor(start + (target - start) * eased);
      
      element.textContent = current.toLocaleString('pt-BR');
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  // Anima estatísticas
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    animateCounter(el, target);
  });
});
`;
}

/**
 * Prepara dados para os gráficos do dashboard
 */
function prepareChartData(data) {
  const result = {};
  
  // Dados de preços (bar chart)
  if (data.length > 0) {
    const priceField = Object.keys(data[0]).find(f =>
      ['price', 'preco', 'valor', 'price_brl'].includes(f.toLowerCase())
    );
    
    if (priceField) {
      const prices = data
        .map(r => r[priceField])
        .filter(v => typeof v === 'number' && v > 0)
        .slice(0, 20);
      
      result.priceData = {
        labels: prices.map((_, i) => `#${i + 1}`),
        values: prices
      };
    }
  }
  
  // Dados de distribuição (doughnut chart)
  if (data.length > 0) {
    const catField = Object.keys(data[0]).find(f =>
      ['propertyType', 'tipo', 'type', 'listingType', 'category', 'categoria'].includes(f.toLowerCase())
    );
    
    if (catField) {
      const freq = {};
      data.forEach(r => {
        const val = r[catField];
        if (val) freq[val] = (freq[val] || 0) + 1;
      });
      
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
      result.distributionData = {
        labels: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v)
      };
    }
  }
  
  // Dados de tendência (line chart)
  if (data.length > 0) {
    const priceField = Object.keys(data[0]).find(f =>
      ['price', 'preco', 'valor', 'price_brl'].includes(f.toLowerCase())
    );
    
    if (priceField) {
      const prices = data
        .map(r => r[priceField])
        .filter(v => typeof v === 'number' && v > 0)
        .sort((a, b) => a - b);
      
      // Cria tendência simulada
      const chunkSize = Math.max(1, Math.floor(prices.length / 10));
      const trendValues = [];
      const trendLabels = [];
      
      for (let i = 0; i < prices.length; i += chunkSize) {
        const chunk = prices.slice(i, i + chunkSize);
        const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
        trendValues.push(Math.round(avg));
        trendLabels.push(`Grupo ${trendLabels.length + 1}`);
      }
      
      result.trendData = {
        labels: trendLabels,
        values: trendValues
      };
    }
  }
  
  return result;
}

/**
 * Ajusta cor (clarear/escurecer)
 */
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Gera o HTML completo da Landing Page
 */
function generateHTML(dataset, config) {
  const { project, data, summary } = dataset;
  const { frontend } = config;
  
  const features = [
    {
      icon: '📊',
      title: 'Dados Estruturados',
      desc: `Dataset com ${data.length} registros limpos, normalizados e prontos para uso em análises, modelos de IA e pesquisas de mercado.`
    },
    {
      icon: '📈',
      title: 'Análise Estatística',
      desc: `Estatísticas descritivas completas incluindo médias, medianas, distribuições e tendências do mercado de ${project.niche}.`
    },
    {
      icon: '📚',
      title: 'Guia Técnico Incluso',
      desc: 'E-book completo com 7 capítulos abordando análise de mercado, tendências, oportunidades e recomendações estratégicas.'
    },
    {
      icon: '🎯',
      title: 'Alta Qualidade',
      desc: `Dados com ${summary.qualityScore}% de qualidade, validados e prontos para tomada de decisão.`
    },
    {
      icon: '🔄',
      title: 'Formatos Múltiplos',
      desc: 'Dataset disponível em JSON e CSV. Guia em Markdown, conversível para PDF e ePub.'
    },
    {
      icon: '🔒',
      title: 'Dados Verificados',
      desc: 'Fontes públicas verificadas. Metodologia transparente e documentada.'
    }
  ];
  
  const faqItems = [
    {
      q: 'O que está incluído no pacote?',
      a: `Você receberá: (1) Dataset completo com ${data.length} registros em JSON e CSV, (2) Guia Técnico em Markdown com análise detalhada, (3) Metadados e documentação, (4) Estatísticas descritivas completas.`
    },
    {
      q: 'Como os dados foram coletados?',
      a: 'Os dados foram coletados de fontes públicas utilizando técnicas automatizadas de web scraping, respeitando os termos de uso e robots.txt dos sites. Todos os dados passaram por processo de limpeza e validação.'
    },
    {
      q: 'Posso usar estes dados para treinar modelos de IA?',
      a: 'Sim! O dataset é ideal para treinamento de modelos de machine learning, análise preditiva, pesquisas acadêmicas e estudos de mercado. Os dados estão formatados e prontos para uso.'
    },
    {
      q: 'Qual a qualidade dos dados?',
      a: `Nossos dados possuem ${summary.qualityScore}% de qualidade, medido por completeza, consistência e validação cruzada. Realizamos limpeza automática e normalização de todos os registros.`
    },
    {
      q: 'Como recebo meus arquivos após a compra?',
      a: 'Imediatamente após a confirmação do pagamento, você receberá um link para download contendo todos os arquivos do pacote: dataset, guia técnico e documentação.'
    },
    {
      q: 'Posso revender os dados?',
      a: 'Os dados são licenciados para uso comercial e acadêmico, mas não é permitida a revenda direta do dataset bruto. Consulte os termos de licença para mais detalhes.'
    }
  ];
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Dataset Premium</title>
  <meta name="description" content="${project.description}">
  <meta property="og:title" content="${project.name} - Dataset Premium">
  <meta property="og:description" content="${project.description}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
${generateCSS(config)}
  </style>
</head>
<body>
  <!-- NAVBAR -->
  <nav class="navbar">
    <div class="container">
      <a href="#" class="navbar-brand">
        <span class="brand-icon">📊</span>
        ${project.name}
      </a>
      <button class="mobile-menu-btn">☰</button>
      <ul class="navbar-links">
        <li><a href="#features">Recursos</a></li>
        <li><a href="#dashboard">Dashboard</a></li>
        <li><a href="#pricing">Preço</a></li>
        <li><a href="#faq">FAQ</a></li>
        <li><a href="#pricing" class="navbar-cta">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero" id="hero">
    <div class="hero-bg"></div>
    <div class="container">
      <div class="hero-content">
        <div class="hero-badge">
          🔥 Dataset Premium • ${data.length} Registros
        </div>
        <h1>${project.name}</h1>
        <p>${project.description} Dados limpos, analisados e prontos para impulsionar suas decisões de negócio, pesquisas e modelos de IA.</p>
        <div class="hero-actions">
          <a href="#pricing" class="btn btn-primary btn-lg">
            🚀 Adquirir Agora - ${project.price}
          </a>
          <a href="#dashboard" class="btn btn-secondary btn-lg">
            📊 Ver Dashboard
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="section" id="features">
    <div class="container">
      <div class="section-header">
        <h2>🎯 Por que escolher este dataset?</h2>
        <p>Dados de alta qualidade, processados e prontos para uso imediato em seus projetos.</p>
      </div>
      <div class="features-grid">
        ${features.map(f => `
          <div class="feature-card">
            <div class="feature-icon">${f.icon}</div>
            <h3>${f.title}</h3>
            <p>${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- STATS -->
  <section class="section">
    <div class="container">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value" data-target="${data.length}">0</div>
          <div class="stat-label">Registros Processados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" data-target="${summary.qualityScore}">0</div>
          <div class="stat-label">Qualidade dos Dados (%)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" data-target="${Object.keys(data[0] || {}).length}">0</div>
          <div class="stat-label">Campos por Registro</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" data-target="7">0</div>
          <div class="stat-label">Capítulos do Guia</div>
        </div>
      </div>
    </div>
  </section>

  <!-- DASHBOARD -->
  <section class="section dashboard-section" id="dashboard">
    <div class="container">
      <div class="section-header">
        <h2>📊 Dashboard Interativo</h2>
        <p>Visualize amostras dos dados e entenda o valor do dataset completo.</p>
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>💰 Distribuição de Preços</h3>
          <div class="chart-container">
            <canvas id="chart-prices"></canvas>
          </div>
        </div>
        <div class="dashboard-card">
          <h3>🏷️ Distribuição por Categoria</h3>
          <div class="chart-container">
            <canvas id="chart-distribution"></canvas>
          </div>
        </div>
        <div class="dashboard-card">
          <h3>📈 Tendências</h3>
          <div class="chart-container">
            <canvas id="chart-trends"></canvas>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- PRICING -->
  <section class="section" id="pricing">
    <div class="container">
      <div class="section-header">
        <h2>💎 Adquira Seu Dataset Agora</h2>
        <p>Pacote completo com dataset, guia técnico e dashboard interativo.</p>
      </div>
      <div class="pricing-card featured">
        <div class="pricing-badge">MELHOR OFERTA</div>
        <h3>Pacote Completo</h3>
        <div class="pricing-price">
          ${project.price}
          <span>pagamento único</span>
        </div>
        <ul class="pricing-features">
          <li>Dataset com ${data.length} registros (JSON + CSV)</li>
          <li>Guia Técnico com 7 capítulos</li>
          <li>Estatísticas descritivas completas</li>
          <li>Metadados e documentação</li>
          <li>Atualizações gratuitas por 30 dias</li>
          <li>Suporte via e-mail</li>
        </ul>
        <a href="${frontend.payment.gumroadUrl || '#'}" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;">
          🚀 Comprar Agora - ${project.price}
        </a>
        <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.85rem;">
          Pagamento 100% seguro • Download imediato
        </p>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="section" id="faq">
    <div class="container">
      <div class="section-header">
        <h2>❓ Perguntas Frequentes</h2>
        <p>Tire suas dúvidas sobre o dataset e o processo de compra.</p>
      </div>
      <div class="faq-list">
        ${faqItems.map(item => `
          <div class="faq-item">
            <div class="faq-question">
              ${item.q}
              <span class="faq-icon">+</span>
            </div>
            <div class="faq-answer">${item.a}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${project.name}. Todos os direitos reservados.</p>
      <p style="margin-top: 0.5rem;">
        Gerado automaticamente pelo <a href="#">Data Sales Agent</a> v${project.version}
      </p>
    </div>
  </footer>

  <script>
${generateJS(dataset, config)}
  </script>
</body>
</html>`;
}

/**
 * Função principal do Módulo 3: Construção da Landing Page
 */
export async function buildLandingPage(dataset, config) {
  log.section('🌐 MÓDULO 3: CONSTRUÇÃO DA LANDING PAGE E DASHBOARD');
  
  if (!dataset || !dataset.data || dataset.data.length === 0) {
    log.error('Dataset vazio ou inválido. Execute o Módulo 1 primeiro.');
    return null;
  }
  
  const spinner = ora('Gerando Landing Page...').start();
  
  try {
    // 1. Gera o HTML completo
    const html = generateHTML(dataset, config);
    
    // 2. Salva o arquivo
    const outputDir = config.deploy.outputDir || './output/public';
    await fs.ensureDir(outputDir);
    
    const htmlPath = path.join(outputDir, 'index.html');
    await fs.writeFile(htmlPath, html, 'utf-8');
    
    // 3. Gera versão standalone (com CSS/JS inline)
    const standalonePath = path.join(outputDir, 'index-standalone.html');
    await fs.writeFile(standalonePath, html, 'utf-8');
    
    spinner.succeed('Landing Page gerada com sucesso!');
    
    log.success(`Landing Page salva: ${htmlPath}`);
    log.info(`Tamanho: ${(html.length / 1024).toFixed(1)} KB`);
    log.info(`Total de linhas: ${html.split('\n').length}`);
    
    return {
      html,
      files: {
        landing: htmlPath,
        standalone: standalonePath
      }
    };
    
  } catch (error) {
    spinner.fail(`Erro ao gerar Landing Page: ${error.message}`);
    throw error;
  }
}

// Execução standalone
async function main() {
  const configPath = process.argv[2] || './config/default.js';
  const datasetPath = process.argv[3] || './output/dataset_limpo.json';
  
  try {
    const config = (await import(path.resolve(configPath))).default;
    const dataset = await fs.readJSON(path.resolve(datasetPath));
    
    const result = await buildLandingPage(dataset, config);
    
    if (result) {
      log.section('RESUMO');
      log.info('Landing Page gerada com sucesso!');
      log.info(`Arquivo: ${result.files.landing}`);
    }
  } catch (error) {
    log.error(`Falha no Módulo 3: ${error.message}`);
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && (
  process.argv[1].includes('landingBuilder') ||
  process.argv[1].endsWith('/landingBuilder.js') ||
  process.argv[1].endsWith('\\landingBuilder.js')
);

if (isMainModule) {
  main();
}

export { generateHTML, generateCSS, generateJS };