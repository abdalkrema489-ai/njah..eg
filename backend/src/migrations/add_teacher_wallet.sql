-- ═══════════════════════════════════════════════════════
-- Migration: Teacher Wallet + Revenue Distribution System
-- ═══════════════════════════════════════════════════════

-- 1. جدول الإيرادات التفصيلية للمدرس
CREATE TABLE IF NOT EXISTS teacher_earnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id  VARCHAR(100) NOT NULL,
  group_id        VARCHAR(100) NOT NULL,
  group_name      VARCHAR(255),
  student_id      UUID NOT NULL REFERENCES users(id),
  student_name    VARCHAR(255),
  gross_amount    NUMERIC(10,2) NOT NULL,
  fee_percent     NUMERIC(5,2)  NOT NULL,
  fee_amount      NUMERIC(10,2) NOT NULL,
  net_amount      NUMERIC(10,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'available',
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transaction_id)
);

-- 2. جدول طلبات السحب
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES users(id),
  amount          NUMERIC(10,2) NOT NULL,
  method          VARCHAR(30) NOT NULL,
  account_number  VARCHAR(100) NOT NULL,
  account_name    VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'pending',
  admin_note      TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  processed_by    VARCHAR(100)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher ON teacher_earnings(teacher_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_teacher ON withdrawal_requests(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status, requested_at DESC);

-- 4. Wallet columns on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance    NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned      NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_withdrawn NUMERIC(10,2) DEFAULT 0.00;
