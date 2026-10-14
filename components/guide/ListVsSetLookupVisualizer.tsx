"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildListVsSetLookupVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

export default function ListVsSetLookupVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildListVsSetLookupVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>리스트/집합 탐색 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  function listCellState(c: number): CellState {
    if (c > currentStep.listCheckedUpTo) return "empty"
    if (c === currentStep.listCheckedUpTo) {
      if (currentStep.listFound === true) return "visited"
      if (currentStep.listFound === false) return "wall"
      return "current"
    }
    return "wall"
  }

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
          리스트 vs 집합
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `x = ${spec.target} 찾기`}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 리스트 레인 */}
      <div className="px-4 pt-3">
        <span className="text-[11px] font-bold text-gray-500 block mb-1">리스트 — 순차 탐색</span>
      </div>
      <GridCanvas
        rows={1} cols={spec.items.length} padding={0}
        getCellState={(_r, c) => listCellState(c)}
        getCellLabel={(_r, c) => String(spec.items[c])}
        isCellActive={(_r, c) => c === currentStep.listCheckedUpTo && currentStep.listFound === null}
      />

      {/* 집합 레인 */}
      <div className="px-4 pt-2 pb-4">
        <span className="text-[11px] font-bold text-gray-500 block mb-1.5">집합 — 해시로 한 번에 확인</span>
        <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
          !currentStep.setChecked ? "bg-gray-50 border-gray-200 text-gray-400"
          : currentStep.setFound ? "bg-emerald-50 border-emerald-400 text-emerald-700 scale-105"
          : "bg-gray-50 border-gray-300 text-gray-500"
        }`}>
          <span className="font-mono text-[12px]">{`{${spec.items.join(", ")}}`}</span>
          {currentStep.setChecked && (
            <span className="text-[11px] font-bold">{currentStep.setFound ? "✓ 있음" : "✗ 없음"}</span>
          )}
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
