// src/routes/users.js  — FIXED: all requires at top level
'use strict';
const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const sharp      = require('sharp');
const { pool }                          = require('../config/postgres');
const { authenticate, authorize }       = require('../middleware/auth');
const { uploadAvatar }                  = require('../middleware/upload');
const { uploadToFirebase }              = require('../config/firebase');
const { checkAchievements }             = require('../services/achievementService');

// ── Public / Shared Stats ─────────────────────────────────
router.get('/public/stats', async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) AS student_count FROM users WHERE role = \'student\'');
  res.json({ count: parseInt(rows[0].student_count) });
});

router.use(authenticate);

// ── Search Users ──────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  
  const { rows } = await pool.query(`
    SELECT id, name, avatar_url, grade, school, level
    FROM users 
    WHERE (name ILIKE $1 OR id::text ILIKE $1)
    AND is_active = true
    LIMIT 10
  `, [`%${q}%`]);
  res.json({ users: rows });
});
router.get('/profile', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.*,
      (SELECT COUNT(*) FROM study_sessions  WHERE user_id=u.id AND status='completed') AS sessions_done,
      (SELECT COUNT(*) FROM files           WHERE user_id=u.id) AS files_count,
      (SELECT COUNT(*) FROM notes           WHERE user_id=u.id) AS notes_count,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id=u.id) AS ach_count,
      (SELECT COUNT(*) FROM pomodoro_sessions WHERE user_id=u.id AND completed=true AND type='focus') AS pomodoros_done,
      (SELECT COALESCE(SUM(duration),0) FROM study_sessions WHERE user_id=u.id AND status='completed') AS total_minutes
    FROM users u WHERE u.id = $1
  `, [req.user.id]);
  const { password_hash, ...safe } = rows[0];
  res.json({ profile: safe });
});

router.patch('/profile', async (req, res) => {
  const { name, grade, school, language, bio, subjects, dob, phone, social_links } = req.body;
  const { rows } = await pool.query(`
    UPDATE users SET
      name         = COALESCE($1, name),
      grade        = COALESCE($2, grade),
      school       = COALESCE($3, school),
      language     = COALESCE($4, language),
      bio          = COALESCE($5, bio),
      subjects     = COALESCE($6, subjects),
      dob          = COALESCE($7, dob),
      phone        = COALESCE($8, phone),
      social_links = COALESCE($9, social_links),
      updated_at   = NOW()
    WHERE id = $10
    RETURNING id, name, email, grade, school, language, bio, subjects, dob, phone, social_links,
              avatar_url, xp_points, level, streak_days
  `, [name, grade, school, language, bio, subjects || null, dob || null, phone || null, social_links || null, req.user.id]);
  res.json({ user: rows[0] });
});

// ── Avatar upload ─────────────────────────────────────────
router.post('/avatar', uploadAvatar, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const buf = await sharp(req.file.buffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
  const url = await uploadToFirebase(buf, `avatars/${req.user.id}.jpg`, 'image/jpeg');
  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, req.user.id]);
  res.json({ avatarUrl: url });
});

// ── Change password ───────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  // If user has a password (not Google-only), verify current
  if (rows[0].password_hash) {
    if (!currentPassword)
      return res.status(400).json({ error: 'Current password is required' });
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Password updated successfully' });
});

// ── Record Pomodoro session ───────────────────────────────
router.post('/pomodoro', async (req, res) => {
  const { type = 'focus', duration, subject, completed = false } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO pomodoro_sessions (user_id, type, duration, subject, completed)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.id, type, duration, subject || null, completed]
  );
  if (completed && type === 'focus') {
    await pool.query('UPDATE users SET xp_points = xp_points + 25 WHERE id = $1', [req.user.id]);
    await checkAchievements(req.user.id, 'pomodoro');
  }
  res.status(201).json({ session: rows[0] });
});

// ── Subject progress ──────────────────────────────────────
router.get('/progress', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT subject, progress, sessions, last_study FROM user_subject_progress WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ progress: rows });
});

// ── Dashboard stats ───────────────────────────────────────
router.get('/stats', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)               FROM study_sessions  WHERE user_id=$1 AND status='completed') AS sessions_done,
      (SELECT COALESCE(SUM(duration),0) FROM study_sessions WHERE user_id=$1 AND status='completed') AS total_minutes,
      (SELECT COUNT(*)               FROM files           WHERE user_id=$1) AS files_count,
      (SELECT COUNT(*)               FROM notes           WHERE user_id=$1) AS notes_count,
      (SELECT COUNT(*)               FROM quiz_attempts   WHERE user_id=$1) AS quizzes_taken,
      (SELECT ROUND(AVG(score_pct),1) FROM quiz_attempts  WHERE user_id=$1) AS avg_score,
      (SELECT COUNT(*) FROM pomodoro_sessions WHERE user_id=$1 AND completed=true AND type='focus') AS pomodoros_done,
      (SELECT xp_points    FROM users WHERE id=$1) AS xp_points,
      (SELECT level        FROM users WHERE id=$1) AS level,
      (SELECT streak_days  FROM users WHERE id=$1) AS streak
  `, [req.user.id]);
  res.json({ stats: rows[0] });
});

// ── GET /my-students (Teacher) ────────────────────────────
router.get('/my-students', async (req, res) => {
  try {
    if (req.user.role !== 'teacher')
      return res.status(403).json({ error: 'Teachers only' });

    const Group = require('../models/Group');
    const groups = await Group.find({ teacherId: req.user.id }, 'name students');

    // Aggregate unique students across all groups
    const studentMap = new Map();
    for (const group of groups) {
      for (const s of group.students || []) {
        if (!studentMap.has(s.userId)) {
          studentMap.set(s.userId, {
            userId: s.userId,
            name: s.name || 'Unknown',
            email: s.email || '',
            groups: [],
            joinedAt: s.joinedAt,
          });
        }
        studentMap.get(s.userId).groups.push(group.name);
      }
    }

    const studentIds = [...studentMap.keys()];
    if (studentIds.length > 0) {
      // Quiz averages
      const { rows: grades } = await pool.query(`
        SELECT user_id::text,
               ROUND(AVG(score_pct))::int AS avg_grade,
               COUNT(*) AS quiz_count
        FROM quiz_attempts
        WHERE user_id::text = ANY($1) AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY user_id
      `, [studentIds]);

      // User info
      const { rows: users } = await pool.query(`
        SELECT id::text, grade, last_active, xp_points, level, is_active
        FROM users WHERE id::text = ANY($1)
      `, [studentIds]);

      for (const u of users) {
        const student = studentMap.get(u.id);
        if (student) {
          student.grade = u.grade;
          student.lastActive = u.last_active;
          student.xp = u.xp_points;
          student.level = u.level;
          student.isActive = u.is_active;
        }
      }
      for (const g of grades) {
        const student = studentMap.get(g.user_id);
        if (student) {
          student.avgGrade = g.avg_grade;
          student.quizCount = parseInt(g.quiz_count);
        }
      }
    }

    const students = [...studentMap.values()].map(s => ({
      ...s,
      avgGrade: s.avgGrade || null,
      quizCount: s.quizCount || 0,
      status: !s.isActive ? 'Inactive'
        : (s.avgGrade != null && s.avgGrade < 60) ? 'At Risk'
        : (s.avgGrade != null && s.avgGrade < 75) ? 'Monitor'
        : 'Active',
    }));

    res.json({ success: true, students, total: students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET Public Profile by ID ──────────────────────────────
// IMPORTANT: This wildcard must come AFTER all literal routes above
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`
    SELECT id, name, avatar_url, grade, school, level, bio, subjects, xp_points, streak_days,
      (SELECT COUNT(*) FROM study_sessions  WHERE user_id=u.id AND status='completed') AS sessions_done,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id=u.id) AS ach_count,
      (SELECT COALESCE(SUM(duration),0) FROM study_sessions WHERE user_id=u.id AND status='completed') AS total_minutes
    FROM users u WHERE u.id = $1 AND is_active = true
  `, [id]);

  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ profile: rows[0] });
});

// ── Admin: list all users ─────────────────────────────────
router.get('/admin/list', authorize('admin'), async (req, res) => {
  const { page = 1, limit = 20, search, role, grade } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params = [];
  let q = `SELECT id, name, email, role, grade, school, xp_points, level,
                   streak_days, is_active, created_at, last_active, avatar_url
            FROM users WHERE 1=1`;
  let i = 1;
  if (search) { q += ` AND (name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${search}%`); i++; }
  if (role)   { q += ` AND role = $${i++}`;  params.push(role); }
  if (grade)  { q += ` AND grade = $${i++}`; params.push(grade); }
  q += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`;
  params.push(Number(limit), offset);

  const { rows }     = await pool.query(q, params);
  const { rows: cnt} = await pool.query('SELECT COUNT(*) FROM users');
  res.json({ users: rows, total: parseInt(cnt[0].count), page: Number(page) });
});

// ── Admin: platform stats ─────────────────────────────────
router.get('/admin/platform-stats', authorize('admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)                                           AS total_users,
      (SELECT COUNT(*) FROM users WHERE is_active = true)                   AS active_users,
      (SELECT COUNT(*) FROM users WHERE created_at > NOW()-INTERVAL '7 days') AS new_this_week,
      (SELECT COUNT(*) FROM study_sessions)                                  AS total_sessions,
      (SELECT COUNT(*) FROM study_sessions WHERE status='completed')         AS completed_sessions,
      (SELECT COUNT(*) FROM files)                                            AS total_files,
      (SELECT COUNT(*) FROM notes)                                            AS total_notes,
      (SELECT COUNT(*) FROM board_posts)                                      AS total_posts,
      (SELECT COUNT(*) FROM quiz_attempts)                                    AS total_quizzes,
      (SELECT ROUND(AVG(score_pct),1) FROM quiz_attempts)                    AS avg_quiz_score,
      (SELECT COUNT(*) FROM pomodoro_sessions WHERE completed=true)          AS total_pomodoros
  `);
  res.json({ stats: rows[0] });
});

// ── Admin: toggle user status ─────────────────────────────
router.patch('/admin/:id/status', authorize('admin'), async (req, res) => {
  const { is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active',
    [is_active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ user: rows[0] });
});

module.exports = router;
