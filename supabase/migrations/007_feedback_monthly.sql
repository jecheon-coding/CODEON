-- teacher_feedback 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         TEXT,                        -- 'YYYY-MM', NULL = 레거시 행
  summary       TEXT,                        -- 이번 달 학습 내용
  tip1          TEXT,                        -- 잘한 점
  tip2          TEXT,                        -- 보완할 점
  next_plan     TEXT,                        -- 다음 달 학습 방향
  attitude      TEXT,
  needs_consult BOOLEAN NOT NULL DEFAULT FALSE,
  notice1_label TEXT,
  notice1_date  DATE,
  notice2_label TEXT,
  notice2_date  DATE,
  bundle_names  JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- (student_id, month) 복합 unique 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS teacher_feedback_student_month_uq
  ON teacher_feedback (student_id, month)
  WHERE month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_feedback_student
  ON teacher_feedback (student_id);

-- RLS
ALTER TABLE teacher_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full access feedback"
  ON teacher_feedback FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "parent read own child feedback"
  ON teacher_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_student_links
      WHERE parent_user_id = auth.uid()
        AND student_user_id = teacher_feedback.student_id
    )
  );
