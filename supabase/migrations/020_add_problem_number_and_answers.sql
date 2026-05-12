-- ============================================================
-- 020 | problems.number (전역 순번) + Q&A 복수 답변 테이블
-- ============================================================

-- 전역 문제 번호 (SERIAL = 전체 순번, 카테고리 무관)
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS number SERIAL;

-- 묻고 답하기 — 복수 답변 (누구나 작성 가능)
CREATE TABLE IF NOT EXISTS problem_question_answers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID        NOT NULL REFERENCES problem_questions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname    VARCHAR(20) NOT NULL,
  content     TEXT        NOT NULL,
  is_admin    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pqa_question ON problem_question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_pqa_user     ON problem_question_answers(user_id);
