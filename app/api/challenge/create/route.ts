import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string | undefined
  if (!userId) return NextResponse.json({ error: "User ID not found" }, { status: 401 })

  const body = await req.json()
  const {
    problem_type, title, content, difficulty, topic,
    input_description, output_description,
    example_input, example_output, hint,
  } = body

  if (!title?.trim() || !content?.trim() || !example_output?.trim()) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 })
  }

  const id = `community-${crypto.randomUUID()}`

  // Only insert columns confirmed to exist in the DB schema
  const { error: problemError } = await supabaseServer
    .from("problems")
    .insert({
      id,
      title:              title.trim(),
      content:            content.trim(),
      difficulty,
      topic:              topic || null,
      category:           "파이썬도전",
      is_community:       true,
      status:             "pending",
      author_user_id:     userId,
      problem_type:       problem_type ?? "output",
      input_description:  input_description || null,
      output_description: output_description || null,
      hint:               hint || null,
    })

  if (problemError) {
    console.error("[challenge/create] problem insert:", problemError.message)
    return NextResponse.json({ error: problemError.message }, { status: 500 })
  }

  // Grading criteria goes into test_cases (primary grading path in useSubmission)
  const { error: tcError } = await supabaseServer
    .from("test_cases")
    .insert({
      problem_id:      id,
      input:           example_input?.trim() || null,
      expected_output: example_output.trim(),
      is_hidden:       false,
      display_order:   1,
    })

  if (tcError) {
    console.error("[challenge/create] test_case insert:", tcError.message)
  }

  return NextResponse.json({ id }, { status: 201 })
}
