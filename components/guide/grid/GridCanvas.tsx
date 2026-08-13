"use client"

export type CellState = "wall" | "empty" | "current" | "queued" | "visited" | "out-of-range"

export const CELL_STYLE: Record<CellState, { bg: string; border: string; text: string }> = {
  empty:          { bg: "bg-gray-50",     border: "border-gray-200",              text: "text-gray-400" },
  wall:           { bg: "bg-gray-700",    border: "border-gray-800",              text: "text-gray-300" },
  current:        { bg: "bg-indigo-500",  border: "border-indigo-600",            text: "text-white" },
  queued:         { bg: "bg-amber-100",   border: "border-amber-400",             text: "text-amber-700" },
  visited:        { bg: "bg-emerald-500", border: "border-emerald-600",           text: "text-white" },
  "out-of-range": { bg: "bg-red-50",      border: "border-red-200 border-dashed", text: "text-red-300" },
}

export function GridCanvas({
  rows, cols, padding = 0,
  getCellState, getCellLabel, isCellActive = () => false, isStart = () => false, isEnd = () => false,
}: {
  rows: number
  cols: number
  padding?: number   // 격자 밖 이웃까지 그릴 여백 칸 수(방향 벡터 데모는 1, 격자 BFS는 0)
  getCellState: (r: number, c: number) => CellState
  getCellLabel?: (r: number, c: number) => string | null
  isCellActive?: (r: number, c: number) => boolean
  isStart?: (r: number, c: number) => boolean
  isEnd?: (r: number, c: number) => boolean
}) {
  const totalRows = rows + padding * 2
  const totalCols = cols + padding * 2
  const cells = Array.from({ length: totalRows * totalCols }, (_, idx) => ({
    r: Math.floor(idx / totalCols) - padding,
    c: (idx % totalCols) - padding,
  }))

  return (
    <div className="flex-1 p-3">
      <div
        className="grid gap-1 mx-auto justify-items-center"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`, maxWidth: totalCols <= 6 ? "280px" : "360px" }}
      >
        {cells.map(({ r, c }) => {
          const state = getCellState(r, c)
          const style = CELL_STYLE[state]
          const label = getCellLabel?.(r, c) ?? null
          return (
            <div
              key={`${r}-${c}`}
              style={{ maxWidth: 48 }}
              className={`relative w-full aspect-square rounded border flex items-center justify-center text-[10px] font-bold transition-colors duration-300 ${style.bg} ${style.border} ${style.text}`}
            >
              {isCellActive(r, c) && (
                <span className="absolute inset-0 rounded bg-indigo-400/50 animate-ping" />
              )}
              {isStart(r, c) && (
                <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-blue-600 text-white text-[8px] leading-3 text-center">S</span>
              )}
              {isEnd(r, c) && (
                <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-fuchsia-600 text-white text-[8px] leading-3 text-center">E</span>
              )}
              <span className="relative z-10">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
