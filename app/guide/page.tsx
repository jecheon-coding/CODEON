import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function GuidePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "parent") redirect("/parent")

  const userId = (session.user as any).id as string

  const [{ data: chapters }, { data: progress }] = await Promise.all([
    supabaseServer
      .from("learning_chapters")
      .select("id, order_index, parent_id")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("learning_progress")
      .select("chapter_id")
      .eq("user_id", userId),
  ])

  if (!chapters || chapters.length === 0) redirect("/dashboard")

  const completedIds = new Set((progress ?? []).map((p: any) => p.chapter_id))

  // 첫 미완료 챕터로 이동 (없으면 첫 번째로)
  const firstIncomplete = chapters.find(c => !completedIds.has(c.id))
  const target = firstIncomplete ?? chapters[0]

  redirect(`/guide/${target.id}`)
}
