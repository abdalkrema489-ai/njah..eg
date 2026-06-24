// src/controllers/aiController.js  — Gemini-first AI controller
'use strict';
const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');

const { pool } = require('../config/postgres');
const { AIConversation } = require('../config/mongo');
const { cacheSet, cacheGet } = require('../config/redis');
const { checkAchievements } = require('../services/achievementService');
const localAI = require('../services/localAI');
const internalAI = require('../services/internalAI');
const deepTutor = require('../services/deepTutorService');
const geminiAI  = require('../services/geminiAI');
const groqAI    = require('../services/groqAI');
const ollamaAI  = require('../services/ollamaAI');
const { clearUserMemory } = require('../services/mem0Service');
const CognitiveEngine = require('../ai/core/CognitiveEngine');
const logger = require('../utils/logger');

const cognitiveEngine = new CognitiveEngine(internalAI, deepTutor);
cognitiveEngine.init().catch(e => logger.error('Failed to init CognitiveEngine:', e));

// ── PDF text fetch ───────────────────────────────────────────
async function fetchPdfText(fileUrl, maxChars = 10000) {
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error('Failed to fetch file');
  const buf = Buffer.from(await resp.arrayBuffer());
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: TT: undefined function:')) return;
    originalWarn.apply(console, args);
  };
  try {
    const data = await pdfParse(buf);
    return { text: data.text.slice(0, maxChars), pages: data.numpages };
  } finally {
    console.warn = originalWarn;
  }
}

// ── Provider Info ────────────────────────────────────────────
async function getProvider(req, res) {
  const ollamaAvail = await ollamaAI.isAvailable();
  res.json({
    primary: geminiAI.isAvailable() ? 'gemini-2.0-flash' : ollamaAvail ? 'ollama' : 'internal',
    chain: ['gemini-2.0-flash', 'ollama-' + ollamaAI.OLLAMA_MODEL, 'internal'],
    gemini: {
      available: geminiAI.isAvailable(),
      model: 'gemini-2.0-flash',
      description: 'Google Gemini 2.0 Flash — Egyptian curriculum AI',
    },
    ollama: {
      available: ollamaAvail,
      model: ollamaAI.OLLAMA_MODEL,
      description: 'Local AI fallback (free, no API key needed)',
    },
    internal: {
      available: true,
      description: 'Egyptian curriculum pattern engine (offline fallback)',
    },
  });
}

async function getCapabilities(req, res) {
  res.json({
    engine: geminiAI.isAvailable() ? 'gemini-2.0-flash' : 'internal',
    geminiAvailable: geminiAI.isAvailable(),
    features: {
      chat: { supported: true },
      stream: { supported: geminiAI.isAvailable() },
      search: { supported: geminiAI.isAvailable() },
      summary: { supported: true },
      quiz: { supported: true },
      studyPlan: { supported: true },
      askFile: { supported: true },
      youtube: { supported: true },
      imageAnalysis: { supported: false },
    },
  });
}

// ── Helper: save/update conversation ────────────────────────
async function saveToConversation(convId, userId, userMsg, replyMsg, language, title) {
  try {
    let conv = convId
      ? await AIConversation.findOne({ _id: convId, userId })
      : null;
    if (!conv) conv = new AIConversation({ userId, messages: [], language, provider: 'gemini' });
    conv.messages.push({ role: 'user', content: userMsg });
    conv.messages.push({ role: 'assistant', content: replyMsg });
    if (!conv.title || conv.title === 'New Chat') {
      conv.title = title || userMsg.slice(0, 60);
    }
    await conv.save();
    return conv;
  } catch (err) {
    logger.warn('Conversation save failed (MongoDB may be down):', err.message);
    return null;
  }
}

// ── Chat ─────────────────────────────────────────────────────
async function chat(req, res) {
  const { message, conversationId, language = 'ar', withFollowUps = true, fileId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  let contextMessage = message;
  if (fileId) {
    try {
      const { rows } = await pool.query(
        `SELECT file_url, original_name FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
        [fileId, req.user.id]
      );
      if (rows[0]) {
        const { text } = await fetchPdfText(rows[0].file_url, 4000);
        contextMessage = `السياق من الملف المرفوع (${rows[0].original_name}):\n---\n${text}\n---\n\nسؤال الطالب: ${message}`;
      }
    } catch (err) {
      logger.error('Error attaching file context to chat:', err.message);
    }
  }

  let history = [];
  if (conversationId) {
    try {
      const conv = await AIConversation.findOne({ _id: conversationId, userId: req.user.id });
      history = conv?.messages?.slice(-10) || [];
    } catch { }
  }

  let reply = '';
  let usedProvider = '';

  const pref = req.user?.preferred_ai_provider || 'auto';

  // 1️⃣ Try Gemini if preferred or auto
  if ((pref === 'auto' || pref === 'gemini' || pref === 'claude') && geminiAI.isAvailable()) {
    try {
      const geminiRes = await geminiAI.chat(contextMessage, history, language, req.user.id);
      if (typeof geminiRes === 'object' && geminiRes !== null) {
        reply = geminiRes.text;
        usedProvider = geminiRes.model || 'gemini-1.5-flash-fallback';
      } else {
        reply = geminiRes;
        usedProvider = 'gemini-2.0-flash';
      }
    } catch (geminiErr) {
      logger.warn('Gemini failed, fallback triggered:', geminiErr.message);
    }
  }

  // 2️⃣ Try Groq (fast free LLM) if Gemini failed or unavailable
  if (!reply && groqAI.isAvailable()) {
    try {
      reply = await groqAI.chat(contextMessage, history, language);
      usedProvider = `groq-${groqAI.model}`;
    } catch (groqErr) {
      logger.warn('Groq chat failed:', groqErr.message);
    }
  }

  // 3️⃣ Try Ollama if preferred, or if Gemini+Groq both failed (in auto mode)
  if (!reply && (pref === 'ollama' || pref === 'auto' || pref === 'gemini')) {
    try {
      const ollamaAvail = await ollamaAI.isAvailable();
      if (ollamaAvail) {
        reply = await ollamaAI.chat(contextMessage, history, language);
        usedProvider = 'ollama-' + ollamaAI.OLLAMA_MODEL;
      } else if (pref === 'ollama') {
        logger.warn('User prefers Ollama but it is unavailable.');
      }
    } catch (ollamaErr) {
      logger.warn('Ollama failed, using internal AI:', ollamaErr.message);
    }
  }

  // 3️⃣ Try Claude (Stub for future)
  if (!reply && pref === 'claude') {
    logger.warn('Claude selected but not fully implemented, falling back to internal.');
  }

  // 4️⃣ Last resort: internal pattern engine
  if (!reply) {
    logger.error(
      'AI FALLBACK TO STATIC ENGINE — chat(). Reason: ' +
      (!geminiAI.isAvailable() ? 'GEMINI_API_KEY missing/model not initialized' : 'Gemini call threw an error (see warning above)') +
      `. usedProvider was empty before fallback.`
    );
    try {
      reply = internalAI.generateChatResponse(contextMessage, history, language);
      usedProvider = 'internal-fallback';
    } catch {
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
  }

  // Follow-up suggestions
  let suggestions = [];
  if (withFollowUps) {
    if (geminiAI.isAvailable()) {
      suggestions = await geminiAI.generateFollowUps(message, reply, language).catch(() => []);
    }
    if (!suggestions || suggestions.length === 0) {
      suggestions = language === 'ar'
        ? ['اشرح أكثر', 'أعطني مثال', 'كيف أطبق ده؟']
        : ['Explain more', 'Give me an example', 'How do I apply this?'];
    }
  }

  const conv = await saveToConversation(conversationId, req.user.id, message, reply, language, null);
  pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => { });
  checkAchievements(req.user.id, 'ai_chat').catch(() => { });

  res.json({
    reply,
    conversationId: conv?._id || conversationId,
    title: conv?.title,
    provider: usedProvider,
    suggestions,
    usage: { total_tokens: 0 },
  });
}


// ── Streaming Chat ────────────────────────────────────────────
async function chatStream(req, res) {
  const { message, conversationId, language = 'ar', fileId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  let contextMessage = message;
  if (fileId) {
    try {
      const { rows } = await pool.query(
        `SELECT file_url, original_name FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
        [fileId, req.user.id]
      );
      if (rows[0]) {
        const { text } = await fetchPdfText(rows[0].file_url, 4000);
        contextMessage = `السياق من الملف المرفوع (${rows[0].original_name}):\n---\n${text}\n---\n\nسؤال الطالب: ${message}`;
      }
    } catch (err) {
      logger.error('Error attaching file context to chatStream:', err.message);
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let history = [];
  if (conversationId) {
    try {
      const conv = await AIConversation.findOne({ _id: conversationId, userId: req.user.id });
      history = conv?.messages?.slice(-10) || [];
    } catch { }
  }

  try {
    const pref = req.user?.preferred_ai_provider || 'auto';
    let streamed = false;

    // 1️⃣ Primary: Gemini streaming
    if ((pref === 'auto' || pref === 'gemini' || pref === 'claude') && geminiAI.isAvailable() && typeof geminiAI.chatStream === 'function') {
      try {
        await geminiAI.chatStream(contextMessage, history, res, req.user.id);
        saveToConversation(conversationId, req.user.id, message, '', language, null).catch(() => {});
        pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
        streamed = true;
        return;
      } catch (geminiErr) {
        logger.warn(`Gemini stream failed (status=${geminiErr.status ?? 'n/a'}): ${geminiErr.message || 'no message'} — falling back to Ollama/internal`);
        if (res.writableEnded) return;
      }
    }

    // 2️⃣ Secondary: Groq streaming
    if (!streamed && groqAI.isAvailable()) {
      try {
        await groqAI.chatStream(contextMessage, history, res);
        saveToConversation(conversationId, req.user.id, message, '', language, null).catch(() => {});
        pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
        streamed = true;
        return;
      } catch (groqErr) {
        logger.warn('Groq stream failed:', groqErr.message);
        if (res.writableEnded) return;
      }
    }

    // 3️⃣ Tertiary: Ollama streaming
    if (!streamed && (pref === 'ollama' || pref === 'auto' || pref === 'gemini')) {
      const ollamaAvail = await ollamaAI.isAvailable();
      if (ollamaAvail) {
        try {
          await ollamaAI.chatStream(contextMessage, history, res);
          saveToConversation(conversationId, req.user.id, message, '', language, null).catch(() => {});
          pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
          streamed = true;
          return;
        } catch (ollamaErr) {
          logger.warn('Ollama stream failed:', ollamaErr.message);
          if (res.writableEnded) return;
        }
      }
    }

    // 3️⃣ Last resort: internal AI as single chunk
    if (!streamed) {
      logger.warn('AI stream: all Gemini models exhausted or unavailable — responding via internal-fallback');
      const fallback = internalAI.generateChatResponse(contextMessage, history, language);
      res.write(`data: ${JSON.stringify({ chunk: fallback })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fullText: fallback, provider: 'internal-fallback' })}\n\n`);
      res.end();
      pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
    }
  } catch (err) {
    logger.error('Stream error:', err.message);
    if (!res.writableEnded) {
      try {
        const fallback = internalAI.generateChatResponse(contextMessage, history, language);
        res.write(`data: ${JSON.stringify({ chunk: fallback })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, fullText: fallback, provider: 'internal-fallback' })}\n\n`);
      } catch { }
      res.end();
    }
  }
}

// ── Web Search ────────────────────────────────────────────────
async function webSearch(req, res) {
  const { query, language = 'en' } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  let answer = '';

  if (geminiAI.isAvailable()) {
    try {
      answer = await geminiAI.searchAndAnswer(query, language);
      return res.json({ answer, provider: 'gemini-2.0-flash' });
    } catch (err) {
      logger.error('Gemini Web Search failed:', err.message);
      // Fallback to Ollama or internal AI below
    }
  }

  // Fallback 1: Ollama
  try {
    const ollamaAvail = await ollamaAI.isAvailable();
    if (ollamaAvail) {
      answer = await ollamaAI.chat(`Answer this search query based on your knowledge: ${query}`, [], language);
      return res.json({ answer, provider: 'ollama-' + ollamaAI.OLLAMA_MODEL });
    }
  } catch (err) {
    logger.error('Ollama search fallback failed:', err.message);
  }

  // Fallback 2: Internal AI
  try {
    answer = internalAI.generateChatResponse(query, [], language);
    return res.json({ answer, provider: 'internal-fallback' });
  } catch (err) {
    return res.status(500).json({ error: 'Search engine encountered an error' });
  }
}

// ── Conversations ─────────────────────────────────────────────
async function getConversations(req, res) {
  try {
    const convs = await AIConversation
      .find({ userId: req.user.id })
      .select('title language createdAt updatedAt provider')
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();
    res.json({ conversations: convs });
  } catch (err) {
    res.json({ conversations: [] });
  }
}

async function getConversation(req, res) {
  try {
    const conv = await AIConversation.findOne({ _id: req.params.id, userId: req.user.id });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load conversation' });
  }
}

async function deleteConversation(req, res) {
  try {
    await AIConversation.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Conversation deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
}

// ── Summarize PDF ─────────────────────────────────────────────
async function summarizePdf(req, res) {
  const { fileId, language = 'en' } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  const cacheKey = `summary:${fileId}:${language}:gemini`;
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) return res.json(cached);

  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
    [fileId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'PDF not found' });

  const { text, pages } = await fetchPdfText(rows[0].file_url);

  let summary, usedProvider;
  if (geminiAI.isAvailable()) {
    try {
      summary = await geminiAI.summarize(text, language, pages);
      usedProvider = 'gemini-2.0-flash';
    } catch (err) {
      logger.warn('Gemini summarization failed, trying local:', err.message);
    }
  }
  if (!summary && groqAI.isAvailable()) {
    try {
      summary = await groqAI.summarize(text, language, pages);
      usedProvider = `groq-${groqAI.model}`;
    } catch (err) {
      logger.warn('Groq summarization failed:', err.message);
    }
  }
  if (!summary && localAI.isReady && localAI.models.summarizer) {
    try {
      summary = await localAI.summarize(text);
      usedProvider = 'najah_inhouse';
    } catch (err) {
      logger.warn('Local summarization failed:', err.message);
    }
  }
  if (!summary) {
    logger.error('AI FALLBACK TO STATIC ENGINE — summarizeFile(). Reason: ' +
      (!geminiAI.isAvailable() ? 'GEMINI_API_KEY missing/model not initialized' : 'Gemini and local AI both failed (see warnings above)'));
    summary = internalAI.summarizeText(text, language, pages);
    usedProvider = 'najah_heuristics';
  }

  const result = { fileId, fileName: rows[0].original_name, summary, pages, language, provider: usedProvider };
  await cacheSet(cacheKey, result, 7200).catch(() => { });
  res.json(result);
}

// ── Generate Quiz ─────────────────────────────────────────────
async function generateQuiz(req, res) {
  const { subject, topic, difficulty = 'medium', count = 10, language = 'en', fileId, fileIds } = req.body;

  let context = '';
  let resolvedFileIds = [];
  if (fileIds && Array.isArray(fileIds)) {
    resolvedFileIds = fileIds;
  } else if (fileId) {
    resolvedFileIds = [fileId];
  }

  if (resolvedFileIds.length > 0) {
    try {
      const { rows } = await pool.query(
        `SELECT file_url, original_name FROM files WHERE id = ANY($1) AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
        [resolvedFileIds, req.user.id]
      );
      if (rows.length > 0) {
        const texts = [];
        for (const row of rows) {
          const { text } = await fetchPdfText(row.file_url, Math.floor(8000 / rows.length));
          texts.push(`--- File: ${row.original_name} ---\n${text}`);
        }
        context = texts.join('\n\n');
      }
    } catch (err) {
      logger.error('Error fetching texts for multi-file quiz:', err.message);
    }
  }

  let quiz;
  let usedProvider;

  if (geminiAI.isAvailable()) {
    try {
      quiz = await geminiAI.generateQuiz({ subject, topic, difficulty, count: parseInt(count), language, context });
      usedProvider = 'gemini-2.0-flash';
    } catch (err) {
      logger.warn('Gemini quiz generation failed, using heuristics:', err.message);
    }
  }

  if (!quiz && groqAI.isAvailable()) {
    try {
      quiz = await groqAI.generateQuiz({ subject, topic, difficulty, count: parseInt(count), language, context });
      usedProvider = `groq-${groqAI.model}`;
    } catch (err) {
      logger.warn('Groq quiz generation failed:', err.message);
    }
  }

  if (!quiz) {
    logger.error('AI FALLBACK TO STATIC ENGINE — generateQuiz(). Reason: ' +
      (!geminiAI.isAvailable() ? 'GEMINI_API_KEY missing/model not initialized' : 'Gemini quiz generation threw an error (see warning above)'));
    quiz = internalAI.generateQuiz({ subject, difficulty, count: parseInt(count), language });
    usedProvider = 'najah_heuristics';
  }

  await checkAchievements(req.user.id, 'quiz_generated').catch(() => { });
  res.json({ subject, topic, difficulty, language, count: quiz.questions?.length, ...quiz, provider: usedProvider });
}

// ── Submit Quiz Result ────────────────────────────────────────
async function submitQuizResult(req, res) {
  const { subject, topic, totalQ, correctQ, difficulty, timeTaken, questions } = req.body;
  const scorePct = Math.round((correctQ / totalQ) * 100);

  const { rows } = await pool.query(`
    INSERT INTO quiz_attempts
      (user_id, subject, topic, total_q, correct_q, score_pct, difficulty, time_taken, questions)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [req.user.id, subject, topic || null, totalQ, correctQ, scorePct,
  difficulty || 'medium', timeTaken || null, JSON.stringify(questions || [])]);

  const xpEarned = Math.max(10, Math.round(scorePct / 10) * 10);
  await pool.query('UPDATE users SET xp_points = xp_points + $1 WHERE id = $2', [xpEarned, req.user.id]);

  if (scorePct === 100) await checkAchievements(req.user.id, 'perfect_quiz').catch(() => { });
  await checkAchievements(req.user.id, 'quiz_submitted').catch(() => { });

  res.json({ attempt: rows[0], xpEarned });
}

// ── Study Plan ────────────────────────────────────────────────
async function generateStudyPlan(req, res) {
  // Accept both old single-subject payload AND new multi-subject payload from StudyPlanGenerator
  const {
    subject, subjects, deadline, examDate,
    dailyHours, hoursPerDay = 2,
    currentLevel, level = 'intermediate',
    language = 'ar',
  } = req.body;

  const resolvedSubjects = subjects?.length ? subjects : (subject ? [subject] : null);
  const resolvedDeadline = examDate || deadline;
  const resolvedHours    = hoursPerDay || dailyHours || 2;
  const resolvedLevel    = level || currentLevel || 'intermediate';

  if (!resolvedSubjects?.length) return res.status(400).json({ error: 'subjects (or subject) is required' });
  if (!resolvedDeadline)        return res.status(400).json({ error: 'examDate (or deadline) is required' });

  const daysUntil = Math.ceil((new Date(resolvedDeadline) - new Date()) / 86400000);
  if (daysUntil < 1) return res.status(400).json({ error: 'Exam date must be in the future' });

  // Try Gemini first for a rich structured plan
  if (geminiAI.isAvailable()) {
    try {
      const result = await geminiAI.generateStudyPlan({
        subject: resolvedSubjects.join(', '),
        daysUntil,
        dailyHours: parseInt(resolvedHours),
        currentLevel: resolvedLevel,
        language
      });
      return res.json({
        ...result,
        subjects: resolvedSubjects,
        daysUntil,
        hoursPerDay: resolvedHours,
        level: resolvedLevel,
        provider: 'gemini-2.0-flash'
      });
    } catch (err) {
      logger.warn('Gemini study plan failed, using heuristics:', err.message);
    }
  }

  if (groqAI.isAvailable()) {
    try {
      const result = await groqAI.generateStudyPlan({
        subject: resolvedSubjects.join(', '),
        daysUntil,
        dailyHours: parseInt(resolvedHours),
        currentLevel: resolvedLevel,
        language
      });
      return res.json({
        ...result,
        subjects: resolvedSubjects,
        daysUntil,
        hoursPerDay: resolvedHours,
        level: resolvedLevel,
        provider: `groq-${groqAI.model}`
      });
    } catch (err) {
      logger.warn('Groq study plan failed, using heuristics:', err.message);
    }
  }

  // Fallback: internal heuristic plan (single subject)
  logger.error('AI FALLBACK TO STATIC ENGINE — generateStudyPlan(). Reason: ' +
    (!geminiAI.isAvailable() ? 'GEMINI_API_KEY missing/model not initialized' : 'Gemini study plan threw an error (see warning above)'));
  const plan = internalAI.generateStudyPlan({ subject: resolvedSubjects[0], daysUntil, dailyHours: parseInt(resolvedHours), currentLevel: resolvedLevel, language });
  res.json({ ...plan, subjects: resolvedSubjects, daysUntil, hoursPerDay: resolvedHours, level: resolvedLevel, provider: 'najah_heuristics' });
}


// ── Answer from File ──────────────────────────────────────────
async function answerFromFile(req, res) {
  const { question, fileId, language = 'en' } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
    [fileId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });

  const { text } = await fetchPdfText(rows[0].file_url, 8000);

  let answer, usedProvider;
  if (geminiAI.isAvailable()) {
    try {
      answer = await geminiAI.answerFromContext(question, text, language);
      usedProvider = 'gemini-2.0-flash';
    } catch (err) {
      logger.warn('Gemini answer from context failed:', err.message);
    }
  }
  if (!answer && localAI.isReady && localAI.models.generator) {
    try {
      const contextChunk = text.slice(0, 3000);
      answer = await localAI.chat(`Answer the question based on this document: ${contextChunk}\n\nQuestion: ${question}`, [], language);
      usedProvider = 'najah_inhouse';
    } catch (err) {
      logger.warn('Local file Q&A failed:', err.message);
    }
  }
  if (!answer) {
    answer = internalAI.generateChatResponse(`${question}\n\nDocument context:\n${text.slice(0, 2000)}`, [], language);
    usedProvider = 'najah_heuristics';
  }

  res.json({ question, answer, fileId, fileName: rows[0].original_name, provider: usedProvider });
}

// ── YouTube Summarize ─────────────────────────────────────────
async function youtubeSummarize(req, res) {
  const { url, language = 'en' } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

  let transcriptItems;
  try {
    const mod = await import('youtube-transcript');
    const YoutubeTranscript = mod.YoutubeTranscript || mod.default?.YoutubeTranscript;
    transcriptItems = await YoutubeTranscript.fetchTranscript(url);
  } catch (err) {
    logger.error('YouTube transcript fetch failed:', err.message);
    return res.status(400).json({ error: 'Could not fetch transcript. The video may not have captions.' });
  }

  const fullText = transcriptItems.map(t => t.text).join(' ').slice(0, 18000);

  let summary, usedProvider;
  if (geminiAI.isAvailable()) {
    try {
      summary = await geminiAI.summarizeYoutube(fullText, language);
      usedProvider = 'gemini-2.0-flash';
    } catch (err) {
      logger.warn('Gemini YouTube summarization failed:', err.message);
    }
  }
  if (!summary && localAI.isReady && localAI.models.summarizer) {
    try {
      summary = await localAI.summarize(fullText);
      usedProvider = 'najah_inhouse';
    } catch (err) {
      logger.warn('Local YouTube summarize failed:', err.message);
    }
  }
  if (!summary) {
    summary = internalAI.summarizeText(fullText, language, 1);
    usedProvider = 'najah_heuristics';
  }

  res.json({ summary, url, language, provider: usedProvider });
}

// ── Image Analyze ─────────────────────────────────────────────
async function analyzeImage(req, res) {
  res.status(400).json({ error: 'Image analysis is not available in this version. Please upload a PDF instead.' });
}

// ── Generate Lesson Plan (Teacher AI) ────────────────────────
async function generateLessonPlan(req, res) {
  const { subject, grade, topic, duration, style } = req.body;
  if (!subject || !grade || !topic)
    return res.status(400).json({ error: 'subject, grade, and topic are required' });
  if (!geminiAI.isAvailable())
    return res.status(503).json({ error: 'Gemini AI not configured. Set GEMINI_API_KEY.' });
  try {
    const plan = await geminiAI.generateLessonPlan({ subject, grade, topic, duration, style });
    res.json({ plan, subject, grade, topic });
  } catch (err) {
    logger.error('generateLessonPlan error:', err.message);
    res.status(500).json({ error: 'Failed to generate lesson plan' });
  }
}

// ── Generate Exam Questions (Teacher AI) ──────────────────────
async function generateExamQuestions(req, res) {
  const { subject, grade, topic, count = 10, levels } = req.body;
  if (!subject || !grade || !topic)
    return res.status(400).json({ error: 'subject, grade, and topic are required' });
  if (!geminiAI.isAvailable())
    return res.status(503).json({ error: 'Gemini AI not configured. Set GEMINI_API_KEY.' });
  try {
    const questions = await geminiAI.generateExamQuestions({ subject, grade, topic, count: parseInt(count), levels: levels || {} });
    res.json({ questions, subject, grade, topic, count: questions.length });
  } catch (err) {
    logger.error('generateExamQuestions error:', err.message);
    res.status(500).json({ error: 'Failed to generate exam questions' });
  }
}

// ── Grade Essay (Teacher AI) ──────────────────────────────────
async function gradeEssay(req, res) {
  const { essay, criteria, maxScore, language = 'ar' } = req.body;
  if (!essay) return res.status(400).json({ error: 'essay is required' });
  if (!geminiAI.isAvailable())
    return res.status(503).json({ error: 'Gemini AI not configured. Set GEMINI_API_KEY.' });
  try {
    const result = await geminiAI.gradeEssay({ essay, criteria, maxScore: parseInt(maxScore) || 10, language });
    res.json(result);
  } catch (err) {
    logger.error('gradeEssay error:', err.message);
    res.status(500).json({ error: 'Failed to grade essay' });
  }
}

// ── Clear AI Memory (Mem0) ────────────────────────────────────
async function clearMemory(req, res) {
  try {
    await clearUserMemory(req.user.id);
    res.json({ success: true, message: 'تم مسح ذاكرة AI الخاصة بك' });
  } catch (err) {
    logger.error('clearMemory error:', err.message);
    res.status(500).json({ error: 'Failed to clear memory' });
  }
}

// ── Correct Homework (Vision AI) ──────────────────────────────
async function correctHomework(req, res) {
  try {
    const { imageBase64, subject, grade, language = 'ar' } = req.body;
    if (!imageBase64) return res.status(400).json({ error:'Image required' });

    const prompt = language === 'ar'
      ? `أنت معلم مصري متخصص في ${subject||'عام'} للصف ${grade||'الثانوي'}.
صحّح هذا الواجب المصور بدقة وأعطِ:

**الدرجة**: X من 10
**الإيجابيات**: ما تم صح (نقطتان على الأقل)
**الأخطاء**: كل خطأ مع شرح الصواب
**نصيحة**: نصيحة واحدة للتحسين

كن مشجعاً دائماً حتى لو الإجابة غلط. استخدم لغة مناسبة لسن الطالب.`
      : `You are an Egyptian teacher specializing in ${subject||'general'} for grade ${grade||'secondary'}.
Correct this homework image and provide:
**Score**: X/10
**Strengths**: What was done correctly
**Errors**: Each mistake with correct explanation
**Tip**: One improvement tip
Always be encouraging.`;

    if (!geminiAI.isAvailable()) return res.status(503).json({ error:'AI Vision unavailable' });

    const text = await geminiAI.analyzeImage(imageBase64, prompt, 'image/jpeg');

    pool.query('UPDATE users SET xp_points=xp_points+10 WHERE id=$1', [req.user.id]).catch(()=>{});
    res.json({ correction: text, subject, grade });
  } catch (e) {
    logger.error('Homework correction error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  chat, chatStream, webSearch,
  getConversations, getConversation, deleteConversation,
  summarizePdf, generateQuiz, submitQuizResult, generateStudyPlan,
  answerFromFile, getProvider, getCapabilities, youtubeSummarize, analyzeImage,
  generateLessonPlan, generateExamQuestions, gradeEssay,
  clearMemory, correctHomework
};
