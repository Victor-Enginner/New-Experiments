/**
 * 🧠 Cliente LLM Unificado
 *
 * Ordem de prioridade:
 *   1. Ollama local (gratuito, offline) — detectado automaticamente
 *   2. OpenAI API (se OPENAI_API_KEY estiver definida)
 *   3. Modo template determinístico (fallback, sempre funciona)
 *
 * Uso:
 *   import { gerar, statusLLM } from './lib/llm.js';
 *   const texto = await gerar("Escreva uma introdução sobre X");
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:latest';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

let _providerCache = null;

/**
 * Detecta qual provedor de LLM está disponível (com cache)
 */
export async function statusLLM(forceRefresh = false) {
  if (_providerCache && !forceRefresh) return _providerCache;

  // 1. Tenta Ollama local
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const modelos = (data.models || []).map(m => m.name);
      if (modelos.length > 0) {
        const modelo = modelos.includes(OLLAMA_MODEL) ? OLLAMA_MODEL : modelos[0];
        _providerCache = { provider: 'ollama', modelo, modelos, custo: 'gratuito' };
        return _providerCache;
      }
    }
  } catch { /* Ollama offline */ }

  // 2. Tenta OpenAI
  if (OPENAI_KEY) {
    _providerCache = { provider: 'openai', modelo: 'gpt-4o-mini', custo: 'pago por token' };
    return _providerCache;
  }

  // 3. Fallback
  _providerCache = { provider: 'template', modelo: 'deterministico', custo: 'gratuito' };
  return _providerCache;
}

/**
 * Gera texto usando o melhor provedor disponível
 * @param {string} prompt - O prompt a enviar
 * @param {Object} opts - { maxTokens, temperature, timeoutMs, sistema }
 * @returns {Promise<string|null>} Texto gerado ou null se falhar (use fallback)
 */
export async function gerar(prompt, opts = {}) {
  const { maxTokens = 1500, temperature = 0.7, timeoutMs = 120000, sistema = null } = opts;
  const status = await statusLLM();

  if (status.provider === 'ollama') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: status.modelo,
          prompt: sistema ? `${sistema}\n\n${prompt}` : prompt,
          stream: false,
          options: { temperature, num_predict: maxTokens }
        })
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return (data.response || '').trim();
      }
    } catch (err) {
      console.warn(`⚠ Ollama falhou (${err.message}). Caindo para template.`);
      return null;
    }
  }

  if (status.provider === 'openai') {
    try {
      const messages = [];
      if (sistema) messages.push({ role: 'system', content: sistema });
      messages.push({ role: 'user', content: prompt });
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({ model: status.modelo, messages, max_tokens: maxTokens, temperature })
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (err) {
      console.warn(`⚠ OpenAI falhou (${err.message}). Caindo para template.`);
      return null;
    }
  }

  return null; // provider = template → o chamador usa seu próprio template
}

/**
 * Gera texto com fallback automático para template
 * @param {string} prompt - Prompt para o LLM
 * @param {Function} templateFn - Função que gera o conteúdo sem LLM
 * @param {Object} opts - Opções do gerar()
 */
export async function gerarComFallback(prompt, templateFn, opts = {}) {
  const llmResult = await gerar(prompt, opts);
  if (llmResult && llmResult.length > 50) return { texto: llmResult, fonte: 'llm' };
  return { texto: templateFn(), fonte: 'template' };
}
