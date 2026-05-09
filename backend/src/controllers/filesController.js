// src/controllers/filesController.js  — FIXED: all requires at top, no self-reference
'use strict';
const path        = require('path');
const { v4: uuid} = require('uuid');
const sharp       = require('sharp');
const pdfParse    = require('pdf-parse');   // ← single require at top
const fetch       = require('node-fetch');

const { pool }                          = require('../config/postgres');
const logger                          = require('../utils/logger');
const { uploadToFirebase, deleteFromFirebase } = require('../config/firebase');
const { checkAchievements }             = require('../services/achievementService');
const markitdown                        = require('../services/markitdownService');

// ── Upload ──────────────────────────────────────────────
async function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const { subject, tags, description, is_public } = req.body;
  const { originalname, mimetype, buffer } = req.file;

  // Compress images (not GIFs)
  let processed = buffer;
  if (mimetype.startsWith('image/') && mimetype !== 'image/gif') {
    processed = await sharp(buffer)
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  try {
    const ext      = path.extname(originalname).toLowerCase() || '.bin';
    const filename = `${uuid()}${ext}`;
    const dest     = `users/${req.user.id}/files/${filename}`;
    
    logger.info(`Uploading to Firebase: ${dest} (${mimetype})`);
    const url      = await uploadToFirebase(processed, dest, mimetype);
    
    const tagsArr  = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { rows } = await pool.query(`
      INSERT INTO files
        (user_id, name, original_name, file_url, firebase_path, size_bytes, mime_type, subject, tags, is_public, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      req.user.id, filename, originalname, url, dest,
      processed.length, mimetype, subject || null,
      tagsArr, is_public === 'true', description || null,
    ]);

    await checkAchievements(req.user.id, 'file_upload');
    res.status(201).json({ file: rows[0] });
  } catch (err) {
    logger.error('File Upload Error:', err);
    res.status(500).json({ error: 'Failed to upload file. ' + err.message });
  }
}

// ── List ────────────────────────────────────────────────
async function listFiles(req, res) {
  const { subject, tag, search, page = 1, limit = 20, mine = 'true' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const params = [req.user.id];
  let q = `
    SELECT f.*, u.name AS uploader_name
    FROM files f
    JOIN users u ON u.id = f.user_id
    WHERE ${mine === 'true' ? 'f.user_id = $1' : '(f.user_id = $1 OR f.is_public = true)'}
  `;
  let i = 2;
  if (subject) { q += ` AND f.subject = $${i++}`;          params.push(subject); }
  if (tag)     { q += ` AND $${i++} = ANY(f.tags)`;         params.push(tag); }
  if (search)  { q += ` AND f.original_name ILIKE $${i++}`; params.push(`%${search}%`); }
  q += ` ORDER BY f.created_at DESC LIMIT $${i++} OFFSET $${i}`;
  params.push(Number(limit), offset);

  const { rows }     = await pool.query(q, params);
  const { rows: cnt} = await pool.query(
    'SELECT COUNT(*) FROM files WHERE user_id = $1', [req.user.id]
  );
  res.json({ files: rows, total: parseInt(cnt[0].count), page: Number(page) });
}

// ── Get single ──────────────────────────────────────────
async function getFile(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM files WHERE id = $1 AND (user_id = $2 OR is_public = true)',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });
  // Increment download count
  await pool.query('UPDATE files SET download_count = download_count + 1 WHERE id = $1', [req.params.id]);
  res.json({ file: rows[0] });
}

// ── Update ──────────────────────────────────────────────
async function updateFile(req, res) {
  const { tags, subject, description, is_public } = req.body;
  const { rows } = await pool.query(`
    UPDATE files SET
      tags        = COALESCE($1, tags),
      subject     = COALESCE($2, subject),
      description = COALESCE($3, description),
      is_public   = COALESCE($4, is_public)
    WHERE id = $5 AND user_id = $6
    RETURNING *
  `, [tags || null, subject || null, description || null,
      is_public !== undefined ? is_public : null,
      req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });
  res.json({ file: rows[0] });
}

// ── Delete ──────────────────────────────────────────────
async function deleteFile(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });
  if (rows[0].firebase_path) {
    await deleteFromFirebase(rows[0].firebase_path).catch(() => {});
  }
  await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
  res.json({ message: 'File deleted' });
}

// ── Extract file text (PDF + Word + PPT via markitdown) ──────
async function extractFileText(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1
     AND (user_id = $2 OR is_public = true)`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });

  const file = rows[0];

  const resp = await fetch(file.file_url);
  if (!resp.ok) return res.status(502).json({ error: 'Failed to fetch file' });
  const buf  = Buffer.from(await resp.arrayBuffer());

  let text   = '';
  let pages  = 1;
  let source = 'pdf-parse';

  // 1️⃣ Try markitdown first (handles PDF, Word, PPT, scanned docs)
  const mdAvail = await markitdown.isAvailable();
  if (mdAvail) {
    const result = await markitdown.convertToText(buf, file.original_name, file.mime_type);
    if (result.success && result.text?.length > 50) {
      text   = result.text;
      source = 'markitdown';
      logger.info(`Markitdown extracted ${result.length} chars from ${file.original_name}`);
    }
  }

  // 2️⃣ Fallback: pdf-parse for regular PDFs
  if (!text && file.mime_type === 'application/pdf') {
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Warning: TT: undefined function:')) return;
        originalWarn.apply(console, args);
      };
      try {
        const data = await pdfParse(buf);
        text  = data.text;
        pages = data.numpages;
        source = 'pdf-parse';
      } catch (pdfErr) {
        logger.warn('pdf-parse failed:', pdfErr.message);
      } finally {
        console.warn = originalWarn;
      }
  }

  if (!text) {
    return res.status(422).json({ error: 'Could not extract text from this file type' });
  }

  res.json({
    fileId:   file.id,
    fileName: file.original_name,
    text,
    pages,
    length: text.length,
    source,
  });
}

// Backward-compatible alias
const extractPdfText = extractFileText;

module.exports = { uploadFile, listFiles, getFile, updateFile, deleteFile, extractFileText, extractPdfText };

