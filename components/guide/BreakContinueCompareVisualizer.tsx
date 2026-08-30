"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildBreakContinueVisualization } from "@/lib/loopTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

export default function BreakContinueCompareVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildBreakContinueVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>break/continue 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  const ITEM_CELL_STATE: Record<typeof currentStep.itemStates[number], CellState> = {
    pending:   "empty",
    current:   "current",
    printed:   "visited",
    skipped:   "wall",
    unreached: "out-of-range",
  }
  function cellState(idx: number): CellState {
    return ITEM_CELL_STATE[currentStep.itemStates[idx]]
  }

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          break / continue
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `${spec.mode} 동작`}</span>
        <span className="ml-auto text-[11px] font-mono font-bold text-orange-600">{spec.mode}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 값 스트립 */}
      <GridCanvas
        rows={1} cols={spec.items.length} padding={0}
        getCellState={(_r, c) => cellState(c)}
        getCellLabel={(_r, c) => String(spec.items[c])}
        isCellActive={(_r, c) => currentStep.currentIndex === c}
      />

      {/* 출력 결과 */}
      <div className="px-4 pb-4">
        <span className="text-[11px] font-bold text-gray-500 block mb-1">출력 결과</span>
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-mono text-gray-700 min-h-9">
          {currentStep.printedSoFar.length > 0 ? currentStep.printedSoFar.join(" ") : "(아직 없음)"}
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
