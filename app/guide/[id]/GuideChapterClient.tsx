"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import {
  BookOpen, ArrowLeft, LogOut,
  ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, Circle, CheckCheck,
  ChevronDown, Lightbulb, ClipboardList,
} from "lucide-react"
import PythonEditorPanel from "@/components/PythonEditorPanel"

type ChapterSummary = {
  id:          string
  title:       string
  category:    string | null
  order_index: number
  parent_id:   string | null
}

type Chapter = ChapterSummary & {
  content:      string
  is_published: boolean
  created_at:   string
  updated_at:   string
}

type ChapterWithChildren = ChapterSummary & { children: ChapterSummary[] }

const STARTER_CODE = `# 여기에 파이썬 코드를 작성하세요
`

function CollapsibleCode({ type, code }: { type: "solution" | "hint"; code: string }) {
  const [open, setOpen] = useState(false)
  const isHint = type === "hint"
  return (
    <div className="not-prose my-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors w-full border ${
          isHint
            ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
            : "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
        }`}
      >
        {isHint
          ? <Lightbulb className="w-4 h-4 shrink-0" />
          : <ClipboardList className="w-4 h-4 shrink-0" />
        }
        {isHint ? "힌트 보기" : "정답 코드 보기"}
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1.5">
          <SyntaxHighlighter
            style={oneLight}
            language="python"
            PreTag="div"
            customStyle={{ borderRadius: "0.75rem", fontSize: "13px", margin: 0, border: "1px solid #e5e7eb" }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

export default function GuideChapterClient({
  chapter,
  allChapters,
  completedIds: initialCompleted,
  userName,
}: {
  chapter:      Chapter
  allChapters:  ChapterSummary[]
  completedIds: string[]
  userName:     string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // 완료 상태 (클라이언트에서 낙관적 업데이트)
  const [completedSet, setCompletedSet] = useState(() => new Set(initialCompleted))
  const [markingDone,  setMarkingDone]  = useState(false)

  // 계층 구조 빌드
  const roots: ChapterWithChildren[] = allChapters
    .filter(c => !c.parent_id)
    .map(c => ({
      ...c,
      children: allChapters
        .filter(ch => ch.parent_id === c.id)
        .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id))

  // 이전/다음: 전체 평탄화
  const flat = roots.flatMap(r => [r, ...r.children])
  const currentIdx  = flat.findIndex(c => c.id === chapter.id)
  const prevChapter = currentIdx > 0 ? flat[currentIdx - 1] : null
  const nextChapter = currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null

  // 진행률
  const totalCount     = allChapters.length
  const completedCount = completedSet.size
  const progressPct    = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0

  const isCurrent   = (id: string) => id === chapter.id
  const isCompleted = (id: string) => completedSet.has(id)

  // 완료 표시 / 취소
  async function toggleComplete() {
    const alreadyDone = completedSet.has(chapter.id)
    setMarkingDone(true)
    try {
      if (alreadyDone) {
        await fetch("/api/learning/progress", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter_id: chapter.id }),
        })
        setCompletedSet(prev => { const next = new Set(prev); next.delete(chapter.id); return next })
      } else {
        await fetch("/api/learning/progress", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter_id: chapter.id }),
        })
        setCompletedSet(prev => new Set([...prev, chapter.id]))
      }
    } finally {
      setMarkingDone(false)
    }
  }

  // 완료 표시 후 다음으로
  async function markAndNext() {
    if (!completedSet.has(chapter.id)) {
      await fetch("/api/learning/progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapter.id }),
      })
      setCompletedSet(prev => new Set([...prev, chapter.id]))
    }
    if (nextChapter) {
      startTransition(() => router.push(`/guide/${nextChapter.id}`))
    }
  }


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* ── 상단 헤더 ── */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 flex items-center gap-4 h-14 z-20">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> 학습 홈
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-extrabold text-gray-900">파이썬 가이드</span>
        </div>

        {/* 진행률 바 */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden min-w-0">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-gray-400 shrink-0 tabular-nums">
            {completedCount} / {totalCount}
          </span>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── 3단 본문 ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── 좌측: 목차 트리 (20%) ── */}
        <aside className="w-[20%] min-w-[180px] max-w-[260px] bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <div className="py-3">
            {roots.map((root, gi) => {
              const rootDone    = isCompleted(root.id)
              const rootCurrent = isCurrent(root.id)
              const hasCurrentChild = root.children.some(c => isCurrent(c.id))
              return (
                <div key={root.id}>
                  {/* 장 헤더 */}
                  <Link
                    href={`/guide/${root.id}`}
                    className={`flex items-center gap-2 px-3 py-2.5 text-[13px] font-bold transition-colors ${
                      rootCurrent
                        ? "bg-indigo-50 text-indigo-600"
                        : hasCurrentChild
                        ? "text-indigo-700 bg-indigo-50/80"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {rootDone && (
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${rootCurrent ? "text-indigo-500" : "text-emerald-500"}`} />
                    )}
                    <span className="leading-snug truncate">{root.title}</span>
                  </Link>

                  {/* 절 목록 */}
                  {root.children.map((sub, si) => {
                    const subDone    = isCompleted(sub.id)
                    const subCurrent = isCurrent(sub.id)
                    return (
                      <Link
                        key={sub.id}
                        href={`/guide/${sub.id}`}
                        className={`flex items-center gap-2 pl-7 pr-3 py-2 text-[12px] transition-colors border-l-2 ml-3 ${
                          subCurrent
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                            : subDone
                            ? "border-emerald-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {subDone
                          ? <CheckCircle2 className={`w-3 h-3 shrink-0 ${subCurrent ? "text-indigo-400" : "text-emerald-400"}`} />
                          : <Circle className="w-3 h-3 shrink-0 text-gray-200" />
                        }
                        <span className="leading-snug truncate">{sub.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </aside>

        {/* ── 중앙: 교재 본문 (flex-1 ~45%) ── */}
        <main className="flex-1 overflow-y-auto bg-white border-r border-gray-100">
          <div className="px-6 py-8 max-w-none">

            {/* 마크다운 본문 */}
            <article className="prose prose-slate prose-sm max-w-none
              prose-headings:font-extrabold prose-headings:text-gray-900
              prose-h1:text-lg prose-h1:mb-3
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-code:bg-gray-100 prose-code:text-indigo-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
              prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-xl prose-pre:overflow-x-auto
              prose-li:text-gray-700 prose-strong:text-gray-900
              prose-blockquote:border-indigo-400 prose-blockquote:text-gray-600
              prose-table:text-sm prose-th:bg-gray-50
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-([\w-]+)/.exec(className || "")
                    const lang = match?.[1]
                    const code = String(children).replace(/^\n+/, "").replace(/\n+$/, "")

                    if (lang === "python-solution") return <CollapsibleCode type="solution" code={code} />
                    if (lang === "python-hint")     return <CollapsibleCode type="hint"     code={code} />

                    if (lang) {
                      return (
                        <div className="not-prose">
                          <SyntaxHighlighter
                            style={oneLight}
                            language={lang}
                            PreTag="div"
                            customStyle={{ borderRadius: "0.75rem", fontSize: "13px", margin: 0, border: "1px solid #e5e7eb" }}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {chapter.content}
              </ReactMarkdown>
            </article>

            {/* 하단 네비게이션 */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col gap-3">
              {/* 완료 버튼 */}
              <div className="flex justify-center">
                <button
                  onClick={toggleComplete}
                  disabled={markingDone}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    isCompleted(chapter.id)
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {markingDone
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isCompleted(chapter.id)
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Circle className="w-4 h-4" />
                  }
                  {isCompleted(chapter.id) ? "완료됨" : "완료로 표시"}
                </button>
              </div>

              {/* 이전/다음 */}
              <div className="flex items-center justify-between">
                {prevChapter ? (
                  <Link
                    href={`/guide/${prevChapter.id}`}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <div>
                      <div className="text-[10px]">이전</div>
                      <div className="font-semibold text-gray-700 group-hover:text-indigo-600">{prevChapter.title}</div>
                    </div>
                  </Link>
                ) : <div />}

                {nextChapter ? (
                  <button
                    onClick={markAndNext}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors group text-right"
                  >
                    <div>
                      <div className="text-[10px]">다음</div>
                      <div className="font-semibold text-gray-700 group-hover:text-indigo-600">{nextChapter.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                    <CheckCheck className="w-4 h-4" /> 마지막 챕터
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── 우측: 코드 에디터 (35%) ── */}
        <section className="w-[35%] min-w-[320px] shrink-0 overflow-hidden">
          <PythonEditorPanel initialCode={STARTER_CODE} storageKey="guide" />
        </section>

      </div>
    </div>
  )
}
