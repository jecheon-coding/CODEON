"use client"

import { useMemo } from "react"
import { AlertCircle, Package } from "lucide-react"
import { buildWhileLoopTraceVisualization } from "@/lib/loopTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function WhileLoopTraceVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildWhileLoopTraceVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>while 반복문 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const stepIndex = Math.min(playback.stepIndex, steps.length - 1)
  const currentStep = steps[stepIndex]

  const printedList = steps.slice(0, stepIndex + 1)
    .map(s => s.printed)
    .filter((p): p is number => p !== null)

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
          while 반복문
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "while 반복 실행 흐름"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 변수 상자 + 조건 상태 */}
      <div className="p-4 flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center">
          <span className="relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 bg-white border-cyan-400 text-cyan-700 text-[11px] font-bold shadow-sm">
            {spec.varName}
          </span>
          <div className="min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] bg-cyan-500 border-cyan-600 text-white flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold shadow-lg">
            <Package className="w-4 h-4 text-cyan-200" />
            {currentStep.value}
          </div>
        </div>

        {currentStep.conditionResult !== null && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50">
            <span className="font-mono text-[12px] text-gray-600">{spec.varName} {spec.op} {spec.threshold}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              currentStep.conditionResult ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
            }`}>
              {currentStep.conditionResult ? "True" : "False"}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-40">
          <span className="text-[11px] font-bold text-gray-500 block mb-1">출력 목록</span>
          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-mono text-gray-700 min-h-9">
            {printedList.length > 0 ? printedList.join(" ") : "(아직 없음)"}
          </div>
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
