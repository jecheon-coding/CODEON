import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId    = (session.user as any).id as string
  const currentId = req.nextUrl.searchParams.get("currentId")
  if (!currentId) return NextResponse.json({ error: "Missing currentId" }, { status: 400 })

  // 현재 문제의 카테고리
  const { data: current } = await supabaseServer
    .from("problems")
    .select("category")
    .eq("id", currentId)
    .single()

  if (!current) return NextResponse.json(null)

  // 같은 과정의 전체 문제 (ID 오름차순)
  const { data: courseProblems } = await supabaseServer
    .from("problems")
    .select("id, title")
    .eq("category", current.category)
    .order("id", { ascending: true })

  if (!courseProblems?.length) return NextResponse.json(null)

  // 이 학생이 맞춘 문제 ID
  const { data: solved } = await supabaseServer
    .from("submissions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("is_correct", true)

  const solvedIds  = new Set((solved ?? []).map(s => s.problem_id))
  const currentIdx = courseProblems.findIndex(p => p.id === currentId)

  for (let i = currentIdx + 1; i < courseProblems.length; i++) {
    if (!solvedIds.has(courseProblems[i].id)) return NextResponse.json(courseProblems[i])
  }
  for (let i = 0; i < currentIdx; i++) {
    if (!solvedIds.has(courseProblems[i].id)) return NextResponse.json(courseProblems[i])
  }

  return NextResponse.json(null)
}
