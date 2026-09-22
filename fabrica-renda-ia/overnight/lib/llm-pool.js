/**
 * 🧠 LLM Pool — Rotação e fallback entre providers
 *
 * Tenta os providers na ordem definida em providers.json.
 * Se todos falharem → retorna null (o handler decide: template ou pular).
 * Nunca lança exceção para cima: a noite não pode parar por causa de 1 provider.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'providers.json'), 'utf-8'));

async function chamarOllama(p, prompt, opts) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), p.timeoutMs);
  try {
    const res = await fetch(`${p.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: p.modelo,
        prompt: opts.sistema ? `${opts.sistema}\n\n${prompt}` : prompt,
        stream: false,
        options: { temperature: opts.temperature ?? 0.7, num_predict: opts.maxTokens ?? p.maxTokens }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response?.trim() || null;
  } finally {
    clearTimeout(t);
  }
}

async function chamarOpenAICompativel(p, prompt, opts) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), p.timeoutMs);
  try {
    const messages = [];
    if (opts.sistema) messages.push({ role: 'system', content: opts.sistema });
    messages.push({ role: 'user', content: prompt });
    const res = await fetch(`${p.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${p.apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: p.modelo,
        messages,
        max_tokens: opts.maxTokens ?? p.maxTokens,
        temperature: opts.temperature ?? 0.7
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Gera texto tentando providers em ordem.
 * @returns {Promise<{texto: string|null, provider: string|null, tentativas: string[]}>}
 */
export async function gerarNoPool(prompt, opts = {}) {
  const tentativas = [];

  for (const nome of CONFIG.ordem) {
    const p = CONFIG.providers[nome];
    if (!p || !p.enabled) { tentativas.push(`${nome}: desabilitado`); continue; }

    try {
      const inicio = Date.now();
      const texto = p.tipo === 'ollama'
        ? await chamarOllama(p, prompt, opts)
        : await chamarOpenAICompativel(p, prompt, opts);

      const seg = ((Date.now() - inicio) / 1000).toFixed(1);
      if (texto && texto.length > 30) {
        tentativas.push(`${nome}: OK (${seg}s)`);
        return { texto, provider: nome, tentativas };
      }
      tentativas.push(`${nome}: resposta vazia/curta (${seg}s)`);
    } catch (err) {
      tentativas.push(`${nome}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    }
  }

  return { texto: null, provider: null, tentativas };
}

/** Lista status dos providers sem chamar geração (para o dashboard) */
export function statusPool() {
  return CONFIG.ordem.map(nome => {
    const p = CONFIG.providers[nome];
    return { nome, enabled: !!p?.enabled, modelo: p?.modelo, custo: p?.custo };
  });
}
