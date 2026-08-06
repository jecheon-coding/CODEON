"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import {
  buildGraphBuildVisualization, nodeLabel,
  type GraphBuildStep, type GraphEdge,
} from "@/lib/graphTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { GraphCanvas, type NodeState, type EdgeArrow } from "@/components/guide/graph/GraphCanvas"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function edgeKey(from: string, to: string): string {
  return `${from}|${to}`
}

// GraphBuildStep(activePair)에 의존하는 구축 시뮬레이션 전용 판정 로직
function nodeState(id: string, step: GraphBuildStep): NodeState {
  return step.activePair?.includes(id) ? "current" : "unvisited"
}

// append-uv 단계에선 u→v 단방향 화살표로 "graph2[u].append(v)"를, append-vu 단계에선
// 양방향 화살표로 "이제 v→u도 추가되어 완성됐다"를 보여준다. 그 외엔 일반 무방향 선.
function edgeArrow(e: GraphEdge, step: GraphBuildStep): EdgeArrow | null {
  if (!step.activePair || e.from !== step.activePair[0] || e.to !== step.activePair[1]) return null
  if (step.kind === "append-uv") return "forward"
  if (step.kind === "append-vu") return "both"
  return null
}

export default function GraphBuildVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGraphBuildVisualization(code), [code])
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

  const isEdgeVisible = (e: GraphEdge) => currentStep.visibleEdgeIds.has(edgeKey(e.from, e.to))
  const isEdgeHighlighted = (e: GraphEdge) =>
    !!currentStep.activePair && currentStep.activePair[0] === e.from && currentStep.activePair[1] === e.to

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
          그래프 구축
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "간선 리스트 → 인접 리스트"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: SVG + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GraphCanvas
          spec={spec}
          getNodeState={(id) => nodeState(id, currentStep)}
          isEdgeHighlighted={isEdgeHighlighted}
          isEdgeVisible={isEdgeVisible}
          getEdgeArrow={(e) => edgeArrow(e, currentStep)}
        />

        <aside className="w-full md:w-52 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3">
          <h4 className="text-[11px] font-bold text-gray-500 mb-1.5">graph2 (인접 리스트)</h4>
          <div className="space-y-1">
            {spec.nodes.map(n => (
              <div key={n.id} className="flex items-start gap-1.5 text-[11px] font-mono">
                <span className="text-gray-400 shrink-0">{labelOf(n.id)}:</span>
                <span className="text-gray-700">[{currentStep.adjacency[n.id].map(labelOf).join(", ")}]</span>
              </div>
            ))}
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
