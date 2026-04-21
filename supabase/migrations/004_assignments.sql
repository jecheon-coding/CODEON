-- ============================================================
-- 004 | 과제(Assignment) 시스템 추가
-- assignments: 과제 묶음
-- assignment_problems: 과제 ↔ 문제 연결
-- assignment_students: 과제 ↔ 학생 개인 배정
-- ============================================================

-- ── 1. assignments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. assignment_problems ───────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_problems (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  problem_id    TEXT NOT NULL REFERENCES problems(id)    ON DELETE CASCADE,
  display_order INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (assignment_id, problem_id)
);

-- ── 3. assignment_students ───────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id   UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_user_id UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assignment_id, student_user_id)
);

-- ── 4. 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_created_by
  ON assignments (created_by);

CREATE INDEX IF NOT EXISTS idx_assignment_problems_assignment
  ON assignment_problems (assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_problems_problem
  ON assignment_problems (problem_id);

CREATE INDEX IF NOT EXISTS idx_assignment_students_assignment
  ON assignment_students (assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_students_student
  ON assignment_students (student_user_id);

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;

-- assignments: 관리자는 전체 읽기/쓰기
CREATE POLICY "admin full access assignments"
  ON assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- assignments: 학생은 자신에게 배정된 과제만 조회
CREATE POLICY "student read own assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignment_students
      WHERE assignment_id = assignments.id
        AND student_user_id = auth.uid()
    )
  );

-- assignment_problems: 관리자 전체, 학생은 자신 과제 항목만
CREATE POLICY "admin full access assignment_problems"
  ON assignment_problems FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "student read own assignment_problems"
  ON assignment_problems FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignment_students
      WHERE assignment_id = assignment_problems.assignment_id
        AND student_user_id = auth.uid()
    )
  );

-- assignment_students: 관리자 전체, 학생은 자신 행만
CREATE POLICY "admin full access assignment_students"
  ON assignment_students FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "student read own assignment_students"
  ON assignment_students FOR SELECT
  USING (student_user_id = auth.uid());
