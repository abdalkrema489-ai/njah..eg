// ════════════════════════════════════════
// src/config/postgres.js
// ════════════════════════════════════════
const { Pool } = require('pg');
const logger   = require('../utils/logger');

const connString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: connString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

logger.info('PostgreSQL connection string set to:', connString ? `postgresql://postgres:***@localhost:5432/najah_db` : 'NOT SET');
pool.on('error', err => logger.error('PG pool error:', err));

async function connectPostgres() {
  logger.info('Attempting PostgreSQL connection with:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    hasPassword: !!process.env.DB_PASSWORD,
    passwordLength: process.env.DB_PASSWORD?.length,
  });
  const client = await pool.connect();
  logger.info('✅ PostgreSQL connected');
  try {
    await runMigrations(client);
  } finally {
    client.release();
  }
}

async function runMigrations(client) {
  await client.query(`
    -- Robust Column Check & Addition (Postgres 9.6+)
    DO $$ BEGIN
      -- users
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subjects TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id UUID;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_type VARCHAR(30) DEFAULT 'school';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS university_name VARCHAR(200);
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN('student','teacher','school_admin','university','university_admin','admin'));
      -- study_sessions
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS pomodoros_done INTEGER DEFAULT 0;
      
      -- pomodoro_sessions
      ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      
      -- files
      ALTER TABLE files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE files ADD COLUMN IF NOT EXISTS description TEXT;
      
      -- quiz_attempts
      ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      
      -- notes
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
    END $$;

    -- Standard Table Creation
    CREATE TABLE IF NOT EXISTS users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(100)  NOT NULL,
      email          VARCHAR(255)  UNIQUE NOT NULL,
      password_hash  VARCHAR(255),
      google_id      VARCHAR(255)  UNIQUE,
      avatar_url     TEXT,
      grade          VARCHAR(20),
      school         VARCHAR(200),
      role           VARCHAR(20)   DEFAULT 'student' CHECK(role IN('student','teacher','school_admin','university','university_admin','admin')),
      language       VARCHAR(5)    DEFAULT 'ar',
      xp_points      INTEGER       DEFAULT 0,
      level          INTEGER       DEFAULT 1,
      streak_days    INTEGER       DEFAULT 0,
      last_active    TIMESTAMPTZ   DEFAULT NOW(),
      email_verified BOOLEAN       DEFAULT false,
      is_active      BOOLEAN       DEFAULT true,
      bio            TEXT,
      dob            DATE,
      phone          VARCHAR(20),
      social_links   JSONB         DEFAULT '{}',
      subjects       TEXT[],
      institution_id UUID,
      verification_status VARCHAR(20) DEFAULT 'unverified',
      created_at     TIMESTAMPTZ   DEFAULT NOW(),
      updated_at     TIMESTAMPTZ   DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(200) NOT NULL,
      name_ar        VARCHAR(200) NOT NULL,
      type           VARCHAR(50)  NOT NULL CHECK(type IN('school','university','tutoring_center','educational_institute')),
      school_grade   VARCHAR(50),
      curriculum_system VARCHAR(50) DEFAULT 'egyptian_national',
      admin_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      verification_status VARCHAR(20) DEFAULT 'pending',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(200) NOT NULL,
      subject        VARCHAR(100) NOT NULL,
      grade          VARCHAR(50),
      teacher_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      max_students   INTEGER DEFAULT 30,
      privacy        VARCHAR(20) DEFAULT 'private' CHECK(privacy IN('public','private')),
      schedule       JSONB DEFAULT '[]',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id       UUID REFERENCES groups(id) ON DELETE CASCADE,
      student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      status         VARCHAR(20) DEFAULT 'pending' CHECK(status IN('pending','active','rejected')),
      joined_at      TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (group_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS curriculum (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      grade_key      VARCHAR(50) NOT NULL,
      subject_name   VARCHAR(100) NOT NULL,
      units          JSONB DEFAULT '[]',
      is_core        BOOLEAN DEFAULT true,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(grade_key, subject_name)
    );


    CREATE TABLE IF NOT EXISTS study_sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      subject     VARCHAR(100) NOT NULL,
      topic       VARCHAR(300),
      start_time  TIMESTAMPTZ  NOT NULL,
      end_time    TIMESTAMPTZ  NOT NULL,
      duration    INTEGER,
      status      VARCHAR(20)  DEFAULT 'planned'
                  CHECK(status IN('planned','in_progress','completed','skipped')),
      notes       TEXT,
      linked_file UUID,
      pomodoros_done INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS files (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      name          VARCHAR(255) NOT NULL,
      original_name VARCHAR(255),
      file_url      TEXT NOT NULL,
      firebase_path TEXT,
      size_bytes    BIGINT,
      mime_type     VARCHAR(100),
      subject       VARCHAR(100),
      tags          TEXT[],
      is_public     BOOLEAN DEFAULT false,
      description   TEXT,
      download_count INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      title       VARCHAR(300) NOT NULL,
      content     TEXT,
      subject     VARCHAR(100),
      linked_file UUID REFERENCES files(id) ON DELETE SET NULL,
      tags        TEXT[],
      is_pinned   BOOLEAN DEFAULT false,
      color       VARCHAR(20) DEFAULT 'default',
      word_count  INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS board_posts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      title       VARCHAR(300) NOT NULL,
      description TEXT,
      file_id     UUID REFERENCES files(id) ON DELETE CASCADE,
      subject     VARCHAR(100),
      grade       VARCHAR(20),
      likes_count INTEGER DEFAULT 0,
      saves_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS board_likes (
      user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
      post_id  UUID REFERENCES board_posts(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS board_saves (
      user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
      post_id  UUID REFERENCES board_posts(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
      subject      VARCHAR(100),
      topic        VARCHAR(200),
      total_q      INTEGER,
      correct_q    INTEGER,
      score_pct    NUMERIC(5,2),
      difficulty   VARCHAR(20),
      time_taken   INTEGER,
      questions    JSONB,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key         VARCHAR(50) UNIQUE NOT NULL,
      title       VARCHAR(100) NOT NULL,
      description TEXT,
      icon        VARCHAR(10),
      xp_reward   INTEGER DEFAULT 0,
      category    VARCHAR(50) DEFAULT 'general',
      condition   JSONB
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
      achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
      earned_at      TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      type       VARCHAR(50) NOT NULL,
      title      VARCHAR(200) NOT NULL,
      body       TEXT,
      data       JSONB,
      is_read    BOOLEAN DEFAULT false,
      action_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      type       VARCHAR(20) DEFAULT 'focus' CHECK(type IN('focus','short_break','long_break')),
      duration   INTEGER NOT NULL,
      subject    VARCHAR(100),
      completed  BOOLEAN DEFAULT false,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id       SERIAL PRIMARY KEY,
      key      VARCHAR(50) UNIQUE,
      name_en  VARCHAR(100),
      name_ar  VARCHAR(100),
      icon     VARCHAR(10),
      color    VARCHAR(20),
      grades   TEXT[]
    );

    CREATE TABLE IF NOT EXISTS user_subject_progress (
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      subject    VARCHAR(100),
      progress   INTEGER DEFAULT 0,
      sessions   INTEGER DEFAULT 0,
      last_study TIMESTAMPTZ,
      PRIMARY KEY (user_id, subject)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON study_sessions(user_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_files_user_subject  ON files(user_id, subject);
    CREATE INDEX IF NOT EXISTS idx_notes_user_subject  ON notes(user_id, subject);
    CREATE INDEX IF NOT EXISTS idx_board_subject_date  ON board_posts(subject, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifs_user_unread  ON notifications(user_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quiz_user_subject   ON quiz_attempts(user_id, subject, created_at DESC);
  `);
  logger.info('✅ DB migrations complete');
}

module.exports = { pool, connectPostgres };
