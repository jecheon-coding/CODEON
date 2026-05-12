-- ============================================================
-- 018 | users 테이블에 nickname 컬럼 추가
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(20) UNIQUE;
