import { supabaseServer } from "@/lib/supabaseServer"

// AI(Gemini) 호출 일일 사용량 제한 — /api/tutor, /api/comprehension/question,
// /api/comprehension/evaluate가 세션 인증만 확인하고 호출 횟수는 전혀 제한하지
// 않아, 악용 시 AI 비용이 그대로 새어나갈 수 있던 문제를 막는다.
//
// DB의 increment_ai_usage() 함수가 원자적으로 증가시키므로 동시 요청에도 정확하다.
// 서버리스/다중 인스턴스 배포에서도 안전하도록 메모리가 아닌 DB에 집계한다.

export type AiEndpoint = "tutor" | "comprehension"

// 필요에 따라 조정. tutor는 대화형이라 넉넉하게, comprehension은 문제 하나당
// question+evaluate가 한 쌍으로 소모되므로(보통 하루 문제 풀이 수와 비슷한 수준).
const DAILY_LIMITS: Record<AiEndpoint, number> = {
  tutor: 50,
  comprehension: 60,
}

export type RateLimitResult = { ok: true } | { ok: false; limit: number }

export async function checkAiRateLimit(userId: string, endpoint: AiEndpoint): Promise<RateLimitResult> {
  const limit = DAILY_LIMITS[endpoint]
  const { data, error } = await supabaseServer.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_endpoint: endpoint,
  })

  if (error) {
    // 집계 자체가 실패하면(예: 마이그레이션 미적용) 서비스 중단보다 통과가 안전하므로
    // 막지 않고 로그만 남긴다 — 비용 보호가 완벽히 작동하지 않더라도 가용성을 우선.
    console.error("[checkAiRateLimit] RPC 오류:", error.message)
    return { ok: true }
  }

  if (typeof data === "number" && data > limit) return { ok: false, limit }
  return { ok: true }
}

export function rateLimitResponseBody(limit: number) {
  return { error: `오늘의 AI 사용 횟수(${limit}회)를 모두 사용했습니다. 내일 다시 이용해주세요.` }
}
