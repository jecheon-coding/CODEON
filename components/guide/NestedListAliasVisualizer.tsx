"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildNestedListAliasVisualization } from "@/lib/matrixTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function RowBox({ boxId, values }: { boxId: string; values: number[] }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold text-fuchsia-600 mb-0.5">🔗 {boxId}</span>
      <div className="flex gap-1 px-2 py-1.5 rounded-lg border-2 border-fuchsia-400 bg-fuchsia-50">
        {values.map((v, i) => (
          <span key={i} className="font-mono text-xs font-bold text-fuchsia-700">{v}</span>
        ))}
      </div>
    </div>
  )
}

export default function NestedListAliasVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildNestedListAliasVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>2차원 리스트 별칭 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  const primaryVar = spec.mode === "multiply" ? "a" : spec.mode === "comprehension" ? "b" : spec.mode === "shallow_copy" ? "lst" : "original"
  const secondaryVar = spec.mode === "shallow_copy" ? "k" : spec.mode === "deepcopy" ? "deep" : null

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          2차원 리스트 별칭
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "행이 같은 상자를 공유하나요?"}</span>
        <span className="ml-auto text-[11px] font-mono font-bold text-rose-600">{spec.mode}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 행 상자들 */}
      <div className="p-4 space-y-4">
        <div>
          <span className="text-[11px] font-bold text-gray-500 block mb-1.5">{primaryVar}</span>
          <div className="flex flex-wrap gap-2">
            {currentStep.primaryOuter.map((id, i) => (
              <RowBox key={i} boxId={id} values={currentStep.rowBoxes[id]} />
            ))}
          </div>
        </div>

        {currentStep.secondaryOuter && secondaryVar && (
          <div>
            <span className="text-[11px] font-bold text-gray-500 block mb-1.5">{secondaryVar}</span>
            <div className="flex flex-wrap gap-2">
              {currentStep.secondaryOuter.map((id, i) => (
                <RowBox key={i} boxId={id} values={currentStep.rowBoxes[id]} />
              ))}
            </div>
          </div>
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
