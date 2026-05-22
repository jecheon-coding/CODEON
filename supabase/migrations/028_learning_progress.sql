-- 학생 학습 진도 추적 테이블
CREATE TABLE learning_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  chapter_id   UUID        NOT NULL REFERENCES learning_chapters(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

CREATE INDEX ON learning_progress(user_id);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 서버(service role)에서만 조작 — 클라이언트 직접 접근 불허
