/**
 * 📊 Servidor do Dashboard — serve dashboard.html + workflow.json
 * Zero dependências (http nativo). Uso:
 *   node dashboard-server.js  → http://localhost:3500
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTA = process.env.PORT || 3500;

const TIPOS = { '.html': 'text/html', '.json': 'application/json', '.log': 'text/plain' };

http.createServer((req, res) => {
  let arquivo = req.url.split('?')[0];
  if (arquivo === '/') arquivo = '/dashboard.html';
  const caminho = path.join(__dirname, arquivo);

  // Segurança: só serve arquivos dentro de overnight/
  if (!caminho.startsWith(__dirname) || !fs.existsSync(caminho) || fs.statSync(caminho).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(caminho)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(caminho).pipe(res);
}).listen(PORTA, () => console.log(`\n📊 Dashboard: http://localhost:${PORTA}\n   (deixe aberto — atualiza sozinho a cada 5s)\n`));
