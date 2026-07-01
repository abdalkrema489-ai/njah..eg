// src/routes/notifications.js
const notifR = require('express').Router();
const { pool } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
notifR.use(authenticate);
notifR.get('/', async (req,res) => {
  const { unread, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const params = [req.user.id];
  let where = 'user_id=$1';

  if (unread === 'true') {
    params.push(false); // is_read = false
    where += ` AND is_read=$${params.length}`;
  }

  params.push(Number(limit), offset);
  const limitIdx  = params.length - 1;
  const offsetIdx = params.length;

  const q = `SELECT id, user_id, type, title, body, data, is_read, action_url, created_at
    FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    pool.query(q, params),
    pool.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false', [req.user.id]),
  ]);
  res.json({ notifications: rows, unreadCount: parseInt(cnt[0].count) });
});
notifR.patch('/read-all', async (req,res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1',[req.user.id]);
  res.json({ message:'All read' });
});
notifR.patch('/:id/read', async (req,res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
  res.json({ message:'Read' });
});
notifR.delete('/:id', async (req,res) => {
  await pool.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
  res.json({ message:'Deleted' });
});
module.exports = notifR;
