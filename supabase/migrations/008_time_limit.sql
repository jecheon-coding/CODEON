-- ============================================================
-- 008 | problems 테이블에 시간 제한 컬럼 추가
-- ============================================================

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER DEFAULT NULL;

COMMENT ON COLUMN problems. IS '실행 시간 제한 (밀리초). NULL이면 제한 없음.';
time_limit_ms