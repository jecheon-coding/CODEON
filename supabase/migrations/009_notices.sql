-- ============================================================
-- 009 | 공지사항 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS notices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  is_visible  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_visible    ON notices (is_visible);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices (created_at DESC);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (랜딩 페이지용)
CREATE POLICY "notices_public_read" ON notices
  FOR SELECT USING (true);

-- 관리자만 쓰기 (service_role key 사용 API가 RLS 우회하므로 안전)
