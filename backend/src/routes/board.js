// src/routes/board.js
const br = require('express').Router();
const { pool } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const { checkAchievements } = require('../services/achievementService');
const { body, validationResult } = require('express-validator');
br.use(authenticate);

const VALID_SUBJECTS = ['mathematics','science','arabic','english','physics','chemistry','biology','history','geography','computer','religion','other'];

br.get('/', async (req,res) => {
  const { subject,search,sort='newest',page=1,limit=12 } = req.query;
  const offset=(Number(page)-1)*Number(limit);
  let q=`SELECT bp.*,u.name AS author_name,u.avatar_url AS author_avatar,f.file_url,f.mime_type,
         EXISTS(SELECT 1 FROM board_likes bl WHERE bl.post_id=bp.id AND bl.user_id=$1) AS liked,
         EXISTS(SELECT 1 FROM board_saves bs WHERE bs.post_id=bp.id AND bs.user_id=$1) AS saved
         FROM board_posts bp JOIN users u ON u.id=bp.user_id LEFT JOIN files f ON f.id=bp.file_id WHERE 1=1`;
  const p=[req.user.id]; let i=2;
  if (subject) { q+=` AND bp.subject=$${i++}`; p.push(subject); }
  if (search)  { q+=` AND bp.title ILIKE $${i++}`; p.push(`%${search}%`); }

  // Count query uses same filters (without pagination)
  let cq = `SELECT COUNT(*) FROM board_posts bp WHERE 1=1`;
  const cp = []; let ci = 1;
  if (subject) { cq += ` AND bp.subject=$${ci++}`; cp.push(subject); }
  if (search)  { cq += ` AND bp.title ILIKE $${ci++}`; cp.push(`%${search}%`); }

  q+=sort==='popular'?' ORDER BY bp.likes_count DESC':' ORDER BY bp.created_at DESC';
  q+=` LIMIT $${i++} OFFSET $${i}`; p.push(Number(limit),offset);

  const [{ rows }, countResult] = await Promise.all([
    pool.query(q,p),
    pool.query(cq, cp),
  ]);
  res.json({ posts: rows, total: parseInt(countResult.rows[0].count), page: Number(page), limit: Number(limit) });
});

br.post('/', [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
  body('subject').optional().isIn(VALID_SUBJECTS).withMessage('Invalid subject'),
  body('file_id').notEmpty().withMessage('file_id required'),
], async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, file_id, subject, grade } = req.body;
  const { rows:frows }=await pool.query('SELECT id FROM files WHERE id=$1 AND user_id=$2',[file_id,req.user.id]);
  if (!frows[0]) return res.status(403).json({ error:'File not found or not yours' });
  const { rows }=await pool.query(
    `INSERT INTO board_posts (user_id,title,description,file_id,subject,grade) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, title, description, file_id, subject, grade]
  );
  await pool.query('UPDATE files SET is_public=true WHERE id=$1',[file_id]);
  await checkAchievements(req.user.id,'board_post');
  res.status(201).json({ post: rows[0] });
});

br.post('/:id/like', async (req,res) => {
  const { id }=req.params, uid=req.user.id;
  const { rows:ex }=await pool.query('SELECT 1 FROM board_likes WHERE post_id=$1 AND user_id=$2',[id,uid]);

  if (ex[0]) {
    // Unlike — single query, no XP involved
    await pool.query('DELETE FROM board_likes WHERE post_id=$1 AND user_id=$2',[id,uid]);
    await pool.query('UPDATE board_posts SET likes_count=GREATEST(0,likes_count-1) WHERE id=$1',[id]);
    return res.json({ liked:false });
  }

  // Like — wrap 3 writes in a transaction to prevent inconsistent state
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO board_likes (post_id,user_id) VALUES ($1,$2)',[id,uid]);
    await client.query('UPDATE board_posts SET likes_count=likes_count+1 WHERE id=$1',[id]);
    await client.query(`UPDATE users SET xp_points=xp_points+5 WHERE id=(SELECT user_id FROM board_posts WHERE id=$1)`,[id]);
    await client.query('COMMIT');
    res.json({ liked:true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

br.post('/:id/save', async (req,res) => {
  const { id }=req.params, uid=req.user.id;
  const { rows:ex }=await pool.query('SELECT 1 FROM board_saves WHERE post_id=$1 AND user_id=$2',[id,uid]);
  if (ex[0]) {
    await pool.query('DELETE FROM board_saves WHERE post_id=$1 AND user_id=$2',[id,uid]);
    await pool.query('UPDATE board_posts SET saves_count=GREATEST(0,saves_count-1) WHERE id=$1',[id]);
    res.json({ saved:false });
  } else {
    await pool.query('INSERT INTO board_saves (post_id,user_id) VALUES ($1,$2)',[id,uid]);
    await pool.query('UPDATE board_posts SET saves_count=saves_count+1 WHERE id=$1',[id]);
    res.json({ saved:true });
  }
});

br.delete('/:id', async (req,res) => {
  const { rowCount }=await pool.query('DELETE FROM board_posts WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
  if (!rowCount) return res.status(404).json({ error:'Not found' });
  res.json({ message:'Deleted' });
});
module.exports = br;
