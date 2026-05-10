-- ============================================================
-- 017 | comprehension_checks 테이블 추가
-- 정답 제출 후 이해 확인 질문 답변/건너뛰기 기록 + 가산점
-- ============================================================

CREATE TABLE IF NOT EXISTS comprehension_checks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id   TEXT        NOT NULL,
  question     TEXT        NOT NULL,
  answer       TEXT,
  feedback     TEXT,
  skipped      BOOLEAN     NOT NULL DEFAULT false,
  bonus_score  NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprehension_user    ON comprehension_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_comprehension_problem ON comprehension_checks(problem_id);
