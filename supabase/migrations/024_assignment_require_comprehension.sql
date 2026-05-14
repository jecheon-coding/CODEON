-- 과제에 이해 확인 필수 여부 컬럼 추가
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS require_comprehension BOOLEAN NOT NULL DEFAULT false;
