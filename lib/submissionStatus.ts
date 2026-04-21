/**
 * 사용자별 문제 누적 상태 계산 — ProblemPageClient 와 course list 에서 공유
 */

export type ProblemUserStatus = "미제출" | "시도중" | "정답";

export interface ProblemUserState {
  status: ProblemUserStatus;
  count:  number;   // 총 제출 횟수
}

export interface SubmissionSummaryRow {
  problem_id: string;
  is_correct: boolean;
}

// ── 단일 문제 누적 상태 계산 ─────────────────────────────────────────────
// 정답 제출이 하나라도 있으면 이후 추가 제출 여부에 관계없이 "정답" 유지
export function calcUserStatus(subs: SubmissionSummaryRow[]): ProblemUserState {
  const count = subs.length;
  if (count === 0)                    return { status: "미제출", count: 0 };
  if (subs.some((s) => s.is_correct)) return { status: "정답",   count };
  return                                     { status: "시도중", count };
}

// ── 문제 목록 전체 상태 맵 구축 ──────────────────────────────────────────
export function buildProblemStatusMap(
  problemIds: string[],
  subs: SubmissionSummaryRow[],
): Record<string, ProblemUserState> {
  const result: Record<string, ProblemUserState> = {};
  for (const id of problemIds) {
    result[id] = calcUserStatus(subs.filter((s) => s.problem_id === id));
  }
  return result;
}

// ── 헤더/카드 배지 스타일 ────────────────────────────────────────────────
export const USER_STATUS_BADGE: Record<
  ProblemUserStatus,
  { cls: string; label: string }
> = {
  미제출: { cls: "bg-gray-100  text-gray-400",  label: "미제출"  },
  시도중: { cls: "bg-amber-100 text-amber-600", label: "시도중"  },
  정답:   { cls: "bg-emerald-500 text-white",   label: "✓ 정답" },
};
