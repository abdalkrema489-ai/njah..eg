// src/controllers/aiController.js  — Gemini-first AI controller
'use strict';
const pdfParse   = require('pdf-parse');
const fetch      = require('node-fetch');

const { pool }               = require('../config/postgres');
const { AIConversation }     = require('../config/mongo');
const { cacheSet, cacheGet } = require('../config/redis');
const { checkAchievements }  = require('../services/achievementService');
const localAI                = require('../services/localAI');
const internalAI             = require('../services/internalAI');
const deepTutor              = require('../services/deepTutorService');
const geminiAI               = require('../services/geminiAI');
const CognitiveEngine        = require('../ai/core/CognitiveEngine');
const logger                 = require('../utils/logger');

const cognitiveEngine = new CognitiveEngine(internalAI, deepTutor);
cognitiveEngine.init().catch(e => logger.error('Failed to init CognitiveEngine:', e));

// ── PDF text fetch ───────────────────────────────────────────
async function fetchPdfText(fileUrl, maxChars = 10000) {
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error('Failed to fetch file');
  const buf  = Buffer.from(await resp.arrayBuffer());
  const data = await pdfParse(buf);
  return { text: data.text.slice(0, maxChars), pages: data.numpages };
}

// ── Provider Info ────────────────────────────────────────────
async function getProvider(req, res) {
  res.json({
    primary: geminiAI.isAvailable() ? 'gemini-2.0-flash' : 'internal',
    gemini: {
      available:    geminiAI.isAvailable(),
      model:        'gemini-2.0-flash',
      description:  'Google Gemini 2.0 Flash — Egyptian curriculum AI',
    },
    internal: {
      available:    true,
      description:  'Egyptian curriculum pattern engine (offline fallback)',
    },
  });
}

async function getCapabilities(req, res) {
  res.json({
    engine:          geminiAI.isAvailable() ? 'gemini-2.0-flash' : 'internal',
    geminiAvailable: geminiAI.isAvailable(),
    features: {
      chat:         { supported: true },
      stream:       { supported: geminiAI.isAvailable() },
      search:       { supported: geminiAI.isAvailable() },
      summary:      { supported: true },
      quiz:         { supported: true },
      studyPlan:    { supported: true },
      askFile:      { supported: true },
      youtube:      { supported: true },
      imageAnalysis:{ supported: false },
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
    conv.messages.push({ role: 'user',      content: userMsg  });
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
  const { message, conversationId, language = 'ar', withFollowUps = true } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  let history = [];
  if (conversationId) {
    try {
      const conv = await AIConversation.findOne({ _id: conversationId, userId: req.user.id });
      history = conv?.messages?.slice(-10) || [];
    } catch {}
  }

  let reply = '';
  let usedProvider = '';

  try {
    if (geminiAI.isAvailable()) {
      reply = await geminiAI.chat(message, history, language);
      usedProvider = 'gemini-2.0-flash';
    } else {
      reply = internalAI.generateChatResponse(message, history, language);
      usedProvider = 'internal-fallback';
    }
  } catch (err) {
    logger.error('AI chat error:', err.message);
    try {
      reply = internalAI.generateChatResponse(message, history, language);
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
  pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
  checkAchievements(req.user.id, 'ai_chat').catch(() => {});

  res.json({
    reply,
    conversationId: conv?._id || conversationId,
    title:          conv?.title,
    provider:       usedProvider,
    suggestions,
    usage:          { total_tokens: 0 },
  });
}

// ── Streaming Chat ────────────────────────────────────────────
async function chatStream(req, res) {
  const { message, conversationId, language = 'ar' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let history = [];
  if (conversationId) {
    try {
      const conv = await AIConversation.findOne({ _id: conversationId, userId: req.user.id });
      history = conv?.messages?.slice(-10) || [];
    } catch {}
  }

  try {
    if (geminiAI.isAvailable() && typeof geminiAI.chatStream === 'function') {
      // Gemini real streaming — writes SSE chunks directly to res
      await geminiAI.chatStream(message, history, res);
    } else {
      // Fallback: internal AI as single chunk
      const fullText = internalAI.generateChatResponse(message, history, language);
      res.write(`data: ${JSON.stringify({ chunk: fullText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fullText, provider: 'internal-fallback' })}\n\n`);
      res.end();
    }
    // Background tasks
    saveToConversation(conversationId, req.user.id, message, '', language, null).catch(() => {});
    pool.query('UPDATE users SET xp_points = xp_points + 5 WHERE id = $1', [req.user.id]).catch(() => {});
  } catch (err) {
    logger.error('Stream error:', err.message);
    try {
      const fallback = internalAI.generateChatResponse(message, history, language);
      res.write(`data: ${JSON.stringify({ chunk: fallback })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fullText: fallback, provider: 'internal-fallback' })}\n\n`);
    } catch {} 
    res.end();
  }
}

// ── Web Search ────────────────────────────────────────────────
async function webSearch(req, res) {
  const { query, language = 'en' } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  if (geminiAI.isAvailable()) {
    try {
      const answer = await geminiAI.searchAndAnswer(query, language);
      return res.json({ answer, provider: 'gemini-2.0-flash' });
    } catch (err) {
      logger.error('Gemini Web Search failed:', err.message);
      return res.status(500).json({ error: 'Search engine encountered an error' });
    }
  }

  // Fallback if Gemini is not available
  return res.status(503).json({ error: 'Web Search is currently offline. Please configure the Cloud AI.' });
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
  const cached   = await cacheGet(cacheKey).catch(() => null);
  if (cached) return res.json(cached);

  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
    [fileId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'PDF not found' });

  const { text, pages } = await fetchPdfText(rows[0].file_url);

  let summary, usedProvider;
  if (localAI.isReady && localAI.models.summarizer) {
    try {
      summary = await localAI.summarize(text);
      usedProvider = 'najah_inhouse';
    } catch (err) {
      logger.warn('Local summarization failed:', err.message);
    }
  }
  if (!summary) {
    summary = internalAI.summarizeText(text, language, pages);
    usedProvider = 'najah_heuristics';
  }

  const result = { fileId, fileName: rows[0].original_name, summary, pages, language, provider: usedProvider };
  await cacheSet(cacheKey, result, 7200).catch(() => {});
  res.json(result);
}

// ── Generate Quiz ─────────────────────────────────────────────
async function generateQuiz(req, res) {
  const { subject, topic, difficulty = 'medium', count = 10, language = 'en', fileId } = req.body;

  let context = '';
  if (fileId) {
    try {
      const { rows } = await pool.query(
        `SELECT file_url FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true) AND mime_type = 'application/pdf'`,
        [fileId, req.user.id]
      );
      if (rows[0]) {
        const { text } = await fetchPdfText(rows[0].file_url, 4000);
        context = text;
      }
    } catch {}
  }

  let quiz = internalAI.generateQuiz({ subject, difficulty, count: parseInt(count), language });
  let usedProvider = 'najah_heuristics';

  await checkAchievements(req.user.id, 'quiz_generated').catch(() => {});
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

  if (scorePct === 100) await checkAchievements(req.user.id, 'perfect_quiz').catch(() => {});
  await checkAchievements(req.user.id, 'quiz_submitted').catch(() => {});

  res.json({ attempt: rows[0], xpEarned });
}

// ── Study Plan ────────────────────────────────────────────────
async function generateStudyPlan(req, res) {
  const { subject, deadline, dailyHours = 2, currentLevel = 'beginner', language = 'en' } = req.body;
  if (!subject)  return res.status(400).json({ error: 'subject is required' });
  if (!deadline) return res.status(400).json({ error: 'deadline is required' });

  const daysUntil = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (daysUntil < 1) return res.status(400).json({ error: 'Deadline must be in the future' });

  let plan = internalAI.generateStudyPlan({ subject, daysUntil, dailyHours: parseInt(dailyHours), currentLevel, language });
  let usedProvider = 'najah_heuristics';

  res.json({ ...plan, subject, deadline, daysUntil, dailyHours, currentLevel, provider: usedProvider });
}

// ── Answer from File ──────────────────────────────────────────
async function answerFromFile(req, res) {
  const { question, fileId, language = 'en' } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });
  if (!fileId)   return res.status(400).json({ error: 'fileId is required' });

  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
    [fileId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });

  const { text } = await fetchPdfText(rows[0].file_url, 8000);

  let answer, usedProvider;
  if (localAI.isReady && localAI.models.generator) {
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
  if (localAI.isReady && localAI.models.summarizer) {
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

module.exports = {
  chat, chatStream, webSearch,
  getConversations, getConversation, deleteConversation,
  summarizePdf, generateQuiz, submitQuizResult, generateStudyPlan,
  answerFromFile, getProvider, getCapabilities, youtubeSummarize, analyzeImage,
  generateLessonPlan, generateExamQuestions, gradeEssay,
};
