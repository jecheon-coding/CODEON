import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })

  const parentId = (session.user as any).id as string
  if (!parentId) return NextResponse.json({ error: "세션 오류" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("parent_link_requests")
    .select("status, reject_reason")
    .eq("parent_user_id", parentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
