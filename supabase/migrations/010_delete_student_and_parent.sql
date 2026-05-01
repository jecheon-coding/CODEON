-- ============================================================
-- 010 | 특정 학생 + 연결된 부모 계정 완전 삭제
--
-- [사용법]
--   아래 target_login_id 값을 삭제할 학생의 login_id 로 변경 후 실행.
--   예: 'student01'
--
-- [삭제 범위]
--   학생: submissions, problem_likes, problem_ratings, problem_reactions,
--         parent_link_requests, parent_student_links, assignment_students,
--         users (ON DELETE CASCADE로 자동 처리)
--   부모: parent_link_requests, parent_student_links,
--         users (ON DELETE CASCADE로 자동 처리)
--   후처리: 영향받은 problems.solve_count 재계산
-- ============================================================

DO $$
DECLARE
  target_login_id  TEXT := 'student01';  -- ← 여기에 학생 login_id 입력

  student_id       UUID;
  parent_ids       UUID[];
  affected_problems TEXT[];
BEGIN

  -- ── 1. 학생 UUID 조회 ──────────────────────────────────────
  SELECT id INTO student_id
  FROM users
  WHERE login_id = target_login_id AND role = 'student';

  IF student_id IS NULL THEN
    RAISE EXCEPTION '학생을 찾을 수 없습니다. login_id: %', target_login_id;
  END IF;

  RAISE NOTICE '대상 학생 UUID: %', student_id;

  -- ── 2. 연결된 부모 UUID 수집 ───────────────────────────────
  --    parent_student_links 에 연결된 부모
  SELECT ARRAY_AGG(DISTINCT parent_user_id) INTO parent_ids
  FROM parent_student_links
  WHERE student_user_id = student_id;

  --    부모가 없으면 빈 배열로 초기화
  parent_ids := COALESCE(parent_ids, ARRAY[]::UUID[]);

  RAISE NOTICE '연결된 부모 수: %', ARRAY_LENGTH(parent_ids, 1);

  -- ── 3. solve_count 재계산 대상 문제 목록 수집 ───────────────
  SELECT ARRAY_AGG(DISTINCT problem_id) INTO affected_problems
  FROM submissions
  WHERE user_id = student_id AND is_correct = TRUE;

  affected_problems := COALESCE(affected_problems, ARRAY[]::TEXT[]);

  -- ── 4. 학생 계정 삭제 ─────────────────────────────────────
  --    ON DELETE CASCADE 적용 테이블 (자동 삭제):
  --      submissions, problem_likes, problem_ratings, problem_reactions
  --      parent_link_requests (parent_user_id 기준)
  --      parent_student_links (student_user_id 기준)
  --      assignment_students
  DELETE FROM users WHERE id = student_id;

  RAISE NOTICE '학생 계정 삭제 완료: %', student_id;

  -- ── 5. 부모 계정 삭제 ─────────────────────────────────────
  IF ARRAY_LENGTH(parent_ids, 1) > 0 THEN
    DELETE FROM users WHERE id = ANY(parent_ids);
    RAISE NOTICE '부모 계정 삭제 완료: %', parent_ids;
  ELSE
    RAISE NOTICE '연결된 부모 계정 없음 — 건너뜀';
  END IF;

  -- ── 6. solve_count 재계산 ─────────────────────────────────
  --    submissions INSERT 트리거만 있어서 DELETE 후 수동 보정 필요
  IF ARRAY_LENGTH(affected_problems, 1) > 0 THEN
    UPDATE problems p
    SET solve_count = (
      SELECT COUNT(DISTINCT s.user_id)
      FROM submissions s
      WHERE s.problem_id = p.id AND s.is_correct = TRUE
    )
    WHERE p.id = ANY(affected_problems);

    RAISE NOTICE 'solve_count 재계산 완료: % 문제', ARRAY_LENGTH(affected_problems, 1);
  END IF;

  RAISE NOTICE '=== 삭제 완료 ===';

END $$;
