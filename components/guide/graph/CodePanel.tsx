"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"

export function CodePanel({
  lines, activeLines, collapseBefore = 0,
}: {
  lines:          string[]
  activeLines:    number[]
  collapseBefore?: number   // 이 인덱스 이전 줄들은 기본적으로 접어둔다(예: 컨텍스트용 데이터 선언부)
}) {
  const [expanded, setExpanded] = useState(false)
  const forceExpand = activeLines.some(i => i < collapseBefore)
  const collapsed = collapseBefore > 0 && !expanded && !forceExpand

  return (
    <div className="px-4 pt-3 pb-2 border-b border-gray-100">
      <div className="bg-[#1e1e1e] rounded-lg overflow-x-auto">
        {collapsed && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
            그래프 데이터 보기 ({collapseBefore}줄)
          </button>
        )}
        {lines.map((line, i) => {
          if (collapsed && i < collapseBefore) return null
          return (
            <div
              key={i}
              className={`flex px-3 py-0.5 font-mono text-[12px] whitespace-pre transition-colors duration-200 ${
                activeLines.includes(i)
                  ? "bg-indigo-500/25 border-l-2 border-indigo-400 text-white font-semibold"
                  : "border-l-2 border-transparent text-gray-400"
              }`}
            >
              <span className="w-5 shrink-0 text-right mr-3 text-gray-600 select-none tabular-nums">{i + 1}</span>
              <span>{line || " "}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
