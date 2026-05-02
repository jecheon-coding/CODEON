-- problems 테이블에 누락된 컬럼 추가 (이미 있으면 무시)
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS content            TEXT,
  ADD COLUMN IF NOT EXISTS input_description  TEXT,
  ADD COLUMN IF NOT EXISTS output_description TEXT,
  ADD COLUMN IF NOT EXISTS constraints        TEXT,
  ADD COLUMN IF NOT EXISTS initial_code       TEXT,
  ADD COLUMN IF NOT EXISTS hint               TEXT,
  ADD COLUMN IF NOT EXISTS example_input      TEXT,
  ADD COLUMN IF NOT EXISTS example_output     TEXT;
