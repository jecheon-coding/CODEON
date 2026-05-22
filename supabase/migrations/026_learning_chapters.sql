-- 파이썬 문법 학습 자료 챕터 테이블
CREATE TABLE learning_chapters (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  category     TEXT,                             -- '파이썬기초' 등, NULL = 공통
  content      TEXT        NOT NULL DEFAULT '',  -- 마크다운 텍스트
  order_index  INT         NOT NULL DEFAULT 0,
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON learning_chapters (is_published, order_index);

ALTER TABLE learning_chapters ENABLE ROW LEVEL SECURITY;

-- 학생: 발행된 챕터만 읽기
CREATE POLICY "published chapters readable by authenticated"
  ON learning_chapters FOR SELECT
  USING (is_published = TRUE);
