import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "사용자 정보 없음" }, { status: 401 })

  const { problemId } = await req.json()
  if (!problemId) return NextResponse.json({ error: "problemId 필요" }, { status: 400 })

  // 이미 좋아요했는지 확인
  const { data: existing } = await supabaseServer
    .from("problem_likes")
    .select("problem_id")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    // 취소
    await supabaseServer
      .from("problem_likes")
      .delete()
      .eq("problem_id", problemId)
      .eq("user_id", userId)
  } else {
    // 추가
    await supabaseServer
      .from("problem_likes")
      .insert({ problem_id: problemId, user_id: userId })
  }

  // 트리거가 like_count를 동기화하므로 최신 값 조회
  const { data: problem } = await supabaseServer
    .from("problems")
    .select("like_count")
    .eq("id", problemId)
    .single()

  return NextResponse.json({ liked: !existing, likeCount: problem?.like_count ?? 0 })
}
