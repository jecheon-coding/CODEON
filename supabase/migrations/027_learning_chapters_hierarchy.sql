-- 챕터 계층 구조 추가 (장 → 절)
ALTER TABLE learning_chapters
  ADD COLUMN parent_id UUID REFERENCES learning_chapters(id) ON DELETE CASCADE;

CREATE INDEX ON learning_chapters(parent_id);
