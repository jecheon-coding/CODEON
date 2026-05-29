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

  const [{ data: chapter }, { data: allChapters }] = await Promise.all([
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
  ])

  if (!chapter) notFound()

  return (
    <GuideChapterClient
      chapter={chapter}
      allChapters={allChapters ?? []}
      userName={session.user.name ?? "학생"}
      showHint={(chapter as any).show_hint ?? true}
      showSolution={(chapter as any).show_solution ?? true}
    />
  )
}
