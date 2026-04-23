import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "사용자 정보 없음" }, { status: 401 })

  const { problemId, score } = await req.json()
  if (!problemId || ![1, 2, 3].includes(score))
    return NextResponse.json({ error: "유효하지 않은 입력" }, { status: 400 })

  // 정답 제출 여부 확인 (정답 후에만 평가 가능)
  const { data: correctSub } = await supabaseServer
    .from("submissions")
    .select("problem_id")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .eq("is_correct", true)
    .maybeSingle()

  if (!correctSub)
    return NextResponse.json({ error: "정답 제출 후 평가 가능합니다" }, { status: 403 })

  await supabaseServer
    .from("problem_ratings")
    .upsert(
      { problem_id: problemId, user_id: userId, difficulty_score: score },
      { onConflict: "problem_id,user_id" }
    )

  // 트리거가 community_difficulty_avg를 동기화하므로 최신 값 조회
  const { data: problem } = await supabaseServer
    .from("problems")
    .select("community_difficulty_avg")
    .eq("id", problemId)
    .single()

  // 각 등급별 투표 수 집계
  const { data: ratings } = await supabaseServer
    .from("problem_ratings")
    .select("difficulty_score")
    .eq("problem_id", problemId)

  const voteCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
  for (const r of ratings ?? []) {
    const s = r.difficulty_score as 1 | 2 | 3
    if (s in voteCounts) voteCounts[s]++
  }

  return NextResponse.json({
    score,
    voteCounts,
    communityAvg: problem?.community_difficulty_avg ?? null,
  })
}
