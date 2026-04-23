import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { problemId, action, rejectReason } = await req.json()
  if (!problemId || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "유효하지 않은 요청" }, { status: 400 })

  const update: Record<string, string> = {
    status: action === "approve" ? "published" : "hidden",
  }
  if (action === "reject" && rejectReason?.trim()) {
    update.reject_reason = rejectReason.trim()
  }

  const { error } = await supabaseServer
    .from("problems")
    .update(update)
    .eq("id", problemId)

  if (error) {
    console.error("[challenge-review]", error)
    return NextResponse.json({ error: "처리 실패" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: update.status })
}
