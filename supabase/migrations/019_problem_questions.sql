-- ============================================================
-- 019 | problem_questions 테이블 추가 (문제별 Q&A)
-- ============================================================

CREATE TABLE IF NOT EXISTS problem_questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id   TEXT        NOT NULL,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname     VARCHAR(20) NOT NULL,
  question     TEXT        NOT NULL,
  answer       TEXT,
  answered_by  UUID        REFERENCES users(id),
  answered_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pq_problem ON problem_questions(problem_id);
CREATE INDEX IF NOT EXISTS idx_pq_user    ON problem_questions(user_id);
