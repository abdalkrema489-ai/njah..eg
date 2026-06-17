// src/utils/tokens.js
const jwt = require('jsonwebtoken');

// signAccess now accepts either a plain id OR a user object with id, role, name, email
const signAccess  = (userOrId) => {
  const payload = typeof userOrId === 'object'
    ? { id: userOrId.id, userId: userOrId.id, role: userOrId.role || 'student', name: userOrId.name, email: userOrId.email }
    : { id: userOrId, userId: userOrId, role: 'student' };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
};
const signRefresh = id => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
const verifyRefresh = token => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = { signAccess, signRefresh, verifyRefresh };
