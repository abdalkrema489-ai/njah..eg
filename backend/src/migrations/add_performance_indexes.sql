-- ================================================================
-- Migration: Performance Indexes for Najah Platform
-- Run once on production PostgreSQL database
-- Created: 2026-04-26
-- ================================================================

-- Notes table: most queried by user_id on every page load
CREATE INDEX IF NOT EXISTS idx_notes_user_id
  ON notes(user_id);

-- Files table: heavily queried per user
CREATE INDEX IF NOT EXISTS idx_files_user_id
  ON files(user_id);

-- Study sessions: queried by user + status filter constantly
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_status
  ON study_sessions(user_id, status);

-- Study sessions: queried by date range (analytics, calendar)
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_time
  ON study_sessions(user_id, start_time DESC);

-- Board posts: popular sort uses likes_count
CREATE INDEX IF NOT EXISTS idx_board_posts_likes
  ON board_posts(likes_count DESC);

-- Board posts: created_at sort (newest first)
CREATE INDEX IF NOT EXISTS idx_board_posts_created
  ON board_posts(created_at DESC);

-- Quiz attempts: analytics + achievement checks
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
  ON quiz_attempts(user_id, created_at DESC);

-- Notifications: unread count badge queried constantly
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read);

-- Notifications: newest first sort
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Pomodoro sessions: analytics filter
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user
  ON pomodoro_sessions(user_id, completed, created_at DESC);

-- User achievements: join in checkAchievements()
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements(user_id, achievement_id);

-- User subject progress: planner + analytics
CREATE INDEX IF NOT EXISTS idx_user_subject_progress_user
  ON user_subject_progress(user_id);

-- Board likes: existence check on every board GET
CREATE INDEX IF NOT EXISTS idx_board_likes_post_user
  ON board_likes(post_id, user_id);

-- Board saves: same
CREATE INDEX IF NOT EXISTS idx_board_saves_post_user
  ON board_saves(post_id, user_id);

-- ── Additional indexes from PERF-01 audit ──────────────────────

-- Files: subject filter used in subject-based file browsing
CREATE INDEX IF NOT EXISTS idx_files_subject
  ON files(subject);

-- Board posts: subject filter (most common browse query)
CREATE INDEX IF NOT EXISTS idx_board_posts_subject
  ON board_posts(subject);

-- Notifications: partial index for unread only (tiny subset, maximum speed)
CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;

-- Study sessions: user + status (already exists as idx_study_sessions_user_status)
-- Quiz attempts: user + subject for subject analytics
CREATE INDEX IF NOT EXISTS idx_quiz_user_subject
  ON quiz_attempts(user_id, subject);

-- Users: email lookup (auth critical path)
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- Users: role + active (admin user management + stats queries)
CREATE INDEX IF NOT EXISTS idx_users_role_active
  ON users(role, is_active);

ANALYZE;
