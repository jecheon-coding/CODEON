import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import DashboardClient from "./DashboardClient"
import { supabase } from "@/lib/supabase"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "parent") redirect("/parent")

  // 대시보드에 필요한 전체 문제 목록을 서버 사이드에서 불러옵니다.
  const { data: problems } = await supabase
    .from("problems")
    .select("id, category, title, status")

  return <DashboardClient initialProblems={problems ?? []} />
}