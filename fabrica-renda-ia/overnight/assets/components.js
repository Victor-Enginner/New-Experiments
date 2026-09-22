/**
 * 🎨 ARSENAL DE ASSETS VISUAIS — componentes originais, estilo premium
 *
 * Inspirado nos padrões de design de shadcn/ui, Magic UI e ReactBits
 * (todos MIT), mas com código 100% próprio — livre para uso comercial,
 * zero dependência de build, funciona em HTML puro (CSS + vanilla JS).
 *
 * Cada asset exporta: { css, html, js } prontos para compor uma página.
 * Fontes oficiais para expandir o arsenal: ver assets/registry.json
 */

// ============ BACKGROUNDS ============

export const bgAurora = {
  nome: 'Aurora Gradient',
  css: `
.bg-aurora { position: relative; overflow: hidden; background: #0a0a12; }
.bg-aurora::before, .bg-aurora::after {
  content: ''; position: absolute; width: 60vw; height: 60vw; border-radius: 50%;
  filter: blur(120px); opacity: .35; animation: aurora-drift 18s ease-in-out infinite alternate;
}
.bg-aurora::before { background: #4f46e5; top: -20%; left: -10%; }
.bg-aurora::after { background: #06b6d4; bottom: -30%; right: -10%; animation-delay: -9s; }
@keyframes aurora-drift {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(8vw, 5vh) scale(1.15); }
  100% { transform: translate(-5vw, -8vh) scale(0.95); }
}
.bg-aurora > * { position: relative; z-index: 1; }`,
  html: '<!-- envolva a seção com class="bg-aurora" -->',
  js: ''
};

export const bgDotGrid = {
  nome: 'Dot Grid com Spotlight',
  css: `
.bg-dotgrid { position: relative; background: #09090f; }
.bg-dotgrid::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.14) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%);
}
.bg-dotgrid > * { position: relative; z-index: 1; }`,
  html: '<!-- envolva a seção com class="bg-dotgrid" -->',
  js: ''
};

export const bgParticles = {
  nome: 'Particles Canvas (constelação)',
  css: `.bg-particles { position: relative; background: #050510; } .bg-particles canvas { position: absolute; inset: 0; } .bg-particles > *:not(canvas) { position: relative; z-index: 1; }`,
  html: '<canvas data-particles></canvas>',
  js: `
document.querySelectorAll('canvas[data-particles]').forEach(cv => {
  const ctx = cv.getContext('2d'); let pts = [], W, H;
  function resize() { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight;
    pts = Array.from({length: Math.min(80, W/14)}, () => ({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4 }));
  }
  resize(); addEventListener('resize', resize);
  (function loop() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => { p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W) p.vx*=-1; if(p.y<0||p.y>H) p.vy*=-1;
      ctx.fillStyle='rgba(139,148,255,.8)'; ctx.beginPath(); ctx.arc(p.x,p.y,1.4,0,7); ctx.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy);
      if(d<110){ ctx.strokeStyle=\`rgba(99,102,241,\${(1-d/110)*.35})\`; ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
    }
    requestAnimationFrame(loop);
  })();
});`
};

export const bgGridLines = {
  nome: 'Grid Lines (perspectiva 3D)',
  css: `
.bg-gridlines { position: relative; background: #0a0a14; overflow: hidden; }
.bg-gridlines::before {
  content: ''; position: absolute; inset: -50% -20% 40%;
  background-image: linear-gradient(rgba(99,102,241,.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.25) 1px, transparent 1px);
  background-size: 48px 48px;
  transform: perspective(500px) rotateX(55deg);
  animation: grid-move 8s linear infinite;
}
@keyframes grid-move { from { background-position-y: 0; } to { background-position-y: 48px; } }
.bg-gridlines > * { position: relative; z-index: 1; }`,
  html: '<!-- envolva a seção com class="bg-gridlines" -->',
  js: ''
};

// ============ COMPONENTES ============

export const glassCard = {
  nome: 'Glass Card (glassmorphism)',
  css: `
.glass-card {
  background: rgba(255,255,255,.05); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 28px;
  transition: transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s;
}
.glass-card:hover { transform: translateY(-6px); border-color: rgba(139,148,255,.45); box-shadow: 0 20px 50px -20px rgba(99,102,241,.4); }`,
  html: '<div class="glass-card"><!-- conteúdo --></div>',
  js: ''
};

export const tiltCard = {
  nome: 'Tilt Card 3D (segue o mouse)',
  css: `
.tilt-card { transform-style: preserve-3d; transition: transform .15s ease-out; will-change: transform;
  background: linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 30px; }
.tilt-card .tilt-inner { transform: translateZ(30px); }`,
  html: '<div class="tilt-card" data-tilt><div class="tilt-inner"><!-- conteúdo --></div></div>',
  js: `
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - .5) * -12;
    const ry = ((e.clientX - r.left) / r.width - .5) * 12;
    card.style.transform = \`perspective(800px) rotateX(\${rx}deg) rotateY(\${ry}deg)\`;
  });
  card.addEventListener('mouseleave', () => card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)');
});`
};

export const gradientBorder = {
  nome: 'Gradient Border animado',
  css: `
@property --gb-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.gradient-border { position: relative; border-radius: 16px; padding: 2px;
  background: conic-gradient(from var(--gb-angle), #6366f1, #06b6d4, #a855f7, #6366f1);
  animation: gb-spin 4s linear infinite; }
@keyframes gb-spin { to { --gb-angle: 360deg; } }
.gradient-border > .gb-content { background: #0c0c16; border-radius: 14px; padding: 26px; height: 100%; }`,
  html: '<div class="gradient-border"><div class="gb-content"><!-- conteúdo --></div></div>',
  js: ''
};

export const gradientText = {
  nome: 'Gradient Text animado',
  css: `
.gradient-text { background: linear-gradient(90deg, #818cf8, #22d3ee, #c084fc, #818cf8);
  background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: gt-flow 6s linear infinite; }
@keyframes gt-flow { to { background-position: 300% 0; } }`,
  html: '<span class="gradient-text">Texto em destaque</span>',
  js: ''
};

export const marquee = {
  nome: 'Marquee infinito (logos/depoimentos)',
  css: `
.marquee { overflow: hidden; mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent); }
.marquee-track { display: flex; gap: 40px; width: max-content; animation: marquee-scroll 22s linear infinite; }
.marquee:hover .marquee-track { animation-play-state: paused; }
@keyframes marquee-scroll { to { transform: translateX(-50%); } }`,
  html: `<div class="marquee"><div class="marquee-track">
  <!-- DUPLIQUE os itens: o loop precisa de 2x o conteúdo -->
  <span>Item 1</span><span>Item 2</span><span>Item 3</span>
  <span>Item 1</span><span>Item 2</span><span>Item 3</span>
</div></div>`,
  js: ''
};

export const spotlightCard = {
  nome: 'Spotlight Card (brilho segue o mouse)',
  css: `
.spotlight-card { position: relative; overflow: hidden; border-radius: 18px; padding: 28px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); }
.spotlight-card::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(139,148,255,.18), transparent 65%);
  opacity: 0; transition: opacity .3s; pointer-events: none; }
.spotlight-card:hover::before { opacity: 1; }`,
  html: '<div class="spotlight-card" data-spotlight><!-- conteúdo --></div>',
  js: `
document.querySelectorAll('[data-spotlight]').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});`
};

export const revealScroll = {
  nome: 'Reveal on Scroll (fade-up)',
  css: `
.reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1); }
.reveal.visible { opacity: 1; transform: translateY(0); }`,
  html: '<!-- adicione class="reveal" nos elementos -->',
  js: `
const obs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));`
};

export const counter = {
  nome: 'Counter animado (números sobem)',
  css: '',
  html: '<span class="gradient-text" data-counter="97" data-suffix="%">0%</span>',
  js: `
document.querySelectorAll('[data-counter]').forEach(el => {
  const alvo = +el.dataset.counter, suf = el.dataset.suffix || '';
  const obs2 = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; obs2.unobserve(el);
    const t0 = performance.now();
    (function tick(t) { const p = Math.min(1, (t - t0) / 1600);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(tick); })(t0);
  }), { threshold: .5 });
  obs2.observe(el);
});`
};

// ============ CATÁLOGO ============

export const BACKGROUNDS = { bgAurora, bgDotGrid, bgParticles, bgGridLines };
export const COMPONENTES = { glassCard, tiltCard, gradientBorder, gradientText, marquee, spotlightCard, revealScroll, counter };

/** Monta CSS+JS finais a partir de uma lista de ids de assets */
export function comporAssets(ids) {
  const todos = { ...BACKGROUNDS, ...COMPONENTES };
  let css = '', js = '';
  for (const id of ids) {
    if (todos[id]) { css += todos[id].css + '\n'; js += todos[id].js + '\n'; }
  }
  return { css, js };
}
