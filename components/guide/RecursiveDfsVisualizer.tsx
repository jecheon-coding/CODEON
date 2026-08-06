"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import {
  buildDfsRecursiveVisualization, nodeLabel,
  type RecursiveTraversalStep,
} from "@/lib/graphTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { GraphCanvas, type NodeState } from "@/components/guide/graph/GraphCanvas"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

// RecursiveTraversalStep(activeNode/callStack/visited)에 의존하는 재귀 버전 전용 판정 로직
function nodeState(id: string, step: RecursiveTraversalStep): NodeState {
  if (id === step.activeNode) return "current"          // 콜스택 top = 지금 실행 중
  if (step.callStack.includes(id)) return "frontier"     // 콜스택에 있지만 top 아님 = 대기 중
  if (step.visited[id]) return "visited"                 // 콜스택에 없고 방문 완료 = 완전히 반환됨
  return "unvisited"
}

export default function RecursiveDfsVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildDfsRecursiveVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>그래프 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const labelOf = (id: string) => nodeLabel(spec, id)

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          DFS(재귀)
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "그래프 탐색"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: SVG + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GraphCanvas
          spec={spec}
          getNodeState={(id) => nodeState(id, currentStep)}
          isEdgeHighlighted={(e) => currentStep.visited[e.from] && currentStep.visited[e.to]}
        />

        <aside className="w-full md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3 space-y-3">
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 mb-1">호출 스택 (Call Stack)</h4>
            <div className="flex flex-col-reverse gap-1">
              {currentStep.callStack.length === 0 && (
                <span className="text-[11px] text-gray-300">비어 있음</span>
              )}
              {currentStep.callStack.map((id, i) => (
                <div
                  key={i}
                  className={`px-2 py-1 text-[11px] font-mono rounded border ${
                    i === currentStep.callStack.length - 1
                      ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  dfs({labelOf(id)})
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 mb-1">visited</h4>
            <div className="grid grid-cols-2 gap-1">
              {spec.nodes.map(n => (
                <div key={n.id} className="flex items-center justify-between px-1.5 py-0.5 text-[11px] font-mono bg-gray-50 rounded border border-gray-200">
                  <span className="text-gray-500">{labelOf(n.id)}</span>
                  <span className={currentStep.visited[n.id] ? "text-emerald-600 font-bold" : "text-gray-300"}>
                    {currentStep.visited[n.id] ? "True" : "False"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 캡션 */}
      <CaptionBar text={currentStep.caption} />

      {/* 재생 컨트롤 */}
      <PlaybackControls
        stepIndex={playback.stepIndex}
        totalSteps={totalSteps}
        playing={playback.playing}
        speed={playback.speed}
        speeds={DEFAULT_SPEEDS}
        onReset={playback.handleReset}
        onPrev={playback.handlePrevStep}
        onNext={playback.handleNextStep}
        onTogglePlay={playback.handleTogglePlay}
        onSpeedChange={playback.setSpeed}
      />
    </div>
  )
}
