-- 학생별 과정 접근 권한 제어
-- NULL = 제한 없음(기존 동작과 동일, 전 학생 기본값). 배열이면 그 안의 슬러그만 접근 허용.
-- 슬러그 집합(7개)은 lib/courseAccess.ts의 CourseSlug와 반드시 일치해야 한다:
--   guide_basic, guide_algorithm,
--   course_basic, course_algorithm, course_certificate, course_practical, course_competition
-- ("파이썬도전" 코딩 챌린지는 의도적으로 제외 — 항상 전체 허용)

ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_courses TEXT[] DEFAULT NULL;

COMMENT ON COLUMN users.allowed_courses IS
  'NULL = 제한 없음(전체 과정 허용). 배열이면 그 안에 포함된 과정 슬러그만 접근 가능 (lib/courseAccess.ts 참고).';
