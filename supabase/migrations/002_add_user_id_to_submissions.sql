-- ============================================================
-- 002 | submissions 테이블에 user_id 컬럼 추가
-- ============================================================
-- 기존 email 기반 식별에서 user_id (DB UUID) 기반으로 통일.
-- credentials 로그인 사용자는 email 이 null 이어서 조회가 불가했던 문제 해결.

-- ── 1. user_id 컬럼 추가 ────────────────────────────────────
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ── 2. 기존 데이터 마이그레이션: email → user_id ──────────────
UPDATE submissions s
SET user_id = u.id
FROM users u
WHERE s.email = u.email
  AND s.user_id IS NULL;

-- ── 3. 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_user_id
  ON submissions (user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_user_problem
  ON submissions (user_id, problem_id);
