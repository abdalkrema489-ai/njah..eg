-- ================================================================
-- Migration 003: Teacher Rating System
-- Run after 001_initial_schema.sql and 002_add_teacher_wallet.sql
-- ================================================================

-- Table: one rating row per (teacher, student) pair
CREATE TABLE IF NOT EXISTS teacher_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, student_id)  -- one rating per student per teacher
);

-- Indexes for fast aggregate and lookup queries
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_teacher
  ON teacher_ratings(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_ratings_student
  ON teacher_ratings(student_id);

-- Add avg_rating and rating_count columns to users (safe: no-op if already exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avg_rating   NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ANALYZE teacher_ratings;
ANALYZE users;
