import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { callGemini } from "@/lib/gemini"

export const dynamic = "force-dynamic"

type FailedCase = {
  input?: string | null
  expected?: string | null
  actual?: string | null
  errorMsg?: string | null
}

// POST /api/analyze
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { problemTitle, problemContent, code, failedCases } = await req.json() as {
    problemTitle: string
    problemContent: string
    code: string
    failedCases: FailedCase[]
  }

  if (!code || !failedCases?.length)
    return NextResponse.json({ error: "code and failedCases required" }, { status: 400 })

  const caseText = failedCases.slice(0, 3).map((c, i) => {
    const lines = [`케이스 ${i + 1}:`]
    if (c.input    != null) lines.push(`  입력: ${c.input || "(없음)"}`)
    if (c.expected != null) lines.push(`  기대 출력: ${c.expected}`)
    if (c.actual   != null) lines.push(`  실제 출력: ${c.actual}`)
    if (c.errorMsg != null) lines.push(`  오류: ${c.errorMsg}`)
    return lines.join("\n")
  }).join("\n")

  const prompt = `너는 친절한 Python 코딩 강사다. 학생의 코드를 보고 왜 틀렸는지 분석해줘.

문제: ${problemTitle}
${problemContent ? `문제 설명: ${problemContent.substring(0, 400)}` : ""}

학생 코드:
\`\`\`python
${code.substring(0, 1500)}
\`\`\`

실패한 테스트 케이스:
${caseText}

분석 지침:
- 정답 코드는 절대 알려주지 마
- 코드의 어느 부분에서 왜 틀렸는지 핵심만 설명해
- 2~3문장, 한국어, 친절하게
- 학생이 스스로 고칠 수 있도록 방향만 제시해`

  try {
    const analysis = await callGemini(prompt, { timeoutMs: 25_000, maxRetries: 1 })
    return NextResponse.json({ analysis })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "분석 실패" }, { status: 500 })
  }
}
