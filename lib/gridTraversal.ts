// 학습자료 4.6절 "2차원 격자 탐색" 챕터 본문의 ```grid-directions / ```grid-bfs 코드펜스에
// 들어가는 격자 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리 계산해둔다.
// React에 의존하지 않는 순수 함수 모음. lib/graphTraversal.ts(노드/엣지 그래프 모델)와는
// 완전히 독립된 격자(2차원 배열) 모델이라 별도 파일로 분리한다.

const GRID_SIZE_MIN = 1
const GRID_SIZE_MAX = 12

// ── 방향 벡터(dx, dy) 데모 (```grid-directions) ──

export type GridDirectionsSpec = {
  title?:  string
  rows:    number            // 시각화 캔버스 크기(실제 코드엔 없는 순수 렌더링용 값)
  cols:    number
  current: [number, number]  // 실제 코드 `x, y = 2, 3`에 대응
}

export type GridDirectionsValidationResult =
  | { ok: true;  spec: GridDirectionsSpec }
  | { ok: false; error: string }

export function parseGridDirectionsSpec(raw: string): GridDirectionsValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "격자 데이터 형식이 올바르지 않습니다." }
  }

  const { rows, cols, current, title } = parsed

  if (!Number.isInteger(rows) || rows < GRID_SIZE_MIN || rows > GRID_SIZE_MAX) {
    return { ok: false, error: `rows는 ${GRID_SIZE_MIN}~${GRID_SIZE_MAX} 사이의 정수여야 합니다.` }
  }
  if (!Number.isInteger(cols) || cols < GRID_SIZE_MIN || cols > GRID_SIZE_MAX) {
    return { ok: false, error: `cols는 ${GRID_SIZE_MIN}~${GRID_SIZE_MAX} 사이의 정수여야 합니다.` }
  }
  if (!Array.isArray(current) || current.length !== 2 || !current.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: "current는 [x, y] 형태의 정수 좌표여야 합니다." }
  }
  const [cx, cy] = current
  if (cx < 0 || cx >= rows || cy < 0 || cy >= cols) {
    return { ok: false, error: "current 위치가 격자 범위를 벗어났습니다." }
  }

  return { ok: true, spec: { title, rows, cols, current: [cx, cy] } }
}

const DIR_NAME = ["위", "아래", "왼쪽", "오른쪽"]

function buildDirectionsPseudocode(spec: GridDirectionsSpec) {
  const [x, y] = spec.current
  const contextLines = [`x, y = ${x}, ${y}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "dx = [-1, 1, 0, 0]",   // DX
    "dy = [0, 0, -1, 1]",   // DY
    "",
    "for i in range(4):",   // FOR (종료 스텝에도 재사용)
    "    nx = x + dx[i]",   // CALC_NX
    "    ny = y + dy[i]",   // CALC_NY
    "    print(nx, ny)",    // PRINT
  ]
  const offset = contextLines.length + 1   // +1: 컨텍스트와 본문 사이 빈 줄
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    DX:      offset,
    DY:      offset + 1,
    FOR:     offset + 3,
    CALC_NX: offset + 4,
    CALC_NY: offset + 5,
    PRINT:   offset + 6,
  }
  return { lines, lineIdx, collapseBefore }
}

export type DirectionCandidate = { index: number; nx: number; ny: number; inRange: boolean }

export type DirectionStep = {
  computed:  DirectionCandidate[]        // 확정된 이전 후보 누적
  pending:   DirectionCandidate | null   // 이번 반복에서 계산 중인 후보
  codeLines: number[]                    // 항상 정확히 한 줄만 담는다
  caption:   string
}

function computeDirectionSteps(spec: GridDirectionsSpec, lineIdx: ReturnType<typeof buildDirectionsPseudocode>["lineIdx"]): DirectionStep[] {
  const [x, y] = spec.current
  const dx = [-1, 1, 0, 0]
  const dy = [0, 0, -1, 1]
  const computed: DirectionCandidate[] = []
  const steps: DirectionStep[] = []

  function pushStep(codeLines: number[], caption: string, pending: DirectionCandidate | null) {
    steps.push({ computed: [...computed], pending, codeLines, caption })
  }

  pushStep([lineIdx.DX], "네 방향의 행 변화량 dx를 정의합니다.", null)
  pushStep([lineIdx.DY], "네 방향의 열 변화량 dy를 정의합니다.", null)
  pushStep([lineIdx.FOR], "i를 0부터 3까지 반복하며 네 방향의 좌표를 계산합니다.", null)

  for (let i = 0; i < 4; i++) {
    const nx = x + dx[i]
    const ny = y + dy[i]
    const inRange = nx >= 0 && nx < spec.rows && ny >= 0 && ny < spec.cols
    const cand: DirectionCandidate = { index: i, nx, ny, inRange }

    pushStep([lineIdx.CALC_NX], `방향 ${i}(${DIR_NAME[i]}): nx = ${x} + dx[${i}] = ${nx}`, cand)
    pushStep([lineIdx.CALC_NY], `방향 ${i}(${DIR_NAME[i]}): ny = ${y} + dy[${i}] = ${ny}`, cand)
    pushStep(
      [lineIdx.PRINT],
      inRange
        ? `방향 ${i}(${DIR_NAME[i]}): (${nx}, ${ny}) 위치를 출력합니다.`
        : `방향 ${i}(${DIR_NAME[i]}): (${nx}, ${ny})는 격자 범위를 벗어난 좌표입니다. 이 코드는 범위를 검사하지 않으므로 그대로 계산·출력됩니다.`,
      cand,
    )

    computed.push(cand)
  }

  pushStep([lineIdx.FOR], "네 방향 좌표 계산을 모두 마쳤습니다.", null)
  return steps
}

export type GridVizDirectionsResult =
  | { ok: true;  spec: GridDirectionsSpec; steps: DirectionStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridDirectionsVisualization(raw: string): GridVizDirectionsResult {
  const parsed = parseGridDirectionsSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildDirectionsPseudocode(parsed.spec)
    const steps = computeDirectionSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `방향 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 격자 최단 거리 BFS (```grid-bfs) ──

export type GridBfsSpec = {
  title?: string
  grid:   number[][]        // 0=길, 1=벽. 실제 코드의 `path` 변수에 대응
  start:  [number, number]
  end:    [number, number]
}

export type GridBfsValidationResult =
  | { ok: true;  spec: GridBfsSpec }
  | { ok: false; error: string }

export function parseGridBfsSpec(raw: string): GridBfsValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "격자 데이터 형식이 올바르지 않습니다." }
  }

  const { grid, start, end, title } = parsed

  if (!Array.isArray(grid) || grid.length === 0 || !grid.every((row: any) => Array.isArray(row))) {
    return { ok: false, error: "grid는 비어 있지 않은 2차원 배열이어야 합니다." }
  }
  const rows = grid.length
  const cols = grid[0].length
  if (cols === 0 || !grid.every((row: any[]) => row.length === cols)) {
    return { ok: false, error: "grid의 각 행 길이가 동일하지 않습니다." }
  }
  if (rows < GRID_SIZE_MIN || rows > GRID_SIZE_MAX || cols < GRID_SIZE_MIN || cols > GRID_SIZE_MAX) {
    return { ok: false, error: `grid 크기는 ${GRID_SIZE_MIN}x${GRID_SIZE_MIN}~${GRID_SIZE_MAX}x${GRID_SIZE_MAX} 사이만 지원합니다.` }
  }
  if (!grid.every((row: any[]) => row.every(v => v === 0 || v === 1))) {
    return { ok: false, error: "grid의 값은 0(길) 또는 1(벽)만 사용할 수 있습니다." }
  }
  if (!Array.isArray(start) || start.length !== 2 || !start.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: "start는 [row, col] 형태의 정수 좌표여야 합니다." }
  }
  if (!Array.isArray(end) || end.length !== 2 || !end.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: "end는 [row, col] 형태의 정수 좌표여야 합니다." }
  }

  const [sr, sc] = start
  const [er, ec] = end
  if (sr < 0 || sr >= rows || sc < 0 || sc >= cols) {
    return { ok: false, error: "start 좌표가 격자 범위를 벗어났습니다." }
  }
  if (er < 0 || er >= rows || ec < 0 || ec >= cols) {
    return { ok: false, error: "end 좌표가 격자 범위를 벗어났습니다." }
  }
  if (grid[sr][sc] === 1) {
    return { ok: false, error: "start 위치가 벽입니다." }
  }
  if (grid[er][ec] === 1) {
    return { ok: false, error: "end 위치가 벽입니다." }
  }

  return { ok: true, spec: { title, grid, start: [sr, sc], end: [er, ec] } }
}

function buildPathMatrixLines(grid: number[][]): string[] {
  const lines = ["path = ["]
  grid.forEach(row => lines.push(`    [${row.join(", ")}],`))
  lines.push("]")
  return lines
}

const GRID_BFS_FUNC_LINES = [
  "from collections import deque",
  "",
  "def func(lst, start, end):",
  "    rows, cols = len(lst), len(lst[0])",                                                          // ROWS_COLS
  "    sr, sc = start",                                                                               // START_UNPACK
  "    er, ec = end",                                                                                 // END_UNPACK
  "",
  "    dist = [[-1] * cols for _ in range(rows)]",                                                    // DIST_INIT
  "    dist[sr][sc] = 0",                                                                             // DIST_START
  "    queue = deque([(sr, sc)])",                                                                    // QUEUE_INIT
  "    dx = [-1, 1, 0, 0]",                                                                           // DX
  "    dy = [0, 0, -1, 1]",                                                                           // DY
  "",
  "    while queue:",                                                                                 // LOOP
  "        x, y = queue.popleft()",                                                                   // POP
  "        for i in range(4):",                                                                       // FOR
  "            nx, ny = x + dx[i], y + dy[i]",                                                        // CALC_N
  "            if 0 <= nx < rows and 0 <= ny < cols and dist[nx][ny] == -1 and lst[nx][ny] == 0:",     // CHECK
  "                dist[nx][ny] = dist[x][y] + 1",                                                    // SET_DIST
  "                queue.append((nx, ny))",                                                            // ENQUEUE
  "",
  "    return dist[er][ec]",                                                                           // RETURN
]

function buildGridBfsPseudocode(spec: GridBfsSpec) {
  const contextLines = buildPathMatrixLines(spec.grid)
  const collapseBefore = contextLines.length
  const [sr, sc] = spec.start
  const [er, ec] = spec.end
  const driverLine = `print(func(path, (${sr}, ${sc}), (${er}, ${ec})))`
  const offset = contextLines.length + 1   // +1: 컨텍스트와 본문 사이 빈 줄 → offset = GRID_BFS_FUNC_LINES[0]의 인덱스
  const lines = [...contextLines, "", ...GRID_BFS_FUNC_LINES, "", driverLine]
  const lineIdx = {
    ROWS_COLS:    offset + 3,
    START_UNPACK: offset + 4,
    END_UNPACK:   offset + 5,
    DIST_INIT:    offset + 7,
    DIST_START:   offset + 8,
    QUEUE_INIT:   offset + 9,
    DX:           offset + 10,
    DY:           offset + 11,
    LOOP:         offset + 13,
    POP:          offset + 14,
    FOR:          offset + 15,
    CALC_N:       offset + 16,
    CHECK:        offset + 17,
    SET_DIST:     offset + 18,
    ENQUEUE:      offset + 19,
    RETURN:       offset + 21,
    DRIVER_CALL:  offset + GRID_BFS_FUNC_LINES.length + 1,
  }
  return { lines, lineIdx, collapseBefore }
}

export type GridBfsNeighbor = { r: number; c: number }

export type GridBfsStep = {
  current:   [number, number] | null   // 이번에 큐에서 꺼낸 (x, y). init 단계엔 null.
  queue:     [number, number][]        // 이 스텝 시점의 큐 스냅샷
  dist:      number[][]                // dist 배열 스냅샷(누적)
  neighbor:  GridBfsNeighbor | null    // 이번 스텝에서 확인/계산 중인 이웃 칸
  codeLines: number[]                  // 항상 정확히 한 줄만 담는다
  caption:   string
}

function computeGridBfsSteps(spec: GridBfsSpec, lineIdx: ReturnType<typeof buildGridBfsPseudocode>["lineIdx"]): GridBfsStep[] {
  const rows = spec.grid.length
  const cols = spec.grid[0].length
  const [sr, sc] = spec.start
  const [er, ec] = spec.end
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1))
  const queue: [number, number][] = []
  const steps: GridBfsStep[] = []
  const label = (r: number, c: number) => `(${r}, ${c})`
  const dx = [-1, 1, 0, 0]
  const dy = [0, 0, -1, 1]

  function pushStep(partial: {
    codeLines: number[]; caption: string
    current?: [number, number] | null; neighbor?: GridBfsNeighbor | null
  }) {
    steps.push({
      current: partial.current ?? null,
      queue: [...queue],
      dist: dist.map(row => [...row]),
      neighbor: partial.neighbor ?? null,
      codeLines: partial.codeLines,
      caption: partial.caption,
    })
  }

  pushStep({ codeLines: [lineIdx.ROWS_COLS], caption: `rows, cols를 계산합니다. (rows=${rows}, cols=${cols})` })
  pushStep({ codeLines: [lineIdx.START_UNPACK], caption: `시작 좌표를 분리합니다: sr=${sr}, sc=${sc}` })
  pushStep({ codeLines: [lineIdx.END_UNPACK], caption: `도착 좌표를 분리합니다: er=${er}, ec=${ec}` })
  pushStep({ codeLines: [lineIdx.DIST_INIT], caption: "모든 칸을 -1(미방문)로 채운 dist 배열을 만듭니다." })

  dist[sr][sc] = 0
  pushStep({ codeLines: [lineIdx.DIST_START], caption: "시작 칸의 거리를 0으로 기록합니다." })

  queue.push([sr, sc])
  pushStep({ codeLines: [lineIdx.QUEUE_INIT], caption: `시작 좌표 ${label(sr, sc)}를 큐에 넣습니다.` })
  pushStep({ codeLines: [lineIdx.DX], caption: "네 방향의 행 변화량 dx를 정의합니다." })
  pushStep({ codeLines: [lineIdx.DY], caption: "네 방향의 열 변화량 dy를 정의합니다." })

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    pushStep({ current: [x, y], codeLines: [lineIdx.POP], caption: `${label(x, y)}를 큐에서 꺼냈습니다. (현재 거리 ${dist[x][y]})` })
    pushStep({ current: [x, y], codeLines: [lineIdx.FOR], caption: `${label(x, y)}에서 네 방향(상하좌우)을 순서대로 확인합니다.` })

    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i]
      const ny = y + dy[i]
      const inRange = nx >= 0 && nx < rows && ny >= 0 && ny < cols

      pushStep({
        current: [x, y], neighbor: { r: nx, c: ny },
        codeLines: [lineIdx.CALC_N], caption: `방향 ${i}: 다음 좌표를 계산합니다 → ${label(nx, ny)}`,
      })

      const passed = inRange && dist[nx][ny] === -1 && spec.grid[nx][ny] === 0
      const checkCaption = !inRange
        ? `${label(nx, ny)}는 격자 범위를 벗어나 조건을 만족하지 않습니다.`
        : dist[nx][ny] !== -1
        ? `${label(nx, ny)}는 이미 방문했으므로 건너뜁니다.`
        : spec.grid[nx][ny] === 1
        ? `${label(nx, ny)}는 벽(1)이므로 건너뜁니다.`
        : `${label(nx, ny)}는 아직 방문하지 않은 길이므로 조건을 통과합니다.`

      pushStep({ current: [x, y], neighbor: { r: nx, c: ny }, codeLines: [lineIdx.CHECK], caption: checkCaption })

      if (passed) {
        dist[nx][ny] = dist[x][y] + 1
        pushStep({
          current: [x, y], neighbor: { r: nx, c: ny },
          codeLines: [lineIdx.SET_DIST], caption: `dist[${nx}][${ny}] = dist[${x}][${y}] + 1 = ${dist[nx][ny]}`,
        })
        queue.push([nx, ny])
        pushStep({
          current: [x, y], neighbor: { r: nx, c: ny },
          codeLines: [lineIdx.ENQUEUE], caption: `${label(nx, ny)}를 큐에 추가합니다.`,
        })
      }
    }
  }

  pushStep({ codeLines: [lineIdx.LOOP], caption: "큐가 비어 탐색을 마칩니다." })

  const result = dist[er][ec]
  pushStep({
    codeLines: [lineIdx.RETURN],
    caption: result === -1 ? `dist[${er}][${ec}] = -1 (도착점에 도달할 수 없습니다)` : `dist[${er}][${ec}] = ${result}을 반환합니다.`,
  })
  pushStep({
    codeLines: [lineIdx.DRIVER_CALL],
    caption: result === -1 ? "func(path, start, end) 결과: -1 (도달 불가)" : `func(path, start, end) 결과: ${result} (최단 거리)`,
  })

  return steps
}

export type GridVizBfsResult =
  | { ok: true;  spec: GridBfsSpec; steps: GridBfsStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridBfsVisualization(raw: string): GridVizBfsResult {
  const parsed = parseGridBfsSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildGridBfsPseudocode(parsed.spec)
    const steps = computeGridBfsSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `격자 BFS 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
