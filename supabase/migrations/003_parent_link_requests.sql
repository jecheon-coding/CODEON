-- ============================================================
-- 003 | parent_link_requests 테이블 생성
-- 학부모 연결 요청 → 관리자 승인 후 parent_student_links에 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS parent_link_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_name      TEXT        NOT NULL,
  student_name     TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  relationship     TEXT        NOT NULL DEFAULT '어머니',  -- 어머니 | 아버지 | 보호자
  status           TEXT        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reject_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID        REFERENCES users(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_plr_parent ON parent_link_requests (parent_user_id);
CREATE INDEX IF NOT EXISTS idx_plr_status ON parent_link_requests (status);

-- RLS 활성화
ALTER TABLE parent_link_requests ENABLE ROW LEVEL SECURITY;

-- 학부모 본인 요청만 조회 가능
CREATE POLICY "parent can read own requests"
  ON parent_link_requests FOR SELECT
  USING (parent_user_id = auth.uid());

-- 학부모 본인 요청 삽입 가능
CREATE POLICY "parent can insert own requests"
  ON parent_link_requests FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());
