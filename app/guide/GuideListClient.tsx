"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  BookOpen, ChevronRight, ArrowLeft, LogOut, GraduationCap,
} from "lucide-react"

type Chapter = {
  id:          string
  title:       string
  category:    string | null
  order_index: number
  parent_id:   string | null
}

type ChapterWithChildren = Chapter & { children: Chapter[] }

export default function GuideListClient({
  chapters,
  userName,
}: {
  chapters: Chapter[]
  userName: string
}) {
  const router = useRouter()

  // 계층 구조 빌드: parent_id가 없는 것 = 장(章), 있는 것 = 절(節)
  const roots: ChapterWithChildren[] = chapters
    .filter(c => !c.parent_id)
    .map(c => ({
      ...c,
      children: chapters
        .filter(ch => ch.parent_id === c.id)
        .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id))

  // 부모 없이 단독으로 존재하는 절도 표시
  const orphans = chapters.filter(
    c => c.parent_id && !chapters.find(p => p.id === c.parent_id)
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 학습 홈
          </button>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-extrabold text-gray-900">파이썬 가이드</span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">파이썬 가이드</h1>
              <p className="text-sm text-gray-400">{userName}님을 위한 파이썬 학습 자료</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            문법을 배우고 바로 코드를 실습해보세요.
          </p>
        </div>

        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <BookOpen className="w-10 h-10" />
            <p className="text-sm font-medium">아직 등록된 학습 자료가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {roots.map((chapter, gi) => (
              <div key={chapter.id} className={gi > 0 ? "border-t border-gray-100" : ""}>
                {/* 장 (최상위) */}
                <Link
                  href={`/guide/${chapter.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-indigo-50/40 transition-colors group bg-gray-50/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-white">{String(gi + 1).padStart(2, "0")}</span>
                    </div>
                    <span className="text-sm font-extrabold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {chapter.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </Link>

                {/* 절 (하위) */}
                {chapter.children.map((sub, si) => (
                  <Link
                    key={sub.id}
                    href={`/guide/${sub.id}`}
                    className="flex items-center justify-between pl-12 pr-5 py-3 border-t border-gray-50 hover:bg-indigo-50/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0 tabular-nums">
                        {String(gi + 1).padStart(2, "0")}-{String(si + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                        {sub.title}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-indigo-300 transition-colors" />
                  </Link>
                ))}
              </div>
            ))}

            {/* 부모 없는 단독 절 */}
            {orphans.map(c => (
              <Link
                key={c.id}
                href={`/guide/${c.id}`}
                className="flex items-center justify-between px-5 py-4 border-t border-gray-100 hover:bg-indigo-50/40 transition-colors group"
              >
                <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{c.title}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
