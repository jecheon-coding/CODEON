"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildMinMaxTrackVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

const CELL_MAP: Record<"pending" | "current" | "champion" | "checked", CellState> = {
  pending: "empty", current: "current", champion: "visited", checked: "queued",
}

export default function MinMaxTrackVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildMinMaxTrackVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>최솟값/최댓값 데이터를 표시할 수 없습니다: {result.error}</span>
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
          {spec.mode === "min" ? "최솟값" : "최댓값"} 갱신
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "갱신 패턴"}</span>
        <span className="ml-auto text-[11px] font-mono font-bold text-emerald-600">tie={spec.tie}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 항목 스트립 */}
      <GridCanvas
        rows={1} cols={spec.items.length} padding={0}
        getCellState={(_r, c) => CELL_MAP[currentStep.itemStates[c]]}
        getCellLabel={(_r, c) => String(spec.items[c])}
        isCellActive={(_r, c) => currentStep.itemStates[c] === "current"}
      />

      {/* 현재 챔피언 */}
      <div className="px-4 pb-4">
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-mono text-emerald-700">
          현재 {spec.mode === "min" ? "min_val" : "max_val"} = {currentStep.bestVal === Infinity || currentStep.bestVal === -Infinity ? "없음" : currentStep.bestVal}, {spec.mode === "min" ? "min_idx" : "max_idx"} = {currentStep.bestIdx}
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
