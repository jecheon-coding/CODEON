import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: probs, error } = await supabaseServer
    .from("problems")
    .select("*")
    .eq("category", "파이썬도전")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authorIds = [...new Set((probs ?? []).map((p: any) => p.author_user_id).filter(Boolean))]
  const authorMap: Record<string, string> = {}
  if (authorIds.length > 0) {
    const { data: authors } = await supabaseServer
      .from("users").select("id, name").in("id", authorIds as string[])
    for (const a of (authors ?? [])) authorMap[(a as any).id] = (a as any).name ?? "학생"
  }

  const userId = (session.user as any).id as string
  const { data: solvedSubs } = await supabaseServer
    .from("submissions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("is_correct", true)
    .in("problem_id", (probs ?? []).map((p: any) => p.id))
  const solvedIds = new Set((solvedSubs ?? []).map((s: any) => s.problem_id))

  const result = (probs ?? []).map((p: any) => ({
    ...p,
    author_name: p.author_user_id ? (authorMap[p.author_user_id] ?? "학생") : null,
    is_solved: solvedIds.has(p.id),
  }))

  return NextResponse.json(result)
}
