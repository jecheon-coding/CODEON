-- ============================================================
-- 001 | users 테이블 확장 + parent_student_links 추가
-- ============================================================

-- ── 1. users 테이블 신규 컬럼 추가 ──────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login_id          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash     TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider     TEXT NOT NULL DEFAULT 'credentials',
  ADD COLUMN IF NOT EXISTS student_code      TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. 기존 Google 계정 행은 auth_provider = 'google' 로 갱신 ──
UPDATE users
SET auth_provider = 'google'
WHERE email IS NOT NULL AND auth_provider = 'credentials';

-- ── 3. role 제한: student | parent | admin ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('student', 'parent', 'admin'));
  END IF;
END $$;

-- ── 4. status 제한: pending | active | inactive ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;
END $$;

-- 기존 'approved' 값을 'active' 로 일괄 변환 (컬럼이 이미 있는 경우)
UPDATE users SET status = 'active' WHERE status = 'approved';

-- ── 5. parent_student_links 테이블 ───────────────────────────
CREATE TABLE IF NOT EXISTS parent_student_links (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship     TEXT        NOT NULL DEFAULT 'parent',  -- parent | guardian 등
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_user_id, student_user_id)
);

-- ── 6. 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_login_id     ON users (login_id);
CREATE INDEX IF NOT EXISTS idx_users_student_code ON users (student_code);
CREATE INDEX IF NOT EXISTS idx_psl_parent         ON parent_student_links (parent_user_id);
CREATE INDEX IF NOT EXISTS idx_psl_student        ON parent_student_links (student_user_id);

-- ── 7. RLS: parent_student_links ────────────────────────────
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
