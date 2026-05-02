import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

const LIMIT = 20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "parent")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parentId = (session.user as any).id as string

  // 연결된 자녀 조회
  const { data: links } = await supabaseServer
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", parentId)
    .limit(1)

  const studentId = links?.[0]?.student_user_id
  if (!studentId)
    return NextResponse.json({ error: "No linked student" }, { status: 404 })

  const params    = req.nextUrl.searchParams
  const page      = Math.max(1, parseInt(params.get("page") ?? "1"))
  const filter    = params.get("filter") ?? "all"
  const dateRange = params.get("dateRange") ?? "all"

  // 기본 쿼리
  let query = supabaseServer
    .from("submissions")
    .select("problem_id, is_correct, created_at", { count: "exact" })
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })

  // 정답/오답 필터
  if (filter === "correct") {
    query = query.eq("is_correct", true)
  } else if (filter === "wrong") {
    // 한 번이라도 정답 처리된 problem_id 제외 (미해결 오답만 표시)
    const { data: solvedData } = await supabaseServer
      .from("submissions")
      .select("problem_id")
      .eq("user_id", studentId)
      .eq("is_correct", true)

    const solvedIds = [...new Set((solvedData ?? []).map((s: any) => s.problem_id as string))]

    query = query.eq("is_correct", false)
    if (solvedIds.length > 0) {
      query = query.not("problem_id", "in", `(${solvedIds.join(",")})`)
    }
  }

  // 날짜 필터
  if (dateRange !== "all") {
    const now = new Date()
    if (dateRange === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      query = query.gte("created_at", start.toISOString())
    } else if (dateRange === "week") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query = query.gte("created_at", start.toISOString())
    } else if (dateRange === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      query = query.gte("created_at", start.toISOString())
    }
  }

  const offset = (page - 1) * LIMIT
  const { data: rows, count, error } = await query.range(offset, offset + LIMIT - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  if (!rows || rows.length === 0)
    return NextResponse.json({ data: [], total, page, limit: LIMIT, totalPages })

  // 문제 정보 조회
  const problemIds = [...new Set(rows.map(r => r.problem_id))]
  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, topic")
    .in("id", problemIds)

  const problemMap = new Map((problems ?? []).map(p => [p.id, p]))

  const data = rows.map(r => {
    const p = problemMap.get(r.problem_id)
    return {
      title:     p?.title ?? "알 수 없음",
      isCorrect: r.is_correct,
      createdAt: r.created_at,
      topic:     p?.topic ?? null,
    }
  })

  return NextResponse.json({ data, total, page, limit: LIMIT, totalPages })
}
