"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGridTransposeRotateVisualization } from "@/lib/matrixTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

export default function GridTransposeRotateVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGridTransposeRotateVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>전치/회전 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const destRows = currentStep.destGrid.length
  const destCols = currentStep.destGrid[0].length

  return (
    <div className="not-prose my-4 max-w-3xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          전치/회전
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || (spec.mode === "transpose" ? "전치 행렬" : "90도 회전")}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 원본 + 결과 격자 */}
      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100">
        <div className="flex-1">
          <h4 className="text-[11px] font-bold text-gray-500 px-3 pt-3">원본</h4>
          <GridCanvas
            rows={spec.grid.length} cols={spec.grid[0].length} padding={0}
            getCellState={(r, c) => (currentStep.sourceHighlight?.[0] === r && currentStep.sourceHighlight?.[1] === c ? "current" : "empty")}
            getCellLabel={(r, c) => String(spec.grid[r][c])}
            isCellActive={(r, c) => currentStep.sourceHighlight?.[0] === r && currentStep.sourceHighlight?.[1] === c}
          />
        </div>
        <div className="flex-1">
          <h4 className="text-[11px] font-bold text-gray-500 px-3 pt-3">결과</h4>
          <GridCanvas
            rows={destRows} cols={destCols} padding={0}
            getCellState={(r, c): CellState => {
              if (currentStep.reverseRow === r) return "current"
              if (currentStep.destHighlight?.[0] === r && currentStep.destHighlight?.[1] === c) return "current"
              return currentStep.destGrid[r][c] !== null ? "visited" : "empty"
            }}
            getCellLabel={(r, c) => (currentStep.destGrid[r][c] !== null ? String(currentStep.destGrid[r][c]) : null)}
            isCellActive={(r, c) => currentStep.destHighlight?.[0] === r && currentStep.destHighlight?.[1] === c}
          />
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
