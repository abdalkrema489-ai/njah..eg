// src/config/passport.js
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { pool }   = require('./postgres');
const logger     = require('../utils/logger');

function setupPassport() {
  // SEC-05: Never log full credentials — show only masked suffix
  if (process.env.GOOGLE_CLIENT_ID) {
    const masked = '...' + process.env.GOOGLE_CLIENT_ID.slice(-6);
    logger.info(`Google OAuth client configured: ${masked}`);
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    logger.warn('Google OAuth disabled: missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) return done(new Error('Google account has no email'));
      const avatar = profile?.photos?.[0]?.value;

      let desiredRole = 'student';
      let desiredInstitutionType = 'school';
      try {
        if (req.query.state) {
          const stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
          if (stateObj.role && ['student', 'university', 'teacher'].includes(stateObj.role)) {
            desiredRole = stateObj.role;
            if (desiredRole === 'university') desiredInstitutionType = 'university';
          }
        }
      } catch (_) {}

      const { rows } = await pool.query(`
        INSERT INTO users (name, email, google_id, avatar_url, email_verified, role, institution_type)
        VALUES ($1, $2, $3, $4, true, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          google_id        = EXCLUDED.google_id,
          avatar_url       = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
          role             = CASE
                               WHEN users.role IS NULL OR users.role = 'student'
                               THEN EXCLUDED.role
                               ELSE users.role
                             END,
          institution_type = CASE
                               WHEN users.institution_type IS NULL OR users.institution_type = 'school'
                               THEN EXCLUDED.institution_type
                               ELSE users.institution_type
                             END,
          last_active      = NOW()
        RETURNING *
      `, [profile.displayName, email, profile.id, avatar, desiredRole, desiredInstitutionType]);

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
