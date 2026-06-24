'use strict';
// ══════════════════════════════════════════════════════════════
// NAJAH GROQ AI SERVICE — Fast LLM fallback via Groq Cloud
// Uses OpenAI-compatible SDK pointing at api.groq.com
// Free tier: 14,400 req/day on llama-3.3-70b-versatile
// ══════════════════════════════════════════════════════════════
const logger = require('../utils/logger');

let groqClient = null;
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // best free-tier model

if (process.env.GROQ_API_KEY) {
  try {
    const { OpenAI } = require('openai');
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    logger.info(`✅ Groq AI initialized (model: ${GROQ_MODEL})`);
  } catch (err) {
    logger.error('❌ Groq init error:', err.message);
  }
} else {
  logger.info('ℹ️  GROQ_API_KEY not set — Groq AI unavailable');
}

function isAvailable() { return !!groqClient; }

// ── System prompt (mirrors Gemini persona) ────────────────────
const SYSTEM = `أنت نجاح AI — مساعد تعليمي ذكي للطلاب والمعلمين في مصر والوطن العربي.
اسمك: نجاح AI. أسلوبك: مثل أفضل أستاذ مصري — يشرح ببساطة ويضرب أمثلة من الحياة.
قواعد اللغة: إذا كتب الطالب بالعربية → أجب بالعربية. إذا كتب بالإنجليزية → أجب بالإنجليزية.`;

// ── Chat (non-streaming) ──────────────────────────────────────
async function chat(message, history = [], language = 'ar') {
  if (!groqClient) throw new Error('GROQ_NOT_AVAILABLE');

  const messages = [{ role: 'system', content: SYSTEM }];

  // Append conversation history
  for (const m of history.slice(-10)) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content || '' });
    } else if (m.role === 'model') {
      messages.push({ role: 'assistant', content: m.content || '' });
    }
  }
  messages.push({ role: 'user', content: message });

  const res = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return res.choices[0]?.message?.content || '';
}

// ── Chat (streaming via SSE) ──────────────────────────────────
async function chatStream(message, history = [], res) {
  if (!groqClient) throw new Error('GROQ_NOT_AVAILABLE');

  const messages = [{ role: 'system', content: SYSTEM }];
  for (const m of history.slice(-10)) {
    const role = m.role === 'model' ? 'assistant' : (m.role === 'user' || m.role === 'assistant' ? m.role : null);
    if (role) messages.push({ role, content: m.content || '' });
  }
  messages.push({ role: 'user', content: message });

  const stream = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      fullText += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true, fullText, provider: `groq-${GROQ_MODEL}` })}\n\n`);
  res.end();
  return fullText;
}

// ── Summarize ─────────────────────────────────────────────────
async function summarize(text, language = 'en', pages = 1) {
  if (!groqClient) throw new Error('GROQ_NOT_AVAILABLE');
  const prompt = language === 'ar'
    ? `لخص هذا المحتوى التعليمي (${pages} صفحة) بشكل منظم:\n1. الفكرة الرئيسية\n2. النقاط الأساسية (5-8)\n3. المصطلحات المهمة\n4. ما يجب حفظه\n\n${text.slice(0, 10000)}`
    : `Summarize this educational content (${pages} pages):\n1. Main Idea\n2. Key Points (5-8)\n3. Important Terms\n4. What to memorize\n\n${text.slice(0, 10000)}`;

  const res = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
  });
  return res.choices[0]?.message?.content || '';
}

// ── Generate Quiz ─────────────────────────────────────────────
async function generateQuiz({ subject, topic, difficulty = 'medium', count = 10, language = 'en', context = '' }) {
  if (!groqClient) throw new Error('GROQ_NOT_AVAILABLE');
  const prompt = language === 'ar'
    ? `أنشئ بالضبط ${count} سؤال اختيار متعدد عن ${subject}${topic ? ` - ${topic}` : ''} بمستوى ${difficulty}.\nأرجع JSON فقط:\n{"questions":[{"question":"...","options":["أ)...","ب)...","ج)...","د)..."],"correct":0,"explanation":"..."}]}${context ? '\n\nالمحتوى:\n' + context.slice(0, 4000) : ''}`
    : `Create exactly ${count} MCQs about ${subject}${topic ? ` - ${topic}` : ''} at ${difficulty} difficulty.\nReturn ONLY JSON:\n{"questions":[{"question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"explanation":"..."}]}${context ? '\n\nContent:\n' + context.slice(0, 4000) : ''}`;

  const res = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });
  const text = res.choices[0]?.message?.content?.trim() || '{}';
  return JSON.parse(text);
}

// ── Study Plan ────────────────────────────────────────────────
async function generateStudyPlan({ subject, daysUntil, dailyHours = 2, currentLevel = 'intermediate', language = 'ar' }) {
  if (!groqClient) throw new Error('GROQ_NOT_AVAILABLE');
  const prompt = language === 'ar'
    ? `أنشئ خطة دراسية لـ "${subject}": ${daysUntil} يوم، ${dailyHours} ساعة/يوم، مستوى: ${currentLevel}.\nأرجع JSON:\n{"plan":[{"day":1,"date":"YYYY-MM-DD","sessions":[{"time":"HH:MM","duration":60,"topic":"...","goal":"...","type":"study"}]}],"tips":["..."],"totalHours":${daysUntil * dailyHours}}`
    : `Create a study plan for "${subject}": ${daysUntil} days, ${dailyHours} hrs/day, level: ${currentLevel}.\nReturn ONLY JSON:\n{"plan":[{"day":1,"date":"YYYY-MM-DD","sessions":[{"time":"HH:MM","duration":60,"topic":"...","goal":"...","type":"study"}]}],"tips":["..."],"totalHours":${daysUntil * dailyHours}}`;

  const res = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });
  const text = res.choices[0]?.message?.content?.trim() || '{}';
  return JSON.parse(text);
}

module.exports = { chat, chatStream, summarize, generateQuiz, generateStudyPlan, isAvailable, model: GROQ_MODEL };
