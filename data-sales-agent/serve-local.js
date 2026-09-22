#!/usr/bin/env node
/**
 * 🖥️ Serve Local — data-sales-agent (LOCAL-FIRST, sem Vercel)
 *
 * Serve ./output/ via http nativo (zero dependências).
 * Uso:
 *   node serve-local.js              → http://127.0.0.1:4173
 *   PORT=8080 node serve-local.js    → porta customizada
 *
 * O que serve:
 *   /                  → public/index.html (landing principal)
 *   /index-standalone.html, /dataset_limpo.json/.csv, /guia_tecnico.md
 *   /datasets/[slug]/  → landings individuais do Módulo 4
 *   /listing-kaggle.md, /product-descriptions.md
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve outputDir do config (sem importar chalk/ora)
let outputDir = path.join(__dirname, 'output');
try {
  const cfg = (await import(path.join(__dirname, 'config', 'default.js'))).default;
  if (cfg?.deploy?.outputDir) outputDir = path.resolve(__dirname, cfg.deploy.outputDir);
} catch { /* usa padrão */ }

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function resolver(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  // / → public/index.html (novo) com fallback p/ index.html (legado)
  if (p === '/') {
    if (fs.existsSync(path.join(outputDir, 'public', 'index.html'))) p = '/public/index.html';
    else p = '/index.html';
  }
  if (p.endsWith('/')) p += 'index.html';
  const abs = path.normalize(path.join(outputDir, p));
  if (!abs.startsWith(outputDir)) return null; // traversal
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    const idx = path.join(abs, 'index.html');
    return fs.existsSync(idx) ? idx : null;
  }
  return abs;
}

http.createServer((req, res) => {
  const arq = resolver(req.url || '/');
  if (!arq || !fs.existsSync(arq)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — rode `node main.js` primeiro para gerar ./output/\n');
    return;
  }
  res.writeHead(200, {
    'Content-Type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(arq).pipe(res);
}).listen(PORT, HOST, () => {
  console.log(`\n🖥️  data-sales-agent servindo LOCAL (sem Vercel)`);
  console.log(`   Pasta: ${outputDir}`);
  console.log(`   URL:   http://${HOST}:${PORT}/\n`);
});
