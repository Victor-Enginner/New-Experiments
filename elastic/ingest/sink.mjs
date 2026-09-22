/**
 * sink.mjs — Fila de eventos em JSONL com tailing por offset
 *
 * Padrão do projeto (zero deps, arquivos append-only):
 *   · produtores (netwatch, egress) fazem appendSync de linhas JSON
 *   · shippers leem do offset gravado em state/ e enviam ao ES
 *
 * Exporta:
 *   appendRow(file, obj)     — grava 1 linha JSON (sync, seguro)
 *   createTailer(file, opts) — tailer com offset persistido
 */

import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from '../config.mjs';

/** Grava 1 objeto como linha JSONL (append). Cria o diretório se preciso. */
export function appendRow(file, obj) {
  const dir = file.split('/').slice(0, -1).join('/');
  mkdirSync(dir, { recursive: true });
  const row = JSON.stringify({ ts: Date.now(), '@timestamp': new Date().toISOString(), ...obj });
  appendFileSync(file, `${row}\n`);
  return row;
}

function offsetPath(file) {
  const base = stateDir();
  mkdirSync(base, { recursive: true });
  const slug = file.split('/').join('_');
  return join(base, `${slug}.offset`);
}

/**
 * Lê novas linhas de um arquivo JSONL a partir do offset persistido.
 * Retorna array de objetos. Atualiza o offset conforme lê.
 */
export function readNewLines(file) {
  const stateFile = offsetPath(file);
  let offset = 0;
  try {
    const saved = Number(readFileSync(stateFile, 'utf8') || 0);
    offset = saved;
  } catch {
    offset = 0;
  }
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return []; // arquivo ainda não existe
  }
  if (size < offset) offset = 0; // truncado/recriado
  if (size === offset) return [];
  const fd = openSync(file, 'r');
  let out = [];
  try {
    const buf = Buffer.alloc(size - offset);
    readSync(fd, buf, 0, buf.length, offset);
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        continue; // linha parcial/corrompida
      }
    }
    writeFileSync(stateFile, String(size));
  } finally {
    closeSync(fd);
  }
  return out;
}

/**
 * Cria um tailer que entrega novas linhas de um arquivo JSONL.
 * O offset é persistido entre execuções (não perde eventos).
 *
 * @param {string} file
 * @param {Object} [opts]  { onLines(file, objs), intervalMs, fromStart }
 */
export function createTailer(file, { onLines, intervalMs = 2000, fromStart = false } = {}) {
  return {
    start() {
      if (fromStart) {
        try { writeFileSync(offsetPath(file), '0'); } catch { /* ok */ }
      }
      setInterval(() => {
        const lines = readNewLines(file);
        if (lines.length && onLines) onLines(file, lines);
      }, intervalMs);
      setTimeout(() => {
        const lines = readNewLines(file);
        if (lines.length && onLines) onLines(file, lines);
      }, 0);
      return this;
    },
  };
}

export default { appendRow, createTailer, readNewLines };
