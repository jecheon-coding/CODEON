-- ============================================================
-- 021 | problem_questions.title 추가 (Q&A 게시판 제목)
-- ============================================================

ALTER TABLE problem_questions
  ADD COLUMN IF NOT EXISTS title VARCHAR(100);
