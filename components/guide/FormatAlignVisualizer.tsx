"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildFormatAlignVisualization } from "@/lib/formatTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas } from "@/components/guide/grid/GridCanvas"

const SPACE_CHAR = " "
const NBSP = " "

export default function FormatAlignVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildFormatAlignVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>정렬/채우기 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const rawValue = typeof spec.value === "string" ? spec.value : String(spec.value)
  const valueLen = rawValue.length

  // 값이 차지하는 칸의 범위 [start, end) — 나머지는 채움 문자 칸
  let vStart = 0, vEnd = currentStep.result.length
  if (currentStep.result.length > valueLen) {
    const padTotal = currentStep.width - valueLen
    if (currentStep.align === "<") { vStart = 0; vEnd = valueLen }
    else if (currentStep.align === ">") { vStart = padTotal; vEnd = padTotal + valueLen }
    else { vStart = Math.floor(padTotal / 2); vEnd = vStart + valueLen }
  }

  const specLabel = `${currentStep.fill !== SPACE_CHAR ? currentStep.fill : ""}${currentStep.align}${currentStep.width}`

  function cellLabel(c: number): string {
    const ch = currentStep.result[c]
    return ch === SPACE_CHAR ? NBSP : ch
  }

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
          정렬/채우기
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "문자열 정렬"}</span>
        <span className="ml-auto text-[11px] font-mono text-gray-400">:{specLabel}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 칸 단위 비교 */}
      <div className="p-4">
        <GridCanvas
          rows={1} cols={currentStep.result.length} padding={0}
          getCellState={(_r, c) => (c >= vStart && c < vEnd ? "current" : "empty")}
          getCellLabel={(_r, c) => cellLabel(c)}
        />
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
