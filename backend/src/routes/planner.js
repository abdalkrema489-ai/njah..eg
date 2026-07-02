// ════ src/routes/planner.js ════
const plannerRouter = require('express').Router();
const { pool }      = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const { checkAchievements } = require('../services/achievementService');
plannerRouter.use(authenticate);

plannerRouter.get('/', async (req, res) => {
  const { start, end, subject, status } = req.query;
  let q = 'SELECT * FROM study_sessions WHERE user_id=$1', p = [req.user.id], i = 2;
  if (start)   { q += ` AND start_time>=$${i++}`; p.push(start); }
  if (end)     { q += ` AND start_time<=$${i++}`; p.push(end); }
  if (subject) { q += ` AND subject=$${i++}`;     p.push(subject); }
  if (status)  { q += ` AND status=$${i++}`;      p.push(status); }
  q += ' ORDER BY start_time ASC';
  const { rows } = await pool.query(q, p);
  res.json({ sessions: rows });
});

plannerRouter.post('/', async (req, res) => {
  const { subject,topic,start_time,end_time,notes,linked_file,reminder_minutes,color_override } = req.body;
  if (!subject || !start_time || !end_time) return res.status(400).json({ error: 'subject, start_time, end_time required' });

  // Conflict detection: reject if the new session overlaps an existing one
  // Cast explicitly to timestamptz to avoid server-timezone drift near midnight (Cairo time)
  const { rows: conflicts } = await pool.query(`
    SELECT id, subject, start_time, end_time FROM study_sessions
    WHERE user_id=$1
      AND status != 'cancelled'
      AND start_time < $3::timestamptz
      AND end_time > $2::timestamptz
  `, [req.user.id, start_time, end_time]);

  if (conflicts.length > 0) {
    return res.status(409).json({
      error: 'تعارض في المواعيد — يوجد حصة في نفس الوقت',
      conflicts: conflicts.map(c => ({ id: c.id, subject: c.subject, start_time: c.start_time, end_time: c.end_time })),
    });
  }

  const duration = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
  const { rows } = await pool.query(
    `INSERT INTO study_sessions (user_id,subject,topic,start_time,end_time,duration,notes,linked_file,reminder_minutes,color_override)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id,subject,topic,start_time,end_time,duration,notes,linked_file,reminder_minutes || 0,color_override || null]
  );
  res.status(201).json({ session: rows[0] });
});

plannerRouter.patch('/:id', async (req, res) => {
  const { status, notes, pomodoros_done, reminder_minutes, color_override, start_time, end_time } = req.body;
  
  // Calculate new duration if start/end times change
  let durationExpr = 'duration';
  let durationVal = null;
  if (start_time && end_time) {
    durationVal = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
    durationExpr = '$6';
  }

  const { rows } = await pool.query(`
    UPDATE study_sessions SET
      status          = COALESCE($1,status),
      notes           = COALESCE($2,notes),
      pomodoros_done  = COALESCE($3,pomodoros_done),
      reminder_minutes = COALESCE($4,reminder_minutes),
      color_override  = COALESCE($5,color_override),
      duration        = COALESCE(${durationExpr},duration),
      start_time      = COALESCE($7,start_time),
      end_time        = COALESCE($8,end_time)
    WHERE id=$9 AND user_id=$10 RETURNING *
  `, [
    status,
    notes,
    pomodoros_done,
    reminder_minutes,
    color_override,
    durationVal,
    start_time,
    end_time,
    req.params.id,
    req.user.id
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  if (status === 'completed') {
    await pool.query('UPDATE users SET xp_points=xp_points+50 WHERE id=$1', [req.user.id]);
    await checkAchievements(req.user.id, 'session_complete');
    // Update subject progress
    await pool.query(`
      INSERT INTO user_subject_progress (user_id,subject,sessions,last_study)
      VALUES ($1,$2,1,NOW())
      ON CONFLICT (user_id,subject) DO UPDATE SET
        sessions=user_subject_progress.sessions+1, last_study=NOW()
    `, [req.user.id, rows[0].subject]);
  }
  res.json({ session: rows[0] });
});

plannerRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM study_sessions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = plannerRouter;
