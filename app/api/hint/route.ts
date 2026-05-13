import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const problemId = req.nextUrl.searchParams.get("problemId")
  if (!problemId) return NextResponse.json({ error: "problemId required" }, { status: 400 })

  // 캐시 확인
  const { data: cached } = await supabaseServer
    .from("problem_hints")
    .select("hint_text")
    .eq("problem_id", problemId)
    .maybeSingle()

  if (cached?.hint_text) {
    return NextResponse.json({ hint: cached.hint_text, cached: true })
  }

  // 문제 정보 조회
  const { data: problem } = await supabaseServer
    .from("problems")
    .select("title, content")
    .eq("id", problemId)
    .single()

  if (!problem) return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 })

  // Gemini API 호출 (서버에서)
  const prompt = `너는 친절한 코딩 강사다.
문제: ${problem.title}
문제 설명: ${problem.content}

정답은 절대 알려주지 말고, 힌트를 정확히 3단계로 나눠 제공해라.
인사말이나 서론 없이 바로 1단계부터 시작해.
각 단계는 반드시 "1단계:", "2단계:", "3단계:" 로 시작하고, 각 단계는 2~3문장 이내로 짧게 작성해.`

  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )

  const data = await res.json()

  if (!res.ok || data?.error) {
    const errCode = data?.error?.code ?? res.status
    const errMsg  = data?.error?.message ?? "알 수 없는 오류"
    return NextResponse.json({ error: errMsg, code: errCode }, { status: res.status })
  }

  const hint = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!hint) return NextResponse.json({ error: "AI 응답 없음" }, { status: 500 })

  // DB에 캐시 저장
  await supabaseServer
    .from("problem_hints")
    .upsert({ problem_id: problemId, hint_text: hint })

  return NextResponse.json({ hint, cached: false })
}
