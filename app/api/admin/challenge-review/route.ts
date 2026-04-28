import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

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
