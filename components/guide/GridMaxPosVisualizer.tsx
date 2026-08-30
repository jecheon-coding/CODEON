"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGridMaxPosVisualization } from "@/lib/matrixTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

const CELL_MAP: Record<"empty" | "current" | "champion" | "checked", CellState> = {
  empty: "empty", current: "current", champion: "visited", checked: "queued",
}

export default function GridMaxPosVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGridMaxPosVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>최댓값/최솟값 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          {spec.mode === "max" ? "최댓값" : "최솟값"} 위치 찾기
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "격자에서 극값 찾기"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 격자 */}
      <GridCanvas
        rows={spec.grid.length} cols={spec.grid[0].length} padding={0}
        getCellState={(r, c) => CELL_MAP[currentStep.cellStates[r][c]]}
        getCellLabel={(r, c) => String(spec.grid[r][c])}
        isCellActive={(r, c) => currentStep.cellStates[r][c] === "current"}
      />

      {/* 현재 챔피언 */}
      <div className="px-4 pb-4">
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-mono text-emerald-700">
          현재 {spec.mode === "max" ? "최댓값" : "최솟값"}: {currentStep.currentVal} (위치: {currentStep.currentPos[0]}행 {currentStep.currentPos[1]}열)
        </div>
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
