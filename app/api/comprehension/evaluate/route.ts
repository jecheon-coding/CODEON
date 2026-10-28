import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { callGemini } from "@/lib/gemini"
import { checkAiRateLimit, rateLimitResponseBody } from "@/lib/aiRateLimit"

export const dynamic = "force-dynamic"

// POST /api/comprehension/evaluate
// { problemId, question, answer, code } → { relevant, feedback, correction }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { problemId, question, answer, code } = await req.json()
  if (!problemId || !question || !answer?.trim()) {
    return NextResponse.json({ error: "problemId, question, answer required" }, { status: 400 })
  }

  const userId = (session.user as any).id as string
  const limitResult = await checkAiRateLimit(userId, "comprehension")
  if (!limitResult.ok) return NextResponse.json(rateLimitResponseBody(limitResult.limit), { status: 429 })

  const { data: problem } = await supabaseServer
    .from("problems")
    .select("title")
    .eq("id", problemId)
    .single()

  const prompt = `너는 코딩 강사야. 학생 답변이 질문에 성실하게 답했는지 엄격하게 판단해.

문제: ${problem?.title ?? ""}
학생 코드:
${code ?? ""}

질문: ${question}
학생 답변: ${answer}

[판단 기준]
- relevant: false 조건 (하나라도 해당하면 false)
  * 질문과 무관한 내용 (예: "모르겠어요", "AI에게 물어봐요", 질문 내용을 그대로 반복)
  * 코드나 문제와 전혀 관련 없는 답변
  * 의미 없는 글자/단어 나열
- relevant: true 조건
  * 코드의 동작이나 개념을 자신의 말로 설명하려는 시도가 있음 (완벽하지 않아도 됨)

[correction 작성 규칙]
- 학생 답변이 틀리거나 불완전한 부분이 있으면, 올바른 개념을 2~4문장으로 친절하게 설명해줘
- 학생 답변이 완벽하다면 null
- relevant: false이면 반드시 올바른 설명 제공

반드시 아래 JSON 형식으로만 응답해 (다른 텍스트 없이):
{"relevant": true, "feedback": "피드백 1~2문장", "correction": "올바른/보완 설명 또는 null"}
또는
{"relevant": false, "feedback": "무엇을 설명해야 하는지 한 문장", "correction": "이 질문에 대한 올바른 설명 2~4문장"}`

  try {
    const raw = await callGemini(prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ relevant: false, feedback: "평가를 불러오지 못했어요.", correction: null })
    }
    const parsed = JSON.parse(jsonMatch[0])
    const correction = parsed.correction && parsed.correction !== "null" ? parsed.correction : null
    return NextResponse.json({
      relevant: parsed.relevant === true,
      feedback: parsed.feedback ?? "평가를 불러오지 못했어요.",
      correction,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 평가 실패"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
