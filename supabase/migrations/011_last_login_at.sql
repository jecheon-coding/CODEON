-- 011 | users 테이블에 마지막 접속일 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
