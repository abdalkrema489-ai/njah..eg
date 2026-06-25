// ════════════════════════════════════════
// src/middleware/auth.js
// ════════════════════════════════════════
const jwt      = require('jsonwebtoken');
const { pool } = require('../config/postgres');
const { cacheGet } = require('../config/redis');

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  const token = auth.split(' ')[1];
  try {
    const blacklisted = await cacheGet(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ error: 'Token revoked' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT id,name,email,role,grade,xp_points,level,language,avatar_url,streak_days,subjects,preferred_ai_provider
  FROM users WHERE id=$1 AND is_active=true`,
      [decoded.id]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expired' });
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// Optional auth - doesn't fail if no token
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();
  try {
    const token   = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active, avatar_url, language FROM users WHERE id=$1 AND is_active=true',
      [decoded.id]
    );
    if (rows[0]) req.user = rows[0];
  } catch {}
  next();
}

function blockGuests(req, res, next) {
  if (req.user?.email?.endsWith('@guest.najah.local')) {
    return res.status(403).json({
      error: 'يجب إنشاء حساب للقيام بهذا الإجراء',
      code: 'GUEST_RESTRICTED'
    });
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth, blockGuests };
