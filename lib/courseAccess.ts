// 학생별 과정 접근 권한 — 모든 접근 지점(가이드/과정/문제 페이지, 관리자 UI, 대시보드)이
// 공유하는 단일 진실 공급원. users.allowed_courses(TEXT[] | NULL)와 1:1로 대응한다.
// NULL = 제한 없음(기본값). 배열이면 그 안에 포함된 슬러그만 허용.
//
// "파이썬도전"(코딩 챌린지)은 의도적으로 매핑하지 않는다 — 제어 대상이 아니라 항상 전체 허용.

export type CourseSlug =
  | "guide_basic" | "guide_algorithm"
  | "course_basic" | "course_algorithm" | "course_certificate" | "course_practical" | "course_competition"

export const COURSE_ACCESS_META: Record<CourseSlug, { label: string }> = {
  guide_basic:        { label: "파이썬가이드" },
  guide_algorithm:     { label: "알고리즘학습" },
  course_basic:        { label: "기초과정" },
  course_algorithm:    { label: "알고리즘과정" },
  course_certificate:  { label: "자격증과정" },
  course_practical:    { label: "실전문제" },
  course_competition:  { label: "대회준비과정" },
}

export const ALL_COURSE_SLUGS = Object.keys(COURSE_ACCESS_META) as CourseSlug[]

export function isCourseAllowed(allowed: string[] | null | undefined, slug: CourseSlug | null): boolean {
  if (slug === null) return true   // 매핑 없는 카테고리(= 파이썬도전)는 항상 허용
  if (!allowed) return true        // NULL = 제한 없음
  return allowed.includes(slug)
}

// learning_chapters.category → 가이드 슬러그 (null/"파이썬기초"는 파이썬가이드로 취급)
export function guideCategoryToSlug(category: string | null): CourseSlug {
  return category === "파이썬알고리즘" ? "guide_algorithm" : "guide_basic"
}

// problems.category(한글 라벨) → 문제풀이 과정 슬러그
const PROBLEM_CATEGORY_TO_SLUG: Record<string, CourseSlug> = {
  "파이썬기초":   "course_basic",
  "파이썬알고리즘": "course_algorithm",
  "파이썬자격증": "course_certificate",
  "파이썬실전":   "course_practical",
  "파이썬대회":   "course_competition",
  // "파이썬도전"은 의도적으로 매핑하지 않음 → 아래 함수가 null을 반환해 항상 허용됨
}
export function problemCategoryToSlug(category: string | null): CourseSlug | null {
  return category ? (PROBLEM_CATEGORY_TO_SLUG[category] ?? null) : null
}
