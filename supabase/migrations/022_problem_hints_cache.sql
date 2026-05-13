-- 문제별 AI 힌트 캐시 테이블
CREATE TABLE IF NOT EXISTS problem_hints (
  problem_id TEXT PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
  hint_text  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
