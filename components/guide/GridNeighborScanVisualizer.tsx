"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGridNeighborScanVisualization } from "@/lib/matrixTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

export default function GridNeighborScanVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGridNeighborScanVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>이웃 탐색 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const rows = spec.grid.length, cols = spec.grid[0].length

  function isHighlight(r: number, c: number): boolean {
    return currentStep.highlightR === r && currentStep.highlightC === c
  }

  function cellState(r: number, c: number): CellState {
    if (r === spec.r && c === spec.c) return "current"
    if (isHighlight(r, c)) {
      if (currentStep.inRange === true) return "visited"
      if (currentStep.inRange === false) return "out-of-range"
      return "queued"
    }
    return "empty"
  }

  function cellLabel(r: number, c: number): string | null {
    if (r >= 0 && r < rows && c >= 0 && c < cols) return String(spec.grid[r][c])
    if (isHighlight(r, c)) return "×"
    return null
  }

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
          이웃 탐색
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `(${spec.r}, ${spec.c})의 이웃`}</span>
        <span className="ml-auto text-[11px] font-mono font-bold text-teal-600">{spec.directions}방향</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 격자 (padding=1로 격자 밖 이웃까지 표시) */}
      <GridCanvas
        rows={rows} cols={cols} padding={1}
        getCellState={cellState}
        getCellLabel={cellLabel}
        isCellActive={(r, c) => isHighlight(r, c)}
        isStart={(r, c) => r === spec.r && c === spec.c}
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
