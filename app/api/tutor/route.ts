import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { callGemini } from "@/lib/gemini"

export const dynamic = "force-dynamic"

type ChatMessage = { role: "user" | "ai"; text: string }

// POST /api/tutor
// { message, history, context } → { text }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, history, context } = await req.json()
  const trimmed = typeof message === "string" ? message.trim() : ""
  if (!trimmed) return NextResponse.json({ error: "message required" }, { status: 400 })

  const userName     = context?.userName ?? session.user.name ?? "학생"
  const courseLabel  = context?.courseLabel ?? "미정"
  const rate         = Number(context?.rate ?? 0)
  const todaySolved  = Number(context?.todaySolved ?? 0)
  const dailyGoal    = Number(context?.dailyGoal ?? 0)
  const wrong        = Number(context?.wrong ?? 0)

  const conversationHistory = (Array.isArray(history) ? (history as ChatMessage[]) : [])
    .slice(-10)
    .map(m => `${m.role === "user" ? "학생" : "튜터"}: ${m.text}`)
    .join("\n")

  const prompt = `너는 친절한 파이썬 코딩 강사 AI 튜터다.

[학생 컨텍스트]
- 이름: ${userName}
- 현재 과정: ${courseLabel}
- 정답률: ${rate}%
- 오늘 푼 문제: ${todaySolved}문제 / 목표 ${dailyGoal}문제
- 최근 오답 횟수: ${wrong}회

[대화 이력]
${conversationHistory}

[학생 질문]
${trimmed}

정답 코드를 직접 알려주지 말고, 개념과 방향을 친절하고 간결하게 3~4문장 이내로 답변해줘. 한국어만 사용해.`

  try {
    const text = await callGemini(prompt)
    return NextResponse.json({ text: text || "AI 응답 없음" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 응답 실패"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
