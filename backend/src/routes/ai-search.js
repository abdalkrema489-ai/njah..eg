// ═══════════════════════════════════════════════════════════════
// src/routes/ai-search.js — Najah AI with Internet Search
// Powered by Google Gemini 2.0 Flash + Web Search APIs
// ═══════════════════════════════════════════════════════════════
'use strict';

const express = require('express');
const axios   = require('axios');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { aiLimiter }    = require('../middleware/rateLimiter');
const logger           = require('../utils/logger');

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const SERPAPI_KEY       = process.env.SERPAPI_KEY || '';
const GEMINI_MODEL      = 'gemini-2.0-flash-exp';
const GEMINI_SEARCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

router.use(authenticate);

// ── Helper: Call Gemini with optional grounding ──
async function callGemini(systemPrompt, userMessage, useSearch = false, history = []) {
  const messages = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.95,
    },
    ...(useSearch && GEMINI_API_KEY ? {
      tools: [{ google_search: {} }]
    } : {})
  };

  const resp = await axios.post(GEMINI_SEARCH_URL, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  const candidate = resp.data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
  const groundingMetadata = candidate?.groundingMetadata || null;
  const searchResults = groundingMetadata?.groundingChunks?.map(c => ({
    title: c.web?.title,
    url:   c.web?.uri,
  })) || [];

  return { text, searchResults, groundingMetadata };
}

// ── Helper: DuckDuckGo search fallback ──
async function duckDuckGoSearch(query) {
  try {
    const resp = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
      timeout: 8000
    });
    const data = resp.data;
    const results = [];
    if (data.AbstractText) results.push({ title: data.Heading, snippet: data.AbstractText, url: data.AbstractURL });
    (data.RelatedTopics || []).slice(0, 5).forEach(t => {
      if (t.Text) results.push({ title: t.Text.split(' - ')[0], snippet: t.Text, url: t.FirstURL });
    });
    return results;
  } catch {
    return [];
  }
}

// ── System prompt for the Najah AI ──
const NAJAH_SYSTEM = `You are Najah AI — an advanced educational intelligence assistant for the Najah learning platform.
You are powered by Google Gemini and have real-time internet access to search for up-to-date information.

Your capabilities:
• Answer academic questions across all subjects (Math, Science, Arabic, English, History, etc.)
• Search the internet for current news, events, and information
• Explain complex concepts clearly with step-by-step breakdowns
• Generate study materials, summaries, and quiz questions
• Provide multiple languages support (Arabic and English)
• Help with homework, research, and exam preparation

When responding:
• Be encouraging and supportive of students
• Use markdown formatting for clarity (headers, bullet points, code blocks)
• For mathematical equations, use clear notation
• Cite your sources when using internet search results
• Keep responses educational and appropriate for all ages
• If uncertain, say so and suggest verifying information

You always respond in the same language the user writes in (Arabic or English).`;

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/chat — Main AI chat with optional web search
// ════════════════════════════════════════════════════════════════
router.post('/chat', aiLimiter, async (req, res) => {
  const { message, history = [], useWebSearch = false, subject } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  try {
    const systemPrompt = subject
      ? `${NAJAH_SYSTEM}\n\nCurrent subject focus: ${subject}`
      : NAJAH_SYSTEM;

    // Convert history format
    const formattedHistory = history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const { text, searchResults } = await callGemini(
      systemPrompt,
      message,
      useWebSearch,
      formattedHistory
    );

    res.json({
      success: true,
      message: text,
      searchResults,
      model: GEMINI_MODEL,
      usedWebSearch: useWebSearch
    });
  } catch (err) {
    logger.error('[AI Search Chat Error]', { error: err.response?.data || err.message });
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/search — Explicit web search + AI synthesis
// ════════════════════════════════════════════════════════════════
router.post('/search', aiLimiter, async (req, res) => {
  const { query, synthesize = true } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Search query required' });

  try {
    let webResults = [];
    let aiSynthesis = '';
    let searchResults = [];

    // Try Gemini with Google Search grounding first
    try {
      const { text, searchResults: gResults } = await callGemini(
        `${NAJAH_SYSTEM}\n\nYou have been given a search query. Use Google Search to find current, accurate information and provide a comprehensive, well-organized answer with citations.`,
        `Search query: "${query}"\n\nPlease search for this topic and provide a comprehensive summary with key facts, recent developments, and relevant information.`,
        true
      );
      aiSynthesis = text;
      searchResults = gResults;
    } catch (geminiErr) {
      // Fallback to DuckDuckGo
      webResults = await duckDuckGoSearch(query);
      if (webResults.length > 0 && synthesize) {
        const context = webResults.map(r => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        const { text } = await callGemini(
          NAJAH_SYSTEM,
          `Based on these search results about "${query}", provide a comprehensive, accurate summary:\n\n${context}`,
          false
        );
        aiSynthesis = text;
        searchResults = webResults;
      }
    }

    res.json({
      success: true,
      query,
      synthesis: aiSynthesis,
      sources: searchResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('[AI Search Error]', { error: err.message });
    res.status(500).json({ error: 'Search service error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/explain — Deep explanation of any topic
// ════════════════════════════════════════════════════════════════
router.post('/explain', aiLimiter, async (req, res) => {
  const { topic, level = 'intermediate', language = 'en' } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: 'Topic required' });

  try {
    const prompt = language === 'ar'
      ? `اشرح الموضوع التالي بشكل مفصل ومنظم لمستوى ${level === 'beginner' ? 'مبتدئ' : level === 'advanced' ? 'متقدم' : 'متوسط'}: "${topic}"\n\nاستخدم:\n- مقدمة واضحة\n- شرح تفصيلي مع أمثلة\n- نقاط رئيسية\n- خلاصة\n- إذا كان الموضوع علمياً، استخدم المعادلات والرموز المناسبة`
      : `Explain the following topic in detail for a ${level} level student: "${topic}"\n\nStructure your response with:\n- Clear introduction\n- Detailed explanation with examples\n- Key points/takeaways\n- Summary\n- If scientific, include relevant formulas or notation`;

    const { text, searchResults } = await callGemini(NAJAH_SYSTEM, prompt, true);

    res.json({
      success: true,
      topic,
      explanation: text,
      sources: searchResults,
      level
    });
  } catch (err) {
    res.status(500).json({ error: 'Explanation service error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/homework — Homework solver with steps
// ════════════════════════════════════════════════════════════════
router.post('/homework', aiLimiter, async (req, res) => {
  const { question, subject, showSteps = true } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question required' });

  try {
    const prompt = `Student homework question in ${subject || 'general subject'}:

"${question}"

${showSteps ? 'Please provide:\n1. The complete, correct answer\n2. Step-by-step solution process\n3. Key concepts used\n4. Tips to remember for similar problems' : 'Provide the complete answer with brief explanation.'}

Be educational — teach the student HOW to solve it, not just the answer.`;

    const { text } = await callGemini(NAJAH_SYSTEM, prompt, false);

    res.json({ success: true, question, answer: text, subject });
  } catch (err) {
    res.status(500).json({ error: 'Homework service error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/news — Educational news and current events
// ════════════════════════════════════════════════════════════════
router.post('/news', aiLimiter, async (req, res) => {
  const { topic = 'education technology', language = 'en' } = req.body;

  try {
    const prompt = language === 'ar'
      ? `ابحث عن أحدث الأخبار والتطورات المتعلقة بـ: "${topic}"\nقدم ملخصاً للأخبار الأكثر أهمية مع المصادر.`
      : `Search for the latest news and developments about: "${topic}"\nProvide a summary of the most important recent news with sources.`;

    const { text, searchResults } = await callGemini(NAJAH_SYSTEM, prompt, true);

    res.json({
      success: true,
      topic,
      summary: text,
      sources: searchResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'News search error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/ai-search/stream — Streaming AI response (SSE)
// ════════════════════════════════════════════════════════════════
router.post('/stream', aiLimiter, async (req, res) => {
  const { message, useWebSearch = false } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
    
    const body = {
      system_instruction: { parts: [{ text: NAJAH_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      ...(useWebSearch ? { tools: [{ google_search: {} }] } : {})
    };

    const streamResp = await axios.post(streamUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: 60000
    });

    streamResp.data.on('data', chunk => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
          } catch {}
        }
      }
    });

    streamResp.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    streamResp.data.on('error', () => {
      res.write('data: [ERROR]\n\n');
      res.end();
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    res.end();
  }
});

module.exports = router;
