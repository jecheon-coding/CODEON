export type AccuracyStats = {
  correctProblemCount:   number  // 정답 고유 문제 수
  attemptedProblemCount: number  // 도전 고유 문제 수
  rate:                  number  // 정답률 % (고유 문제 기준)
  totalSubmitCount:      number  // 총 제출 횟수 (참고용)
}

/**
 * 고유 문제 기준 정답률 계산.
 * 같은 문제를 여러 번 제출해도 한 번만 카운트.
 */
export function calcAccuracy(
  subs: { problem_id: string; is_correct: boolean }[]
): AccuracyStats {
  const correctIds   = new Set(subs.filter(s => s.is_correct).map(s => s.problem_id))
  const attemptedIds = new Set(subs.map(s => s.problem_id))

  const correctProblemCount   = correctIds.size
  const attemptedProblemCount = attemptedIds.size
  const totalSubmitCount      = subs.length
  const rate = attemptedProblemCount > 0
    ? Math.round((correctProblemCount / attemptedProblemCount) * 100)
    : 0

  return { correctProblemCount, attemptedProblemCount, rate, totalSubmitCount }
}
