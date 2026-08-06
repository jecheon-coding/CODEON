"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ChevronDown, Lightbulb, ClipboardList, BookOpen, Copy, Check } from "lucide-react"
import GraphVisualizer from "@/components/guide/GraphVisualizer"
import RecursiveDfsVisualizer from "@/components/guide/RecursiveDfsVisualizer"
import GraphBuildVisualizer from "@/components/guide/GraphBuildVisualizer"
import GridDirectionVisualizer from "@/components/guide/GridDirectionVisualizer"
import GridBfsVisualizer from "@/components/guide/GridBfsVisualizer"
import BinarySearchVisualizer from "@/components/guide/BinarySearchVisualizer"
import ParametricSearchVisualizer from "@/components/guide/ParametricSearchVisualizer"
import BinarySearchRecursiveVisualizer from "@/components/guide/BinarySearchRecursiveVisualizer"
import BisectVisualizer from "@/components/guide/BisectVisualizer"

const COLLAPSIBLE_CODE_CONFIG = {
  hint:        { label: "힌트 보기",     icon: Lightbulb,     className: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200" },
  solution:    { label: "정답 코드 보기", icon: ClipboardList, className: "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200" },
  explanation: { label: "해설 보기",     icon: BookOpen,      className: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200" },
} as const

function CollapsibleCode({ type, code }: { type: "solution" | "hint" | "explanation"; code: string }) {
  const [open, setOpen] = useState(false)
  const { label, icon: Icon, className } = COLLAPSIBLE_CODE_CONFIG[type]
  return (
    <div className="not-prose my-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors w-full border ${className}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
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

function PlainCodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="not-prose">
      <SyntaxHighlighter
        style={oneLight}
        language={language}
        PreTag="div"
        customStyle={{ borderRadius: "0.75rem", fontSize: "13px", margin: 0, border: "1px solid #e5e7eb" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ```example-input 전용 — 연습문제 "입력 예시"만 복사 버튼을 갖는다 (다른 일반 코드
// 블록, 예: 그래프 그림 설명용 텍스트 박스에는 복사 버튼이 필요 없다는 요구사항).
function CopyableCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="not-prose relative">
      <button
        onClick={handleCopy}
        aria-label="코드 복사"
        className={`absolute top-2 right-2 z-10 flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
          copied
            ? "text-emerald-600 bg-emerald-50 border-emerald-200"
            : "text-gray-400 bg-white border-gray-200 hover:text-gray-700 hover:bg-gray-100"
        }`}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "복사됨" : "복사"}
      </button>
      <SyntaxHighlighter
        style={oneLight}
        language="text"
        PreTag="div"
        customStyle={{ borderRadius: "0.75rem", fontSize: "13px", margin: 0, border: "1px solid #e5e7eb" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default function ChapterContentRenderer({
  content,
  showHint,
  showSolution,
  showExplanation,
}: {
  content:         string
  showHint:        boolean
  showSolution:    boolean
  showExplanation: boolean
}) {
  return (
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
          // react-markdown은 코드펜스를 기본적으로 <pre>로 감싸는데, <pre>의 기본 white-space: pre가
          // 안쪽 자연어 텍스트(그래프 시각화의 캡션 등)의 줄바꿈까지 막아버려서 명시적으로 되돌린다.
          // SyntaxHighlighter는 자체적으로 white-space를 지정하므로 코드 표시엔 영향 없다.
          pre({ children }: any) {
            return <pre className="whitespace-normal">{children}</pre>
          },
          code({ node, className, children, ...props }: any) {
            const match = /language-([\w-]+)/.exec(className || "")
            const lang = match?.[1]
            const code = String(children).replace(/^\n+/, "").replace(/\n+$/, "")

            if (lang === "python-solution")    return showSolution    ? <CollapsibleCode type="solution"    code={code} /> : null
            if (lang === "python-hint")        return showHint        ? <CollapsibleCode type="hint"         code={code} /> : null
            if (lang === "python-explanation") return showExplanation ? <CollapsibleCode type="explanation" code={code} /> : null

            // ── 그래프 시각화 ──
            if (lang === "graph-dfs") return <GraphVisualizer mode="dfs" code={code} />
            if (lang === "graph-bfs") return <GraphVisualizer mode="bfs" code={code} />
            if (lang === "graph-dfs-recursive") return <RecursiveDfsVisualizer code={code} />
            if (lang === "graph-build") return <GraphBuildVisualizer code={code} />
            if (lang === "grid-directions") return <GridDirectionVisualizer code={code} />
            if (lang === "grid-bfs") return <GridBfsVisualizer code={code} />

            if (lang === "binary-search")           return <BinarySearchVisualizer code={code} />
            if (lang === "parametric-search")       return <ParametricSearchVisualizer code={code} />
            if (lang === "binary-search-recursive") return <BinarySearchRecursiveVisualizer code={code} />
            if (lang === "bisect-search")           return <BisectVisualizer code={code} />

            if (lang === "example-input") return <CopyableCodeBlock code={code} />

            if (lang) return <PlainCodeBlock language={lang} code={code} />
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
