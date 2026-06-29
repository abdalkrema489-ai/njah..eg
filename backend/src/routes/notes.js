// src/routes/notes.js
const nr   = require('express').Router();
const { pool } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const { checkAchievements } = require('../services/achievementService');
const logger = require('../utils/logger'); // FIXED: added logger

nr.use(authenticate);

nr.get('/', async (req,res) => {
  try {
    const { subject, search, pinned, page=1, limit=30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build query safely — stable param indices via array push
    const params = [req.user.id];
    const conditions = ['n.user_id=$1'];

    if (subject) {
      params.push(subject);
      conditions.push(`n.subject=$${params.length}`);
    }
    if (pinned === 'true') {
      conditions.push('n.is_pinned=true');
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(n.title ILIKE $${params.length} OR n.content ILIKE $${params.length})`);
    }

    // Push LIMIT then OFFSET last so indices are always correct
    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const q = `SELECT n.*, f.original_name AS file_name, f.file_url AS file_url 
               FROM notes n 
               LEFT JOIN files f ON f.id = n.linked_file 
               WHERE ${conditions.join(' AND ')} 
               ORDER BY n.is_pinned DESC, n.updated_at DESC 
               LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const { rows } = await pool.query(q, params);
    res.json({ notes: rows });
  } catch (err) {
    logger.error('GET /notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

nr.post('/', async (req,res) => {
  const { title, content, subject, linked_file, tags, color = 'default' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  
  try {
    const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0;
    const { rows } = await pool.query(
      `INSERT INTO notes (user_id, title, content, subject, linked_file, tags, color, word_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, title, content || '', subject || 'general', linked_file || null, tags || [], color, wordCount]
    );
    await checkAchievements(req.user.id, 'note_created');
    res.status(201).json({ note: rows[0] });
  } catch (err) {
    logger.error('POST /notes error:', err);
    res.status(500).json({ error: 'Failed to create note. ' + err.message });
  }
});

nr.get('/:id', async (req,res) => {
  const { rows } = await pool.query(
    `SELECT n.*, f.original_name AS file_name, f.file_url AS file_url 
     FROM notes n 
     LEFT JOIN files f ON f.id = n.linked_file 
     WHERE n.id=$1 AND n.user_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error:'Not found' });
  res.json({ note: rows[0] });
});

nr.put('/:id', async (req,res) => {
  const { title,content,subject,tags,color,is_pinned } = req.body;
  const wordCount = content ? content.replace(/<[^>]*>/g,'').split(/\s+/).filter(Boolean).length : 0;
  const { rows } = await pool.query(`
    UPDATE notes SET
      title=COALESCE($1,title), content=COALESCE($2,content),
      subject=COALESCE($3,subject), tags=COALESCE($4,tags),
      color=COALESCE($5,color), is_pinned=COALESCE($6,is_pinned),
      word_count=$7, updated_at=NOW()
    WHERE id=$8 AND user_id=$9 RETURNING *
  `,[title,content,subject,tags,color,is_pinned,wordCount,req.params.id,req.user.id]);
  if (!rows[0]) return res.status(404).json({ error:'Not found' });
  res.json({ note: rows[0] });
});

nr.delete('/:id', async (req,res) => {
  const { rowCount }=await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
  if (!rowCount) return res.status(404).json({ error:'Not found' });
  res.json({ message:'Deleted' });
});

module.exports = nr;
