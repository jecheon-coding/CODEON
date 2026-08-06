"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGraphVisualization, getPseudocode, nodeLabel, type TraversalStep } from "@/lib/graphTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { GraphCanvas, type NodeState } from "@/components/guide/graph/GraphCanvas"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

// TraversalStep(currentNode/visitedOrder/frontier)에 의존하는 반복문 버전 전용 판정 로직
function nodeState(id: string, step: TraversalStep): NodeState {
  if (id === step.currentNode) return "current"
  if (step.visitedOrder.includes(id)) return "visited"
  if (step.frontier.includes(id)) return "frontier"
  return "unvisited"
}

export default function GraphVisualizer({ mode, code }: { mode: "dfs" | "bfs"; code: string }) {
  const result = useMemo(() => buildGraphVisualization(code, mode), [code, mode])
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

  const { spec, steps } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const labelOf = (id: string) => nodeLabel(spec, id)

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          mode === "dfs" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700"
        }`}>
          {mode === "dfs" ? "DFS" : "BFS"}
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "그래프 탐색"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={getPseudocode(mode)} activeLines={currentStep.codeLines} />

      {/* 본문: SVG + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GraphCanvas
          spec={spec}
          getNodeState={(id) => nodeState(id, currentStep)}
          isEdgeHighlighted={(e) => currentStep.visitedOrder.includes(e.from) && currentStep.visitedOrder.includes(e.to)}
        />

        <aside className="w-full md:w-44 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3 space-y-3">
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 mb-1">
              {mode === "dfs" ? "스택 (Stack)" : "큐 (Queue)"}
            </h4>
            <div className="flex flex-wrap gap-1">
              {currentStep.frontier.length === 0 && (
                <span className="text-[11px] text-gray-300">비어 있음</span>
              )}
              {currentStep.frontier.map((id, i) => (
                <span key={i} className="px-1.5 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  {labelOf(id)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 mb-1">방문 순서</h4>
            <div className="flex flex-wrap gap-1">
              {currentStep.visitedOrder.map((id, i) => (
                <span key={id} className="text-[11px] font-mono text-gray-600">
                  {i > 0 && <span className="text-gray-300">→</span>} {labelOf(id)}
                </span>
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
