import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if ((session.user as any).role !== "admin") return null
  return session
}

// GET: pending 요청 목록 + 학생 목록
export async function GET() {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const [{ data: requests }, { data: students }] = await Promise.all([
    supabaseServer
      .from("parent_link_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("users")
      .select("id, name, grade, class")
      .eq("role", "student")
      .eq("status", "active")
      .order("name"),
  ])

  return NextResponse.json({ requests: requests ?? [], students: students ?? [] })
}
