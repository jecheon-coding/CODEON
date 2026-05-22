import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import GuideChapterClient from "./GuideChapterClient"

export const dynamic = "force-dynamic"

export default async function GuideChapterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "parent") redirect("/parent")

  const { id } = await params
  const userId = (session.user as any).id as string

  const [{ data: chapter }, { data: allChapters }, { data: progress }] = await Promise.all([
    supabaseServer
      .from("learning_chapters")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .single(),
    supabaseServer
      .from("learning_chapters")
      .select("id, title, category, order_index, parent_id")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("learning_progress")
      .select("chapter_id")
      .eq("user_id", userId),
  ])

  if (!chapter) notFound()

  const completedIds = (progress ?? []).map((p: any) => p.chapter_id as string)

  return (
    <GuideChapterClient
      chapter={chapter}
      allChapters={allChapters ?? []}
      completedIds={completedIds}
      userName={session.user.name ?? "학생"}
    />
  )
}
