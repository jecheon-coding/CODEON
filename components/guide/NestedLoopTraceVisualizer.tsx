"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildNestedLoopVisualization } from "@/lib/loopTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

const CELL_MAP: Record<"empty" | "current" | "visited" | "blocked", CellState> = {
  empty: "empty", current: "current", visited: "visited", blocked: "wall",
}

export default function NestedLoopTraceVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildNestedLoopVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>이중 반복문 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">
          이중 반복문
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "중첩 반복 실행 순서"}</span>
        {spec.useFlag && currentStep.flagValue !== null && (
          <span className={`ml-auto text-[11px] font-mono font-bold ${currentStep.flagValue ? "text-rose-600" : "text-gray-400"}`}>
            found = {currentStep.flagValue ? "True" : "False"}
          </span>
        )}
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* i × j 격자 */}
      <GridCanvas
        rows={spec.outerCount} cols={spec.innerCount} padding={0}
        getCellState={(r, c) => CELL_MAP[currentStep.grid[r][c]]}
        getCellLabel={(r, c) => `${r},${c}`}
        isCellActive={(r, c) => currentStep.currentI === r && currentStep.currentJ === c}
      />

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
