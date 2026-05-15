import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { callGemini } from "@/lib/gemini"

export const dynamic = "force-dynamic"

// POST /api/comprehension/question
// { problemId, code } → { question }
// 같은 문제는 캐시된 질문 반환 (comprehension_question_cache 테이블)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { problemId, code } = await req.json()
  if (!problemId || !code) return NextResponse.json({ error: "problemId, code required" }, { status: 400 })

  // 캐시 확인
  try {
    const { data: cached } = await supabaseServer
      .from("comprehension_question_cache")
      .select("question")
      .eq("problem_id", problemId)
      .maybeSingle()

    if (cached?.question) {
      return NextResponse.json({ question: cached.question, cached: true })
    }
  } catch {
    // 테이블이 없으면 캐시 없이 진행
  }

  // 문제 제목 조회
  const { data: problem } = await supabaseServer
    .from("problems")
    .select("title")
    .eq("id", problemId)
    .single()

  const prompt = `너는 친절한 코딩 강사야. 학생이 방금 이 문제를 풀었어.

문제: ${problem?.title ?? ""}
학생 코드:
${code}

학생이 자기 코드를 이해하고 풀었는지 확인하려고 해.
코드의 핵심 로직이나 사용한 개념에 대해 서술형 질문 1개를 만들어.

조건:
- 코드를 직접 보지 않고도 자신의 말로 설명해야 하는 질문
- Yes/No 대답이 아닌 서술형
- 한국어로, 1문장
- 질문만 출력 (서론이나 설명 없이)`

  let question: string
  try {
    question = await callGemini(prompt)
    if (!question) return NextResponse.json({ error: "AI 응답 없음" }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "AI 생성 실패" }, { status: 500 })
  }

  // 캐시 저장 (실패해도 무시)
  try {
    await supabaseServer
      .from("comprehension_question_cache")
      .upsert({ problem_id: problemId, question })
  } catch { /* 테이블 미생성 시 무시 */ }

  return NextResponse.json({ question, cached: false })
}
