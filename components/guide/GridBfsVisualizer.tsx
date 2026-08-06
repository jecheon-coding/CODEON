"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildGridBfsVisualization, type GridBfsStep, type GridBfsSpec } from "@/lib/gridTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

function cellState(r: number, c: number, spec: GridBfsSpec, step: GridBfsStep): CellState {
  if (spec.grid[r][c] === 1) return "wall"
  if (step.current && r === step.current[0] && c === step.current[1]) return "current"
  if (step.queue.some(([qr, qc]) => qr === r && qc === c)) return "queued"
  if (step.dist[r][c] !== -1) return "visited"
  return "empty"
}

function cellLabel(r: number, c: number, step: GridBfsStep): string | null {
  return step.dist[r][c] === -1 ? null : String(step.dist[r][c])
}

function isCellActive(r: number, c: number, step: GridBfsStep): boolean {
  if (step.current && r === step.current[0] && c === step.current[1]) return true
  if (step.neighbor && r === step.neighbor.r && c === step.neighbor.c) return true
  return false
}

export default function GridBfsVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildGridBfsVisualization(code), [code])
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
  const [er, ec] = spec.end
  const finalDist = currentStep.dist[er][ec]
  const isTerminal = playback.stepIndex === steps.length - 1

  return (
    <div className="not-prose my-4 max-w-3xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
          격자 BFS
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "격자 최단 거리 탐색"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: 격자 + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GridCanvas
          rows={spec.grid.length} cols={spec.grid[0].length} padding={0}
          getCellState={(r, c) => cellState(r, c, spec, currentStep)}
          getCellLabel={(r, c) => cellLabel(r, c, currentStep)}
          isCellActive={(r, c) => isCellActive(r, c, currentStep)}
          isStart={(r, c) => r === spec.start[0] && c === spec.start[1]}
          isEnd={(r, c) => r === er && c === ec}
        />

        <aside className="w-full md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3">
          <h4 className="text-[11px] font-bold text-gray-500 mb-1.5">큐</h4>
          <div className="space-y-1 mb-3">
            {currentStep.queue.length === 0
              ? <div className="text-[11px] text-gray-400">비어 있음</div>
              : currentStep.queue.map(([r, c], i) => (
                  <div key={i} className="text-[11px] font-mono text-gray-700">({r}, {c})</div>
                ))
            }
          </div>
          {isTerminal && (
            <div className="pt-2 border-t border-gray-100">
              <h4 className="text-[11px] font-bold text-gray-500 mb-1">결과</h4>
              <div className={`text-[13px] font-bold ${finalDist === -1 ? "text-red-500" : "text-emerald-600"}`}>
                {finalDist === -1 ? "도달 불가" : `최단 거리: ${finalDist}`}
              </div>
            </div>
          )}
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
