import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })
  const userId = (session.user as { id?: string }).id
  const role   = (session.user as { role?: string }).role
  if (!userId) return NextResponse.json({ error: "사용자 정보 없음" }, { status: 401 })
  if (role !== "student") return NextResponse.json({ error: "학생만 문제를 만들 수 있습니다" }, { status: 403 })

  const {
    title, content, difficulty, topic, problem_type,
    input_description, output_description,
    constraints, initial_code, hint,
    example_input, example_output,
  } = await req.json()

  if (!title?.trim() || title.trim().length < 5)
    return NextResponse.json({ error: "제목은 최소 5자 이상 입력하세요" }, { status: 400 })
  if (!content?.trim() || content.trim().length < 20)
    return NextResponse.json({ error: "문제 설명은 최소 20자 이상 입력하세요" }, { status: 400 })
  if (!["하","중","상"].includes(difficulty))
    return NextResponse.json({ error: "난이도를 선택하세요" }, { status: 400 })
  if (!example_output?.trim())
    return NextResponse.json({ error: "출력 예시는 필수입니다" }, { status: 400 })
  if (problem_type === "io" && !example_input?.trim())
    return NextResponse.json({ error: "입력/출력 문제는 입력 예시가 필요합니다" }, { status: 400 })

  const shortId   = crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  const problemId = `community_${shortId}`

  const { error: insertError } = await supabaseServer
    .from("problems")
    .insert({
      id:                 problemId,
      category:           "파이썬도전",
      title:              title.trim(),
      content:            content.trim(),
      difficulty,
      topic:              topic?.trim()              || null,
      input_description:  input_description?.trim()  || null,
      output_description: output_description?.trim() || null,
      constraints:        constraints?.trim()        || null,
      initial_code:       initial_code?.trim()       || "# 여기에 코드를 작성하세요\n",
      hint:               hint?.trim()               || null,
      author_user_id:     userId,
      is_community:       true,
      status:             "pending",
      problem_type:       problem_type === "io" ? "io" : "output",
    })

  if (insertError) {
    console.error("[challenge/create]", insertError)
    return NextResponse.json({ error: "문제 등록에 실패했습니다" }, { status: 500 })
  }

  await supabaseServer
    .from("test_cases")
    .insert({
      problem_id:      problemId,
      input:           example_input?.trim() || null,
      expected_output: example_output.trim(),
      is_hidden:       false,
      display_order:   1,
    })

  return NextResponse.json({ id: problemId, status: "pending" }, { status: 201 })
}
