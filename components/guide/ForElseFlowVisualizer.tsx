"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildForElseFlowVisualization } from "@/lib/loopTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

export default function ForElseFlowVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildForElseFlowVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>for-else 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  const ITEM_CELL_STATE: Record<typeof currentStep.itemStates[number], CellState> = {
    pending: "empty", current: "current", checked: "visited", unreached: "out-of-range",
  }

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-700">
          for-else
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `target = ${spec.target}`}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 값 스트립 */}
      <GridCanvas
        rows={1} cols={spec.items.length} padding={0}
        getCellState={(_r, c) => ITEM_CELL_STATE[currentStep.itemStates[c]]}
        getCellLabel={(_r, c) => String(spec.items[c])}
        isCellActive={(_r, c) => currentStep.currentIndex === c}
      />

      {/* else 블록 상태 */}
      <div className="px-4 pb-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[12px] ${
            currentStep.elseState === "active"
              ? "bg-emerald-50 border-emerald-400 text-emerald-700"
              : currentStep.elseState === "skipped"
              ? "bg-gray-50 border-gray-200 text-gray-300 italic"
              : "bg-gray-50 border-gray-200 text-gray-400"
          }`}
        >
          <span>{currentStep.elseState === "active" ? "✅" : currentStep.elseState === "skipped" ? "⏭️" : "⏳"}</span>
          <span>else</span>
          <span className="ml-auto text-[10px]">
            {currentStep.elseState === "active" ? "실행됨" : currentStep.elseState === "skipped" ? "건너뜀 (break 발생)" : "대기 중"}
          </span>
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
