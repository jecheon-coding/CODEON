"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildListOpsVisualization, formatListItem } from "@/lib/listTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas } from "@/components/guide/grid/GridCanvas"

export default function ListOpsVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildListOpsVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>리스트 연산 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const [hStart, hEnd] = currentStep.highlightRange ?? [-1, -1]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          리스트 연산
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "리스트 조작하기"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 리스트 + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        {currentStep.list.length === 0 ? (
          <div className="flex-1 p-3 flex items-center justify-center text-[12px] text-gray-400">비어 있음</div>
        ) : (
          <GridCanvas
            rows={1} cols={currentStep.list.length} padding={0}
            getCellState={(_r, c) => (c >= hStart && c < hEnd ? "current" : "empty")}
            getCellLabel={(_r, c) => formatListItem(currentStep.list[c])}
            isCellActive={(_r, c) => c >= hStart && c < hEnd}
          />
        )}

        {currentStep.poppedValue !== null && (
          <aside className="w-full md:w-44 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3">
            <div className="text-[11px] font-mono text-emerald-600 font-bold">방금 꺼낸 값: {formatListItem(currentStep.poppedValue!)}</div>
          </aside>
        )}
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
