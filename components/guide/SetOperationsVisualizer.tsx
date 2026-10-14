"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildSetOperationsVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

const OP_LABEL: Record<string, string> = {
  intersection: "교집합 (a & b)", union: "합집합 (a | b)",
  difference: "차집합 (a - b)", symmetric_difference: "대칭차집합 (a ^ b)",
}

function ItemBox({ value, state }: { value: number; state: "pending" | "current" | "included" | "excluded" }) {
  const style =
    state === "current"  ? "bg-violet-500 border-violet-600 text-white scale-110 shadow-lg" :
    state === "included" ? "bg-emerald-50 border-emerald-400 text-emerald-700" :
    state === "excluded" ? "bg-gray-50 border-gray-200 text-gray-300 line-through" :
    "bg-gray-50 border-gray-200 text-gray-500"
  return (
    <div className={`min-w-10 h-10 px-2 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-bold transition-all duration-300 ${style}`}>
      {value}
    </div>
  )
}

export default function SetOperationsVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildSetOperationsVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>집합 연산 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          집합 연산
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || OP_LABEL[spec.op]}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* a, b 집합 */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[11px] font-bold text-gray-500 block mb-1.5">a</span>
          <div className="flex flex-wrap gap-1.5">
            {spec.a.map((v, i) => <ItemBox key={i} value={v} state={currentStep.aStates[i]} />)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-bold text-gray-500 block mb-1.5">b</span>
          <div className="flex flex-wrap gap-1.5">
            {spec.b.map((v, i) => <ItemBox key={i} value={v} state={currentStep.bStates[i]} />)}
          </div>
        </div>
      </div>

      {/* 결과 집합 */}
      <div className="px-4 pb-4">
        <span className="text-[11px] font-bold text-gray-500 block mb-1.5">결과</span>
        <div className="px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-[12px] font-mono text-violet-700 min-h-9">
          {currentStep.result.length > 0 ? `{${currentStep.result.join(", ")}}` : "{} (아직 없음)"}
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
