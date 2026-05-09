'use strict';
// ══════════════════════════════════════════════════════════════
// NAJAH MARKITDOWN SERVICE — Microsoft MarkItDown File Converter
// Supports: PDF (incl. scanned), .docx, .pptx, .xlsx, images
// Falls back gracefully to pdf-parse if unavailable.
// ══════════════════════════════════════════════════════════════
const axios    = require('axios');
const FormData = require('form-data');
const logger   = require('../utils/logger');

const MARKITDOWN_URL = process.env.MARKITDOWN_URL || 'http://markitdown:5001';

// ── Health check ───────────────────────────────────────────────
async function isAvailable() {
  try {
    await axios.get(`${MARKITDOWN_URL}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// ── Convert buffer → clean markdown text ──────────────────────
async function convertToText(buffer, filename, mimetype) {
  try {
    const form = new FormData();
    form.append('file', buffer, { filename, contentType: mimetype });

    const response = await axios.post(`${MARKITDOWN_URL}/convert`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxBodyLength: 50 * 1024 * 1024, // 50 MB
    });

    return {
      success: true,
      text:    response.data.text,
      title:   response.data.title,
      length:  response.data.length,
    };
  } catch (err) {
    logger.warn('Markitdown conversion failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { convertToText, isAvailable };
