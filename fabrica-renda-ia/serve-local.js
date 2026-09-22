#!/usr/bin/env node
/**
 * 🖥️ Serve Local — fabrica-renda-ia (LOCAL-FIRST, sem Vercel)
 *
 * Serve TUDO que a fábrica gera, numa página-índice só:
 *   produtos/            → packs de prompts, e-books
 *   overnight/output/    → landings 3D, briefs, anúncios
 *   ../data-sales-agent/output/ → datasets + landings (se existir)
 *
 * Uso:
 *   node serve-local.js              → http://127.0.0.1:5173
 *   PORT=8080 node serve-local.js
 *
 * Zero dependências (http nativo).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';

const RAIZES = [
  ['produtos', path.join(__dirname, 'produtos')],
  ['sites-3d', path.join(__dirname, 'overnight', 'output')],
  ['datasets', path.join(__dirname, '..', 'data-sales-agent', 'output')],
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function listarArquivos(dir, base = '', nivel = 0) {
  if (nivel > 3 || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    if (e.startsWith('.') || e === 'node_modules') continue;
    const abs = path.join(dir, e);
    const rel = base ? `${base}/${e}` : e;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const idx = path.join(abs, 'index.html');
      out.push({ rel, abs, dir: true, index: fs.existsSync(idx) });
      out.push(...listarArquivos(abs, rel, nivel + 1));
    } else if (/\.(html|md|json|csv)$/i.test(e)) {
      out.push({ rel, abs, dir: false });
    }
  }
  return out.slice(0, 200);
}

function paginaIndice() {
  const blocos = RAIZES.map(([nome, dir]) => {
    if (!fs.existsSync(dir)) return `<h2>📦 ${nome}</h2><p class="dim">pasta ausente: ${dir}</p>`;
    const itens = listarArquivos(dir);
    if (!itens.length) return `<h2>📦 ${nome}</h2><p class="dim">vazio — gere com <code>node main.js --agente ...</code></p>`;
    const lis = itens.map((it) => {
      const url = `/${nome}/${it.rel}`;
      const icone = it.dir ? '📁' : it.rel.endsWith('.html') ? '🌐' : '📄';
      const link = it.dir && it.index ? `/${nome}/${it.rel}/index.html` : url;
      return `<li>${icone} <a href="${link}">${it.rel}</a></li>`;
    }).join('\n');
    return `<h2>📦 ${nome} <span class="dim">(${dir})</span></h2><ul>${lis}</ul>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fábrica de Renda IA — Vitrine Local</title>
<style>body{font-family:system-ui;background:#0b0f1a;color:#e2e8f0;max-width:900px;margin:0 auto;padding:2rem 1.25rem;line-height:1.6}
h1{font-size:1.6rem}a{color:#22d3ee}.dim{color:#64748b;font-size:.8rem}code{background:#1e293b;padding:.1rem .4rem;border-radius:6px}
ul{columns:2;gap:2rem}li{margin:.25rem 0;break-inside:avoid}.box{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:1rem 1.25rem;margin:1rem 0}</style>
</head><body>
<h1>🏭 Fábrica de Renda IA — Vitrine Local <span class="dim">(sem Vercel)</span></h1>
<div class="box">🖥️ Tudo servido desta máquina. Gere → revise → sirva → venda via link de pagamento externo (Hotmart/Kiwify/Gumroad/Pix/WhatsApp).<br>
<span class="dim">Comandos: <code>node main.js --agente prompts --nicho ia-advocacia</code> · <code>node main.js --agente ebooks --nicho ia-advocacia</code> · <code>node main.js --agente datasets</code></span></div>
${blocos}
</body></html>`;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(paginaIndice());
    return;
  }
  const [_, raiz, ...resto] = urlPath.split('/');
  const root = RAIZES.find(([n]) => n === raiz);
  if (!root) { res.writeHead(404); res.end('404'); return; }
  let abs = path.normalize(path.join(root[1], resto.join('/')));
  if (!abs.startsWith(root[1])) { res.writeHead(403); res.end('403'); return; }
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
  if (!fs.existsSync(abs)) { res.writeHead(404); res.end('404 — gere o produto primeiro'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(abs).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(abs).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`\n🏭 Fábrica servindo LOCAL (sem Vercel)`);
  console.log(`   URL: http://${HOST}:${PORT}/`);
  console.log(`   Raízes: ${RAIZES.map(([, d]) => d).join(' | ')}\n`);
});
