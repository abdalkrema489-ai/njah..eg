// src/routes/achievements.js
const router = require('express').Router();
const { pool } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.*,
           (ua.user_id IS NOT NULL) AS earned,
           ua.earned_at
    FROM achievements a
    LEFT JOIN user_achievements ua
      ON ua.achievement_id = a.id AND ua.user_id = $1
    ORDER BY earned DESC, a.xp_reward DESC
  `, [req.user.id]);
  res.json({ achievements: rows });
});

router.get('/leaderboard', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT id, name, avatar_url, xp_points, level, streak_days, grade,
           RANK() OVER (ORDER BY xp_points DESC) AS rank
    FROM users
    WHERE is_active = true
      AND email NOT LIKE '%@guest.najah.local'
      AND role != 'admin'
    ORDER BY xp_points DESC
    LIMIT 50
  `);
  res.json({ leaderboard: rows });
});

module.exports = router;
