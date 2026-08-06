"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildBisectSearchVisualization, type BisectSearchStep } from "@/lib/binarySearchTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

// bisect의 탐색 구간은 [left, right) — right는 len(arr)까지 올 수 있어 일반 이분탐색과 다르다.
function cellState(c: number, step: BisectSearchStep): CellState {
  if (step.resultIndex === c) return "visited"
  if (step.mid === c) return "current"
  if (c < step.left || c >= step.right) return "wall"
  return "empty"
}

export default function BisectVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildBisectSearchVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>bisect 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const isTerminal = playback.stepIndex === steps.length - 1

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
          bisect_left
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "삽입 위치 이분탐색"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: 배열 + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GridCanvas
          rows={1} cols={spec.array.length} padding={0}
          getCellState={(_r, c) => cellState(c, currentStep)}
          getCellLabel={(_r, c) => String(spec.array[c])}
          isCellActive={(_r, c) => currentStep.mid === c}
        />

        <aside className="w-full md:w-44 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3 space-y-1">
          <div className="text-[11px] font-mono text-gray-700">left = {currentStep.left}</div>
          <div className="text-[11px] font-mono text-gray-700">right = {currentStep.right}</div>
          <div className="text-[11px] font-mono text-gray-700">mid = {currentStep.mid ?? "-"}</div>
          <div className="text-[11px] font-mono text-gray-500">x = {spec.x}</div>
          {isTerminal && currentStep.resultIndex !== null && (
            <div className="pt-2 border-t border-gray-100 text-[13px] font-bold text-emerald-600">
              결과: 인덱스 {currentStep.resultIndex}
            </div>
          )}
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
