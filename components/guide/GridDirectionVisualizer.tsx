"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGridDirectionsVisualization, type DirectionStep, type GridDirectionsSpec } from "@/lib/gridTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

const DIR_NAME = ["위", "아래", "왼쪽", "오른쪽"]

function cellState(r: number, c: number, spec: GridDirectionsSpec, step: DirectionStep): CellState {
  if (r === spec.current[0] && c === spec.current[1]) return "current"
  const done = step.computed.find(cand => cand.nx === r && cand.ny === c)
  if (done) return done.inRange ? "visited" : "out-of-range"
  if (step.pending && step.pending.nx === r && step.pending.ny === c) {
    return step.pending.inRange ? "queued" : "out-of-range"
  }
  return "empty"
}

function cellLabel(r: number, c: number, step: DirectionStep): string | null {
  const cand = step.computed.find(x => x.nx === r && x.ny === c)
    ?? (step.pending && step.pending.nx === r && step.pending.ny === c ? step.pending : null)
  return cand ? String(cand.index) : null
}

function isCellActive(r: number, c: number, step: DirectionStep): boolean {
  return !!step.pending && step.pending.nx === r && step.pending.ny === c
}

export default function GridDirectionVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGridDirectionsVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>격자 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const allCandidates = [...currentStep.computed, ...(currentStep.pending ? [currentStep.pending] : [])]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          방향 벡터
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "2차원 격자 방향 탐색"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: 격자 + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GridCanvas
          rows={spec.rows} cols={spec.cols} padding={1}
          getCellState={(r, c) => cellState(r, c, spec, currentStep)}
          getCellLabel={(r, c) => cellLabel(r, c, currentStep)}
          isCellActive={(r, c) => isCellActive(r, c, currentStep)}
        />

        <aside className="w-full md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3">
          <h4 className="text-[11px] font-bold text-gray-500 mb-1.5">계산 결과</h4>
          <div className="space-y-1">
            {allCandidates.length === 0 && (
              <div className="text-[11px] text-gray-400">아직 계산된 방향이 없습니다.</div>
            )}
            {allCandidates.map(cand => (
              <div key={cand.index} className={`text-[11px] font-mono ${cand.inRange ? "text-gray-700" : "text-red-500"}`}>
                방향 {cand.index}({DIR_NAME[cand.index]}): ({cand.nx}, {cand.ny}){!cand.inRange && " ⚠ 범위 밖"}
              </div>
            ))}
          </div>
        </aside>
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
