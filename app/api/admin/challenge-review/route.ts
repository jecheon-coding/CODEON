import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/admin/challenge-review — fetch community problems with author names
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: probs, error } = await supabaseServer
    .from("problems")
    .select("id, title, content, difficulty, topic, problem_type, author_user_id, created_at, status, input_description, output_description, hint")
    .eq("is_community", true)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authorIds = [...new Set((probs ?? []).map((p: any) => p.author_user_id).filter(Boolean))]
  const authorMap: Record<string, string> = {}
  if (authorIds.length > 0) {
    const { data: authors } = await supabaseServer
      .from("users").select("id, name").in("id", authorIds as string[])
    for (const a of (authors ?? [])) authorMap[(a as any).id] = (a as any).name
  }

  const result = (probs ?? []).map((p: any) => ({
    ...p,
    problem_type: p.problem_type ?? "output",
    author_name: p.author_user_id ? (authorMap[p.author_user_id] ?? "알 수 없음") : null,
  }))

  return NextResponse.json(result)
}

// PATCH /api/admin/challenge-review
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { problemId, action } = await req.json() as { problemId: string; action: "approve" | "reject"; rejectReason?: string }

  const status = action === "approve" ? "published" : "hidden"

  const { error } = await supabaseServer
    .from("problems")
    .update({ status })
    .eq("id", problemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
