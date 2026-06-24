// src/controllers/authController.js
'use strict';
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { pool } = require('../config/postgres');
const { cacheSet, cacheDel, cacheGet } = require('../config/redis');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/tokens');
const { sendEmail } = require('../services/emailService');
const { checkAchievements } = require('../services/achievementService');
const logger   = require('../utils/logger');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

async function register(req, res) {
  const {
    name, email, password, grade, school, language = 'en',
    role = 'student', institutionType = 'school', institution,
    faculty, universityName,
    subjects,  // for teachers: comma-separated subjects they teach
  } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!['student', 'teacher', 'university'].includes(role))
    return res.status(400).json({ error: 'role must be student, university, or teacher' });

  const { rows: existingUsers } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existingUsers.length > 0)
    return res.status(409).json({ error: 'Email already in use' });

  // Use the institution field as the "school" column (backwards-compatible)
  const institutionName = institution || school || universityName || null;
  // subjects column is TEXT[] — convert comma-separated string to array if needed
  const subjectsArr = subjects
    ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim()).filter(Boolean))
    : null;
  const hash = await bcrypt.hash(password, ROUNDS);

  // Try to set role / institutionType columns if they exist (graceful fallback)
  let rows;
  try {
    const result = await pool.query(`
      INSERT INTO users (name,email,password_hash,grade,school,language,email_verified,role,institution_type,faculty,university_name,subjects)
      VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8,$9,$10,$11)
      RETURNING id,name,email,grade,level,xp_points,language,avatar_url,role,streak_days,email_verified,faculty,university_name,subjects
    `, [name, email, hash, grade || null, institutionName, language, role, institutionType, faculty || null, universityName || null, subjectsArr]);
    rows = result.rows;
  } catch {
    // Fallback: extra columns may not exist in older DB schema
    try {
      const result = await pool.query(`
        INSERT INTO users (name,email,password_hash,grade,school,language,email_verified,role,institution_type)
        VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8)
        RETURNING id,name,email,grade,level,xp_points,language,avatar_url,role,streak_days,email_verified
      `, [name, email, hash, grade || null, institutionName, language, role, institutionType]);
      rows = result.rows;
    } catch {
      // Final fallback — minimal columns only
      const result = await pool.query(`
        INSERT INTO users (name,email,password_hash,grade,school,language,email_verified)
        VALUES ($1,$2,$3,$4,$5,$6,false)
        RETURNING id,name,email,grade,level,xp_points,language,avatar_url,role,streak_days,email_verified
      `, [name, email, hash, grade || null, institutionName, language]);
      rows = result.rows;
    }
  }

  const user = rows[0];
  // Attach role from request (may not be in DB yet if column missing)
  if (!user.role) user.role = role;
  if (!user.faculty && faculty) user.faculty = faculty;
  if (!user.university_name && universityName) user.universityName = universityName;
  if (!user.subjects && subjectsArr) user.subjects = subjectsArr;

  const verifyToken = uuid();
  await cacheSet(`verify:${verifyToken}`, user.id, 86400);
  await sendEmail({ to: email, template: 'verify', data: { name, verifyToken } }).catch(() => {});
  await checkAchievements(user.id, 'register');

  logger.info(`New user: ${email} [${user.role}]`);
  res.status(201).json({
    token:   signAccess(user),
    refresh: signRefresh(user.id),
    user,
  });
}

async function guestRegister(req, res) {
  const randomId = Math.random().toString(36).slice(2, 10);
  const name = `Guest_${randomId}`;
  const email = `guest_${Date.now()}_${randomId}@guest.najah.local`;

  const { rows } = await pool.query(`
    INSERT INTO users (name, email, role, email_verified, grade, school, avatar_url)
    VALUES ($1,$2,'student',true,'Guest','Guest',NULL)
    RETURNING id,name,email,grade,level,xp_points,language,avatar_url,role,streak_days,email_verified
  `, [name, email]);

  const user = rows[0];
  await checkAchievements(user.id, 'register');
  logger.info(`Guest user registered: ${user.email}`);

  res.status(201).json({
    token:   signAccess(user),  // FIX: must pass full user object, not user.id
    refresh: signRefresh(user.id),
    user,
    guest: true,
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, grade, school, level, xp_points, language,
            avatar_url, role, streak_days, email_verified, is_active, last_active,
            institution_type, faculty, university_name, subjects, preferred_ai_provider,
            teacher_status, approval_status, admin_level
     FROM users WHERE email=$1 AND is_active=true`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.password_hash)
    return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  // If a role was specified in the login request, validate it to ensure students can't login via the teacher portal and vice-versa
  const requestedRole = req.body.role;
  if (requestedRole) {
    // If they selected teacher but the account is not a teacher
    if (requestedRole === 'teacher' && user.role !== 'teacher') {
      return res.status(403).json({ error: 'No teacher account found with this email. Please register as a teacher.' });
    }
    // If they selected student/university but the account is a teacher
    if ((requestedRole === 'student' || requestedRole === 'university') && user.role === 'teacher') {
      return res.status(403).json({ error: 'This email is registered as a teacher. Please use the teacher portal.' });
    }
  }

  // Update streak
  await pool.query(`
    UPDATE users SET
      last_active = NOW(),
      streak_days = CASE
        WHEN last_active::date = CURRENT_DATE - 1 THEN streak_days + 1
        WHEN last_active::date = CURRENT_DATE     THEN streak_days
        ELSE 1
      END
    WHERE id = $1
  `, [user.id]);

  const { password_hash, ...safe } = user;
  res.json({ token: signAccess(safe), refresh: signRefresh(user.id), user: safe });
}

async function googleCallback(req, res) {
  const user = req.user;
  const token   = signAccess(user);
  const refresh = signRefresh(user.id);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  // Security: never expose tokens in the URL (browser history, server logs, proxies).
  // Instead store them in Redis with a short-lived one-time code.
  const { v4: uuidv4 } = require('uuid');
  const code = uuidv4();
  await cacheSet(`oauth_code:${code}`, { token, refresh }, 60); // TTL = 60 seconds
  res.redirect(`${clientUrl}/auth/callback?code=${code}`);
}

async function exchangeCode(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const data = await cacheGet(`oauth_code:${code}`);
  if (!data) return res.status(400).json({ error: 'Invalid or expired code' });
  // One-time use — delete immediately after exchange
  await cacheDel(`oauth_code:${code}`);
  res.json({ token: data.token, refresh: data.refresh });
}

async function refreshToken(req, res) {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const decoded = verifyRefresh(refresh);

    // Check if old token is blacklisted
    const blacklisted = await cacheGet(`refresh_blacklist:${refresh}`);
    if (blacklisted) return res.status(401).json({ error: 'Refresh token revoked' });

    // Blacklist old refresh token (TTL matches original expiry window)
    await cacheSet(`refresh_blacklist:${refresh}`, 1, 30 * 24 * 3600);

    // Fetch fresh user row so role/name/email are preserved in new token
    const { rows: userRows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id=$1 AND is_active=true',
      [decoded.id]
    );
    if (!userRows[0]) {
      return res.status(401).json({ error: 'User account not found or deactivated' });
    }

    // Issue new pair
    const newAccess  = signAccess(userRows[0]);
    const newRefresh = signRefresh(decoded.id);
    res.json({ token: newAccess, refresh: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function logout(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) await cacheSet(`blacklist:${token}`, 1, 7 * 24 * 3600);
  res.json({ message: 'Logged out' });
}

async function verifyEmail(req, res) {
  const userId = await cacheGet(`verify:${req.params.token}`);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired link' });
  await pool.query('UPDATE users SET email_verified=true WHERE id=$1', [userId]);
  await cacheDel(`verify:${req.params.token}`);
  res.json({ message: 'Email verified' });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  const { rows } = await pool.query('SELECT id,name FROM users WHERE email=$1', [email]);
  if (rows[0]) {
    const token = uuid();
    await cacheSet(`reset:${token}`, rows[0].id, 3600);
    await sendEmail({ to: email, template: 'reset', data: { name: rows[0].name, resetToken: token } });
  }
  res.json({ message: 'If this email exists, a reset link was sent.' });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const userId = await cacheGet(`reset:${token}`);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired token' });
  const hash = await bcrypt.hash(password, ROUNDS);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);
  await cacheDel(`reset:${token}`);
  res.json({ message: 'Password reset successfully' });
}

async function getMe(req, res) {
  const { rows } = await pool.query(
    `SELECT id, name, email, grade, school, level, xp_points, language, avatar_url, role,
            streak_days, email_verified, institution_type, faculty, university_name, subjects,
            preferred_ai_provider, teacher_status, approval_status, last_active, created_at,
      (SELECT COUNT(*) FROM study_sessions WHERE user_id=u.id AND status='completed') AS sessions_completed,
      (SELECT COUNT(*) FROM files WHERE user_id=u.id) AS files_count,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id=u.id) AS achievements_count
     FROM users u WHERE u.id=$1`,
    [req.user.id]
  );
  res.json({ user: rows[0] });
}

module.exports = { register, guestRegister, login, googleCallback, exchangeCode, refreshToken, logout, verifyEmail, forgotPassword, resetPassword, getMe };
