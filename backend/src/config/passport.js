// src/config/passport.js
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { pool }   = require('./postgres');
const logger     = require('../utils/logger');

function setupPassport() {
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***' : 'missing');
  console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    logger.warn('Google OAuth disabled: missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) return done(new Error('Google account has no email')); 
      const avatar = profile?.photos?.[0]?.value;
      const { rows } = await pool.query(`
        INSERT INTO users (name, email, google_id, avatar_url, email_verified, role)
        VALUES ($1, $2, $3, $4, true, 'student')
        ON CONFLICT (email) DO UPDATE SET
          google_id    = EXCLUDED.google_id,
          avatar_url   = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
          role         = COALESCE(users.role, 'student'),
          last_active  = NOW()
        RETURNING *
      `, [profile.displayName, email, profile.id, avatar]);
      done(null, rows[0]);
    } catch (err) {
      logger.error('Google OAuth error:', err);
      done(err);
    }
  }));
  logger.info('✅ Passport configured');
}

function isGoogleAuthEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
}

module.exports = { setupPassport, isGoogleAuthEnabled };
