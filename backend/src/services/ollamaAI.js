'use strict';
// ══════════════════════════════════════════════════════════════
// NAJAH OLLAMA SERVICE — Local AI Fallback (Free, No API Key)
// Runs local models via Ollama: gemma2:2b, llama3.2:3b, phi3:mini
// ══════════════════════════════════════════════════════════════
const axios  = require('axios');
const logger = require('../utils/logger');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';

// Cache availability result — reset every 5 minutes after a failure
let _available = null;

async function isAvailable() {
  if (_available === false) return false;
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    _available = true;
    return true;
  } catch {
    _available = false;
    setTimeout(() => { _available = null; }, 5 * 60 * 1000);
    return false;
  }
}

// Simplified system prompt (fewer tokens than Gemini's full prompt)
const OLLAMA_SYSTEM = `أنت نجاح AI، مساعد تعليمي مصري ذكي وودود.
ساعد الطلاب في المناهج المصرية بأسلوب واضح وبسيط.
إذا كان السؤال بالعربية، أجب بالعربية. إذا بالإنجليزية، أجب بالإنجليزية.
اشرح خطوة بخطوة مع أمثلة من الحياة اليومية المصرية.
لا تعطِ إجابات الامتحانات مباشرة — علّم الطالب كيف يصل إليها.`;

// ── Non-streaming chat ─────────────────────────────────────────
async function chat(message, history = [], language = 'ar') {
  if (!(await isAvailable())) throw new Error('OLLAMA_NOT_AVAILABLE');

  const messages = [
    { role: 'system', content: OLLAMA_SYSTEM },
    // Keep last 6 messages to avoid filling context
    ...history.slice(-6).map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    })),
    { role: 'user', content: message },
  ];

  const response = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model:    OLLAMA_MODEL,
      messages,
      stream:   false,
      options: {
        temperature: 0.7,
        num_predict: 1024,
        num_ctx:     4096,
      },
    },
    { timeout: 60000 }
  );

  return response.data.message?.content || '';
}

// ── Streaming chat ─────────────────────────────────────────────
async function chatStream(message, history = [], res) {
  if (!(await isAvailable())) {
    res.write(`data: ${JSON.stringify({ error: 'OLLAMA_NOT_AVAILABLE' })}\n\n`);
    res.end();
    return;
  }

  const messages = [
    { role: 'system', content: OLLAMA_SYSTEM },
    ...history.slice(-6).map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    })),
    { role: 'user', content: message },
  ];

  const response = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model:   OLLAMA_MODEL,
      messages,
      stream:  true,
      options: { temperature: 0.7, num_predict: 1024 },
    },
    { timeout: 60000, responseType: 'stream' }
  );

  let fullText = '';
  for await (const chunk of response.data) {
    try {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        const text = data.message?.content || '';
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        }
        if (data.done) {
          res.write(`data: ${JSON.stringify({ done: true, fullText, provider: 'ollama-' + OLLAMA_MODEL })}\n\n`);
          res.end();
          return;
        }
      }
    } catch { /* ignore parse errors on partial chunks */ }
  }
  // Safety net if done never fires
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ done: true, fullText, provider: 'ollama-' + OLLAMA_MODEL })}\n\n`);
    res.end();
  }
}

module.exports = { chat, chatStream, isAvailable, OLLAMA_MODEL };
