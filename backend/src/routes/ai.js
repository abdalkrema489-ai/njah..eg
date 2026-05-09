// src/routes/ai.js
const ar = require('express').Router();
const c = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

ar.use(authenticate);

// Provider info (no rate limit)
ar.get('/provider', c.getProvider);
ar.get('/internal/capabilities', c.getCapabilities);

// Conversations
ar.get('/conversations', c.getConversations);
ar.get('/conversations/:id', c.getConversation);
ar.delete('/conversations/:id', c.deleteConversation);

// AI Features
ar.post('/chat', aiLimiter, c.chat);
ar.post('/chat/stream', aiLimiter, c.chatStream);   // streaming SSE
ar.post('/search', aiLimiter, c.webSearch);
ar.post('/summarize', aiLimiter, c.summarizePdf);
ar.post('/quiz', aiLimiter, c.generateQuiz);
ar.post('/quiz/submit', c.submitQuizResult);
ar.post('/study-plan', aiLimiter, c.generateStudyPlan);
ar.post('/ask-file', aiLimiter, c.answerFromFile);
ar.post('/image-analyze', aiLimiter, c.analyzeImage);
ar.post('/youtube-summarize', aiLimiter, c.youtubeSummarize);

// Memory management (Mem0)
ar.post('/clear-memory', c.clearMemory);

// Teacher-only AI features
ar.post('/lesson-plan', aiLimiter, c.generateLessonPlan);
ar.post('/exam-questions', aiLimiter, c.generateExamQuestions);
ar.post('/grade-essay', aiLimiter, c.gradeEssay);

// AI Vision
ar.post('/correct-homework', aiLimiter, c.correctHomework);

module.exports = ar;

