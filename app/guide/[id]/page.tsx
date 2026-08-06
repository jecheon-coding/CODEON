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

  const userId = (session.user as any).id as string
  const { id } = await params

  const [{ data: chapter }, { data: allChaptersRaw }, { data: progressData }] = await Promise.all([
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
      .order("created_at",  { ascending: true }),
    supabaseServer
      .from("learning_progress")
      .select("chapter_id")
      .eq("user_id", userId),
  ])

  if (!chapter) notFound()

  // 같은 카테고리 챕터만 목차에 표시 (null은 파이썬기초로 간주)
  const chapterCat  = (chapter as any).category
  const allChapters = (allChaptersRaw ?? []).filter(c =>
    chapterCat === null || chapterCat === "파이썬기초"
      ? c.category === "파이썬기초" || c.category === null
      : c.category === chapterCat
  )

  const completedIds = (progressData ?? []).map(p => p.chapter_id)

  return (
    <GuideChapterClient
      chapter={chapter}
      allChapters={allChapters}
      userName={session.user.name ?? "학생"}
      showHint={(chapter as any).show_hint ?? true}
      showSolution={(chapter as any).show_solution ?? true}
      showExplanation={(chapter as any).show_explanation ?? true}
      initialCompletedIds={completedIds}
    />
  )
}
