import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import Link from "next/link"
import { BookOpen, BarChart2, ArrowLeft, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

const CAT_META: Record<string, { label: string; Icon: any; iconBg: string }> = {
  "파이썬기초":     { label: "파이썬 가이드",  Icon: BookOpen,  iconBg: "bg-indigo-600" },
  "파이썬알고리즘": { label: "알고리즘 학습",  Icon: BarChart2, iconBg: "bg-emerald-600" },
}

function filterCat(chapters: { id: string; category: string | null }[], key: string) {
  return key === "파이썬기초"
    ? chapters.filter(c => c.category === "파이썬기초" || c.category === null)
    : chapters.filter(c => c.category === key)
}

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "parent") redirect("/parent")

  const { category } = await searchParams

  // category 파라미터 없으면 대시보드로
  if (!category) redirect("/dashboard")

  const userId = (session.user as any).id as string

  const [{ data: chapters }, { data: progress }] = await Promise.all([
    supabaseServer
      .from("learning_chapters")
      .select("id, category, order_index, parent_id")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("created_at",  { ascending: true }),
    supabaseServer
      .from("learning_progress")
      .select("chapter_id")
      .eq("user_id", userId),
  ])

  const allChapters  = chapters ?? []
  const completedIds = new Set((progress ?? []).map((p: any) => p.chapter_id))

  const catChapters     = filterCat(allChapters, category)
  const firstIncomplete = catChapters.find(c => !completedIds.has(c.id))
  const target          = firstIncomplete ?? catChapters[0]

  // 챕터가 있으면 바로 이동
  if (target) redirect(`/guide/${target.id}`)

  // 챕터가 없으면 준비 중 화면
  const meta = CAT_META[category] ?? { label: category, Icon: BookOpen, iconBg: "bg-gray-600" }
  const Icon = meta.Icon

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-3 h-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> 학습 홈
        </Link>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 ${meta.iconBg} rounded-md flex items-center justify-center`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-extrabold text-gray-900">{meta.label}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className={`w-16 h-16 ${meta.iconBg} rounded-2xl flex items-center justify-center`}>
          <Clock className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold text-gray-900 mb-2">{meta.label} 준비 중</p>
          <p className="text-sm text-gray-500">콘텐츠를 열심히 준비하고 있어요. 곧 만나요!</p>
        </div>
        <Link
          href="/dashboard"
          className="mt-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          학습 홈으로 돌아가기
        </Link>
      </main>
    </div>
  )
}
