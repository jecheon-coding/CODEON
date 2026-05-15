import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { callGemini } from "@/lib/gemini"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

const INPUT_TYPE_DESC: Record<string, string> = {
  none:    "입력값 없음 — 고정된 값을 출력하는 문제 (예: 구구단 전체 출력, 특정 패턴 출력)",
  simple:  "단순 입출력 — 숫자 1~2개 또는 짧은 문자열 1개를 입력받는 문제",
  complex: "복합 입력 — 배열, 여러 줄 입력, 반복 구조 등 복잡한 입력 형태",
}

// POST /api/admin/problems/ai-draft
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, difficulty, category, topic, description, inputType = "simple" } = await req.json()
  if (!title) return NextResponse.json({ error: "title은 필수입니다." }, { status: 400 })

  const diffLabel = difficulty === "하" ? "초급 (쉬움)" : difficulty === "중" ? "중급" : "고급 (어려움)"
  const inputDesc = INPUT_TYPE_DESC[inputType] ?? INPUT_TYPE_DESC.simple

  const prompt = `당신은 파이썬 코딩 교육 플랫폼의 문제 작성 전문가입니다.
아래 정보를 바탕으로 코딩 문제의 각 항목을 작성해주세요.

문제 제목: ${title}
난이도: ${diffLabel}
코스: ${category ?? "미지정"}
주제: ${topic ?? "미지정"}
입력 유형: ${inputDesc}
${description ? `추가 설명: ${description}` : ""}

다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "content": "문제 본문 (학생에게 보여줄 설명, 2~4문단, 구체적인 예시나 스토리 포함)",
  "input_description": "입력 형식 설명 (입력 없는 문제면 null)",
  "output_description": "출력 형식 설명",
  "constraints": "제한 조건 (없으면 null, 있으면 각 조건을 줄바꿈으로 구분)",
  "example_input": "예제 입력 (입력 없는 문제면 null)",
  "example_output": "예제 출력",
  "initial_code": "에디터 초기 코드 (파이썬, 주석 포함 5~15줄, 정답 로직 제외)",
  "hint": "선생님 힌트 (풀이 접근법, 2~3문장)"
}

규칙:
- 문체는 한국어, 중학생~고등학생 대상
- content는 흥미로운 스토리나 실생활 예시를 포함
- initial_code는 입력 처리 부분만 작성 (정답 로직 제외)
- 입력 유형에 맞는 example_input/output 작성
- 난이도에 맞는 복잡도로 작성`

  let text: string
  try {
    text = await callGemini(prompt, { timeoutMs: 45_000 })
    if (!text) return NextResponse.json({ error: "AI 응답 없음" }, { status: 500 })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: "AI 응답 파싱 실패" }, { status: 500 })

    const draft = JSON.parse(jsonMatch[0])
    return NextResponse.json(draft)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "AI 생성 실패" }, { status: 500 })
  }
}
