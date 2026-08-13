"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildStackParensVisualization } from "@/lib/stackQueueTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas } from "@/components/guide/grid/GridCanvas"

export default function StackParensVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildStackParensVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>괄호 검사 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-700">
          괄호 검사
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "괄호 유효성 검사"}</span>
        {currentStep.result !== null && (
          <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${
            currentStep.result ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>
            {currentStep.result ? "YES" : "NO"}
          </span>
        )}
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 입력 문자열 */}
      <div className="px-4 pt-3">
        <h4 className="text-[11px] font-bold text-gray-500 mb-1.5">입력 문자열</h4>
        <div className="flex flex-wrap gap-1 font-mono text-sm">
          {[...spec.text].map((ch, i) => (
            <span
              key={i}
              className={`w-6 h-6 flex items-center justify-center rounded border transition-colors duration-200 ${
                i === currentStep.index
                  ? "bg-indigo-500 text-white border-indigo-600 font-bold"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* 스택 */}
      <div className="flex flex-col md:flex-row">
        {currentStep.stack.length === 0 ? (
          <div className="flex-1 p-3 flex items-center justify-center text-[12px] text-gray-400">스택 비어 있음</div>
        ) : (
          <GridCanvas
            rows={1} cols={currentStep.stack.length} padding={0}
            getCellState={(_r, c) => c === currentStep.stack.length - 1 ? "current" : "empty"}
            getCellLabel={(_r, c) => currentStep.stack[c]}
            isCellActive={(_r, c) => c === currentStep.stack.length - 1}
          />
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
