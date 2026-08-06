"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ChevronDown, Lightbulb, ClipboardList } from "lucide-react"
import GraphVisualizer from "@/components/guide/GraphVisualizer"
import RecursiveDfsVisualizer from "@/components/guide/RecursiveDfsVisualizer"
import GraphBuildVisualizer from "@/components/guide/GraphBuildVisualizer"
import GridDirectionVisualizer from "@/components/guide/GridDirectionVisualizer"
import GridBfsVisualizer from "@/components/guide/GridBfsVisualizer"

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

export default function ChapterContentRenderer({
  content,
  showHint,
  showSolution,
}: {
  content:      string
  showHint:     boolean
  showSolution: boolean
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

            if (lang === "python-solution") return showSolution ? <CollapsibleCode type="solution" code={code} /> : null
            if (lang === "python-hint")     return showHint     ? <CollapsibleCode type="hint"     code={code} /> : null

            // ── 그래프 시각화 ──
            if (lang === "graph-dfs") return <GraphVisualizer mode="dfs" code={code} />
            if (lang === "graph-bfs") return <GraphVisualizer mode="bfs" code={code} />
            if (lang === "graph-dfs-recursive") return <RecursiveDfsVisualizer code={code} />
            if (lang === "graph-build") return <GraphBuildVisualizer code={code} />
            if (lang === "grid-directions") return <GridDirectionVisualizer code={code} />
            if (lang === "grid-bfs") return <GridBfsVisualizer code={code} />

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
        {content}
      </ReactMarkdown>
    </article>
  )
}
