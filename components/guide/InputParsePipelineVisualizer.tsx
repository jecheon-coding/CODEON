"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildInputParsePipelineVisualization } from "@/lib/basicsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function InputParsePipelineVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildInputParsePipelineVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>입력 파싱 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const isRawActive = currentStep.tokens === null

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          입력 파싱
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "map(int, input().split())"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 파이프라인 단계 */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[10px] font-bold text-gray-400">원본 문자열</span>
          <div
            className={`mt-1 inline-block px-3 py-2 rounded-lg border font-mono text-sm transition-colors duration-300 ${
              isRawActive ? "bg-indigo-500 border-indigo-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            &quot;{spec.input}&quot;
          </div>
        </div>

        {currentStep.tokens && (
          <div>
            <span className="text-[10px] font-bold text-gray-400">.split() 결과</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {currentStep.tokens.map((t, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded border font-mono text-xs transition-colors duration-300 ${
                    currentStep.numbers
                      ? "bg-gray-50 border-gray-200 text-gray-500"
                      : "bg-amber-100 border-amber-400 text-amber-700"
                  }`}
                >
                  &apos;{t}&apos;
                </span>
              ))}
            </div>
          </div>
        )}

        {currentStep.numbers && (
          <div>
            <span className="text-[10px] font-bold text-gray-400">정수 리스트</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {currentStep.numbers.map((n, i) => (
                <span key={i} className="px-2 py-1 rounded border font-mono text-xs bg-emerald-500 border-emerald-600 text-white">
                  {n}
                </span>
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
