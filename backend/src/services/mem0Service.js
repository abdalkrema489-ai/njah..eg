'use strict';
// ══════════════════════════════════════════════════════════════
// NAJAH MEM0 SERVICE — Persistent AI Memory Per Student
// ══════════════════════════════════════════════════════════════
const logger = require('../utils/logger');

let MemoryClient = null;
let memoryEnabled = false;

try {
  if (process.env.MEM0_ENABLED === 'true') {
    if (process.env.MEM0_API_KEY) {
      // Cloud version — requires MEM0_API_KEY
      const { MemoryClient: MC } = require('mem0ai');
      MemoryClient = new MC({ apiKey: process.env.MEM0_API_KEY });
      memoryEnabled = true;
      logger.info('✅ Mem0 Cloud initialized');
    } else {
      // Open-source local version — no API key needed
      const { Memory } = require('mem0ai');
      MemoryClient = new Memory();
      memoryEnabled = true;
      logger.info('✅ Mem0 OSS initialized (local mode)');
    }
  } else {
    logger.info('ℹ️  Mem0 disabled (MEM0_ENABLED != true)');
  }
} catch (err) {
  logger.warn('⚠️  Mem0 not available:', err.message);
}

// ── Save conversation to memory (async, non-blocking) ─────────
async function saveMemory(userId, userMessage, aiReply) {
  if (!memoryEnabled || !MemoryClient || !userId) return;
  try {
    await MemoryClient.add(
      [
        { role: 'user',      content: userMessage },
        { role: 'assistant', content: aiReply     },
      ],
      { user_id: userId.toString() }
    );
  } catch (err) {
    logger.warn('Mem0 save error:', err.message);
  }
}

// ── Retrieve relevant memories before responding ──────────────
async function getRelevantMemories(userId, query) {
  if (!memoryEnabled || !MemoryClient || !userId) return '';
  try {
    const results = await MemoryClient.search(query, {
      user_id: userId.toString(),
      limit: 5,
    });

    if (!results || results.length === 0) return '';

    const facts = results
      .map(m => m.memory || m.text || '')
      .filter(Boolean)
      .join('\n- ');

    return facts
      ? `\n\n## ما تعرفه عن هذا الطالب من محادثات سابقة:\n- ${facts}`
      : '';
  } catch (err) {
    const msg = err.message || String(err);
    // Suppress repeated auth/key errors — log once at warn level
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('api_key')) {
      logger.warn('Mem0 search skipped: invalid or missing MEM0_API_KEY (set MEM0_ENABLED=false to silence)');
    } else {
      logger.warn('Mem0 search error:', msg);
    }
    return '';
  }
}

// ── Clear all memories for a user ────────────────────────────
async function clearUserMemory(userId) {
  if (!memoryEnabled || !MemoryClient || !userId) return;
  try {
    await MemoryClient.delete_all({ user_id: userId.toString() });
    logger.info(`Mem0: cleared memory for user ${userId}`);
  } catch (err) {
    logger.warn('Mem0 clear error:', err.message);
  }
}

module.exports = { saveMemory, getRelevantMemories, clearUserMemory, memoryEnabled };
