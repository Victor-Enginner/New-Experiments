/**
 * 🌐 TEMPLATE: Landing Page 3D Premium
 *
 * Compõe os assets do arsenal (backgrounds + componentes) em uma
 * landing page completa de vendas. Recebe um "brief" (dados do produto)
 * e devolve HTML standalone (CSS e JS inline — pronto p/ deploy).
 */

import { comporAssets } from '../assets/components.js';

/**
 * @param {Object} brief
 * @param {string} brief.produto      - Nome do produto
 * @param {string} brief.headline     - Frase principal
 * @param {string} brief.dor          - Problema que resolve
 * @param {string[]} brief.beneficios - Lista de benefícios (3-6)
 * @param {string} brief.preco        - Ex: "R$ 47,00"
 * @param {string} brief.linkPagamento- URL Gumroad/Hotmart/Stripe
 * @param {string} brief.background   - bgAurora | bgDotGrid | bgParticles | bgGridLines
 * @param {string} brief.paleta       - chave de registry.paletas_premium
 * @param {string[]} brief.provas     - Provas sociais / stats (opcional)
 */
export function renderLanding3D(brief) {
  const {
    produto, headline, dor, beneficios = [], preco,
    linkPagamento = '#', background = 'bgAurora',
    provas = [], autoridade = ''
  } = brief;

  const assetsUsados = [background, 'glassCard', 'tiltCard', 'gradientBorder', 'gradientText', 'spotlightCard', 'revealScroll', 'counter', 'marquee'];
  const { css, js } = comporAssets(assetsUsados);

  const statsHtml = provas.length ? `
  <section class="reveal" style="display:flex; gap:48px; justify-content:center; flex-wrap:wrap; padding:20px 0 10px;">
    ${provas.map(p => `<div style="text-align:center;">
      <div class="gradient-text" style="font-size:2.6em; font-weight:800;" data-counter="${p.numero}" data-suffix="${p.sufixo || ''}">0${p.sufixo || ''}</div>
      <div style="color:#94a3b8; font-size:.95em;">${p.rotulo}</div>
    </div>`).join('')}
  </section>` : '';

  const marqueeHtml = beneficios.length >= 4 ? `
  <div class="marquee reveal" style="padding:26px 0; color:#a5b4fc; font-weight:600; letter-spacing:.5px;">
    <div class="marquee-track">
      ${[...beneficios, ...beneficios].map(b => `<span>✦ ${b}</span>`).join('')}
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${produto}</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: #e2e8f0; background: #0a0a12; }
  .container { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  .hero { min-height: 92vh; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: 80px 0 40px; }
  .badge { display: inline-block; background: rgba(99,102,241,.15); border: 1px solid rgba(139,148,255,.35); color: #a5b4fc; padding: 7px 18px; border-radius: 999px; font-size: .82em; font-weight: 600; letter-spacing: .6px; margin-bottom: 28px; }
  h1 { font-size: clamp(2.2em, 5.5vw, 4em); font-weight: 800; line-height: 1.12; letter-spacing: -1.5px; }
  .dor { font-size: 1.25em; color: #94a3b8; max-width: 640px; margin: 26px auto 0; line-height: 1.65; }
  .btn-cta { display: inline-block; margin-top: 40px; background: linear-gradient(90deg, #6366f1, #06b6d4); color: #fff; font-weight: 700; font-size: 1.15em; padding: 18px 52px; border-radius: 14px; text-decoration: none; transition: transform .25s, box-shadow .25s; box-shadow: 0 10px 40px -10px rgba(99,102,241,.6); }
  .btn-cta:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 50px -10px rgba(99,102,241,.8); }
  .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; padding: 60px 0; }
  h2 { font-size: 2em; text-align: center; font-weight: 800; letter-spacing: -1px; }
  .secao { padding: 70px 0; }
  .preco-card { max-width: 480px; margin: 0 auto; text-align: center; }
  .preco-valor { font-size: 3.4em; font-weight: 800; margin: 18px 0 6px; }
  .autoridade { text-align: center; color: #64748b; font-size: .9em; padding: 30px 0 60px; }
  footer { text-align: center; color: #475569; font-size: .82em; padding: 30px; border-top: 1px solid rgba(255,255,255,.06); }
  ${css}
</style>
</head>
<body>

<!-- HERO -->
<section class="${background === 'bgParticles' ? 'bg-particles' : background === 'bgDotGrid' ? 'bg-dotgrid' : background === 'bgGridLines' ? 'bg-gridlines' : 'bg-aurora'}">
  ${background === 'bgParticles' ? '<canvas data-particles></canvas>' : ''}
  <div class="container hero">
    <span class="badge reveal">✨ NOVO · ${produto.toUpperCase()}</span>
    <h1 class="reveal">${headline.replace(/(\*.*?\*)/g, '<span class="gradient-text">$1</span>').replace(/\*/g, '')}</h1>
    <p class="dor reveal">${dor}</p>
    <div class="reveal"><a class="btn-cta" href="${linkPagamento}">QUERO AGORA →</a></div>
  </div>
  ${marqueeHtml}
</section>

${statsHtml}

<!-- BENEFÍCIOS 3D -->
<section class="secao container">
  <h2 class="reveal">O que você <span class="gradient-text">leva</span></h2>
  <div class="grid-cards">
    ${beneficios.slice(0, 6).map((b, i) => `
    <div class="${i % 2 === 0 ? 'tilt-card' : 'spotlight-card'} reveal" ${i % 2 === 0 ? 'data-tilt' : 'data-spotlight'}>
      ${i % 2 === 0 ? '<div class="tilt-inner">' : ''}
        <div style="font-size:1.8em; margin-bottom:14px;">${['🎯','⚡','🧠','🛡️','📈','🚀'][i] || '✦'}</div>
        <h3 style="font-size:1.1em; margin-bottom:10px;">${b}</h3>
        <p style="color:#94a3b8; font-size:.92em; line-height:1.6;">Aplicável hoje, sem instalação complexa e com exemplos reais do seu dia a dia.</p>
      ${i % 2 === 0 ? '</div>' : ''}
    </div>`).join('')}
  </div>
</section>

<!-- PREÇO -->
<section class="secao container">
  <div class="gradient-border preco-card reveal">
    <div class="gb-content">
      <h2 style="font-size:1.6em;">Acesso imediato</h2>
      <div class="preco-valor gradient-text">${preco}</div>
      <p style="color:#94a3b8;">Pagamento único · Garantia incondicional de 7 dias</p>
      <a class="btn-cta" href="${linkPagamento}" style="width:100%; margin-top:26px;">COMPRAR ${produto.toUpperCase()} →</a>
    </div>
  </div>
  ${autoridade ? `<p class="autoridade reveal">🎓 ${autoridade}</p>` : ''}
</section>

<footer>© ${new Date().getFullYear()} ${produto} · Todos os direitos reservados</footer>

<script>${js}</script>
</body>
</html>`;
}
