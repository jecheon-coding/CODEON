import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"
import type { ReactionType } from "@/types/problem"

const VALID_REACTIONS: ReactionType[] = [
  '재밌어요', '설명이 좋아요', '창의적이에요', '헷갈려요',
]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "사용자 정보 없음" }, { status: 401 })

  const { problemId, reactionType } = await req.json()
  if (!problemId || !VALID_REACTIONS.includes(reactionType))
    return NextResponse.json({ error: "유효하지 않은 입력" }, { status: 400 })

  // 이미 반응했는지 확인
  const { data: existing } = await supabaseServer
    .from("problem_reactions")
    .select("reaction_type")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .maybeSingle()

  if (existing) {
    await supabaseServer
      .from("problem_reactions")
      .delete()
      .eq("problem_id", problemId)
      .eq("user_id", userId)
      .eq("reaction_type", reactionType)
  } else {
    await supabaseServer
      .from("problem_reactions")
      .insert({ problem_id: problemId, user_id: userId, reaction_type: reactionType })
  }

  // 해당 문제의 전체 반응 집계 반환
  const { data: counts } = await supabaseServer
    .from("problem_reactions")
    .select("reaction_type")
    .eq("problem_id", problemId)

  const tally: Record<ReactionType, number> = {
    '재밌어요': 0, '설명이 좋아요': 0, '창의적이에요': 0, '헷갈려요': 0,
  }
  for (const row of counts ?? []) tally[row.reaction_type as ReactionType]++

  return NextResponse.json({ reacted: !existing, reactionType, counts: tally })
}
