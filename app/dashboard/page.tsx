import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import DashboardClient from "./DashboardClient"
import { supabaseServer as supabase } from "@/lib/supabaseServer"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "parent") redirect("/parent")

  const userId = (session.user as any).id as string
  const role   = (session.user as any).role as string

  // 대시보드에 필요한 전체 문제 목록을 서버 사이드에서 불러옵니다.
  const [{ data: problems }, { data: me }] = await Promise.all([
    supabase
      .from("problems")
      .select("id, category, title, status, difficulty")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("id"),
    role === "student"
      ? supabase.from("users").select("allowed_courses").eq("id", userId).single()
      : Promise.resolve({ data: null }),
  ])

  return <DashboardClient initialProblems={problems ?? []} allowedCourses={me?.allowed_courses ?? null} />
}