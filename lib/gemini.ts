const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/**
 * Gemini API 호출 유틸리티.
 * - 30초 타임아웃 (AbortController)
 * - 429/503 에러 시 최대 2회 재시도 (1s → 2s 지수 백오프)
 */
export async function callGemini(
  prompt: string,
  { timeoutMs = 30_000, maxRetries = 2 }: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<string> {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  let lastErr: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal:  controller.signal,
      })
      clearTimeout(timer)

      const data = await res.json()

      if (!res.ok) {
        if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
          await sleep(1_000 * 2 ** attempt)
          continue
        }
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
      }

      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
    } catch (err: any) {
      clearTimeout(timer)
      lastErr = err.name === "AbortError" ? new Error("요청 시간이 초과되었습니다.") : err
      if (attempt < maxRetries) await sleep(1_000 * 2 ** attempt)
    }
  }
  throw lastErr
}
