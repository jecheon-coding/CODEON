import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { createSupabaseServer } from "@/lib/supabaseServer"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, GraduationCap, CalendarDays, Tag, Clock } from "lucide-react"
import ScrollProgressBar from "./ScrollProgressBar"

export const dynamic = "force-dynamic"

function readingMinutes(content: string): number {
  // 한국어 기준 분당 약 500자
  return Math.max(1, Math.ceil(content.replace(/\s+/g, "").length / 500))
}

export default async function ParentBlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login?role=parent")
  if ((session.user as any).role !== "parent") redirect("/login?role=parent")

  const { slug } = await params
  const supabase = createSupabaseServer()

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (!post) notFound()

  const publishedDate = new Date(post.published_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  })
  const readMin = readingMinutes(post.content ?? "")

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* 헤더 + 스크롤 진행 바 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 relative">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/parent"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 대시보드
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>주간 교육 뉴스</span>
          </div>
        </div>
        <ScrollProgressBar />
      </header>

      {/* 본문 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* 글 메타 */}
          <div className="px-6 pt-7 pb-6 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">
                주간 교육 뉴스
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {publishedDate}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" /> 약 {readMin}분 소요
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 leading-snug mb-4">
              {post.title}
            </h1>

            {post.summary && (
              <p className="text-base text-gray-500 leading-relaxed">{post.summary}</p>
            )}

            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                <Tag className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                {(post.tags as string[]).map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 핵심 포인트 */}
          {Array.isArray(post.key_points) && (post.key_points as string[]).length > 0 && (
            <div className="px-6 py-5 bg-indigo-50/60 border-b border-indigo-100/60">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">핵심 포인트</p>
              <ul className="space-y-2">
                {(post.key_points as string[]).map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-indigo-800 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 마크다운 본문 */}
          <div className="px-6 sm:px-8 py-8">
            <article className="prose prose-slate max-w-none
              prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:scroll-mt-20
              prose-h2:text-lg prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100
              prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-gray-700 prose-p:leading-[1.85] prose-p:text-[15px]
              prose-li:text-gray-700 prose-li:text-[15px] prose-li:leading-relaxed
              prose-strong:text-gray-900 prose-strong:font-bold
              prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50/40 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:text-gray-600
              prose-hr:border-gray-100 prose-hr:my-8
              prose-code:bg-gray-100 prose-code:text-indigo-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </article>
          </div>

          {/* 하단 뒤로가기 */}
          <div className="px-6 py-5 border-t border-gray-50 bg-gray-50/50">
            <Link
              href="/parent"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
