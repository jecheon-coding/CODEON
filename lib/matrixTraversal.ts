// 파이썬가이드 "9장. 2차원 리스트" 챕터 본문의 ```nested-list-alias / ```grid-traverse-sum /
// ```grid-neighbor-scan / ```grid-transpose-rotate / ```grid-max-pos 코드펜스에 들어가는
// JSON을 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리 계산해둔다. React에 의존하지
// 않는 순수 함수 모음.
//
// 곱셈-초기화(9.1)와 얕은 복사(9.8)는 메커니즘이 완전히 같다(행 참조를 여러 곳에서 공유).
// lib/listTraversal.ts의 list-copy-ref에서 검증된 boxId 기법(같은 boxId를 가진 칸은 같은
// 배지/색으로 표시)을 행 단위로 확장해 하나의 엔진으로 묶는다.

const GRID_VAL_MIN = -100
const GRID_VAL_MAX = 100

function validateGrid(grid: any, maxSize: number, valMin = GRID_VAL_MIN, valMax = GRID_VAL_MAX): string | null {
  if (!Array.isArray(grid) || grid.length < 1 || grid.length > maxSize) return `grid는 1~${maxSize}행이어야 합니다.`
  const cols = grid[0]?.length
  if (!Array.isArray(grid[0]) || !Number.isInteger(cols) || cols < 1 || cols > maxSize) {
    return `grid의 각 행은 1~${maxSize}열이어야 합니다.`
  }
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== cols) return "grid의 모든 행은 길이가 같아야 합니다(직사각형)."
    for (const v of row) {
      if (!Number.isInteger(v) || v < valMin || v > valMax) return `grid 값은 ${valMin}~${valMax} 사이의 정수여야 합니다.`
    }
  }
  return null
}

function pyGridLit(grid: number[][]): string {
  return `[${grid.map(row => `[${row.join(", ")}]`).join(", ")}]`
}

// ── 2차원 리스트 별칭(alias) 함정 (```nested-list-alias) ──
// 9.1(곱셈 초기화) + 9.8(얕은 복사)를 "행이 같은 상자를 공유하는가"라는 동일한
// 질문의 4가지 사례로 묶는다.

export type NestedListAliasMode = "multiply" | "comprehension" | "shallow_copy" | "deepcopy"
export type NestedListAliasSpec = {
  title?: string
  mode: NestedListAliasMode
  rows?: number
  cols?: number
  grid?: number[][]
}

const NLA_COUNT_MIN = 1
const NLA_COUNT_MAX = 5

export type NestedListAliasValidationResult =
  | { ok: true;  spec: NestedListAliasSpec }
  | { ok: false; error: string }

export function parseNestedListAliasSpec(raw: string): NestedListAliasValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "2차원 리스트 별칭 데이터 형식이 올바르지 않습니다." }
  }

  const { title, mode, rows, cols, grid } = parsed

  if (mode !== "multiply" && mode !== "comprehension" && mode !== "shallow_copy" && mode !== "deepcopy") {
    return { ok: false, error: 'mode는 "multiply"/"comprehension"/"shallow_copy"/"deepcopy" 중 하나여야 합니다.' }
  }

  if (mode === "multiply" || mode === "comprehension") {
    if (grid !== undefined) return { ok: false, error: `mode가 "${mode}"일 때는 grid를 쓸 수 없습니다. rows/cols를 사용하세요.` }
    if (!Number.isInteger(rows) || rows < NLA_COUNT_MIN || rows > NLA_COUNT_MAX) {
      return { ok: false, error: `rows는 ${NLA_COUNT_MIN}~${NLA_COUNT_MAX} 사이의 정수여야 합니다.` }
    }
    if (!Number.isInteger(cols) || cols < NLA_COUNT_MIN || cols > NLA_COUNT_MAX) {
      return { ok: false, error: `cols는 ${NLA_COUNT_MIN}~${NLA_COUNT_MAX} 사이의 정수여야 합니다.` }
    }
    return { ok: true, spec: { title, mode, rows, cols } }
  }

  if (rows !== undefined || cols !== undefined) {
    return { ok: false, error: `mode가 "${mode}"일 때는 rows/cols를 쓸 수 없습니다. grid를 사용하세요.` }
  }
  const gridError = validateGrid(grid, NLA_COUNT_MAX)
  if (gridError) return { ok: false, error: gridError }

  return { ok: true, spec: { title, mode, grid } }
}

function buildNestedListAliasPseudocode(spec: NestedListAliasSpec) {
  if (spec.mode === "multiply") {
    const lines = [
      `a = [[0] * ${spec.cols}] * ${spec.rows}`,
      "",
      "a[0][0] = 99",
      "print(a)",
    ]
    return { lines, lineIdx: { IMPORT: -1, INIT: 0, COPY: -1, MUTATE: 2, PRINT_PRIMARY: 3, PRINT_SECONDARY: -1 }, collapseBefore: 1 }
  }
  if (spec.mode === "comprehension") {
    const lines = [
      `b = [[0] * ${spec.cols} for _ in range(${spec.rows})]`,
      "",
      "b[0][0] = 99",
      "print(b)",
    ]
    return { lines, lineIdx: { IMPORT: -1, INIT: 0, COPY: -1, MUTATE: 2, PRINT_PRIMARY: 3, PRINT_SECONDARY: -1 }, collapseBefore: 1 }
  }
  if (spec.mode === "shallow_copy") {
    const lines = [
      `lst = ${pyGridLit(spec.grid!)}`,
      "",
      "k = lst.copy()",
      "k[0][0] = 99",
      "",
      "print(lst)",
      "print(k)",
    ]
    return { lines, lineIdx: { IMPORT: -1, INIT: 0, COPY: 2, MUTATE: 3, PRINT_PRIMARY: 5, PRINT_SECONDARY: 6 }, collapseBefore: 1 }
  }
  // deepcopy
  const lines = [
    "import copy",
    "",
    `original = ${pyGridLit(spec.grid!)}`,
    "deep = copy.deepcopy(original)",
    "deep[0][0] = 99",
    "",
    "print(original)",
    "print(deep)",
  ]
  return { lines, lineIdx: { IMPORT: 0, INIT: 2, COPY: 3, MUTATE: 4, PRINT_PRIMARY: 6, PRINT_SECONDARY: 7 }, collapseBefore: 1 }
}

export type NestedListAliasStep = {
  primaryOuter:   string[]
  secondaryOuter: string[] | null
  rowBoxes:       Record<string, number[]>
  finished:       boolean
  codeLines:      number[]
  caption:        string
}

type NestedListAliasLineIdx = ReturnType<typeof buildNestedListAliasPseudocode>["lineIdx"]

function gridDisplayFromOuter(outer: string[], rowBoxes: Record<string, number[]>): string {
  return `[${outer.map(id => `[${rowBoxes[id].join(", ")}]`).join(", ")}]`
}

function computeNestedListAliasSteps(spec: NestedListAliasSpec, li: NestedListAliasLineIdx): NestedListAliasStep[] {
  const steps: NestedListAliasStep[] = []
  const rowBoxes: Record<string, number[]> = {}

  if (spec.mode === "multiply" || spec.mode === "comprehension") {
    const rows = spec.rows!, cols = spec.cols!
    let primaryOuter: string[]
    if (spec.mode === "multiply") {
      rowBoxes["R0"] = Array(cols).fill(0)
      primaryOuter = Array(rows).fill("R0")
      steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: false,
        codeLines: [li.INIT], caption: `행 하나를 만들고 그 팻말을 ${rows}번 복사합니다. 실제 리스트는 하나뿐입니다.` })
    } else {
      primaryOuter = []
      for (let i = 0; i < rows; i++) {
        const id = `R${i}`
        rowBoxes[id] = Array(cols).fill(0)
        primaryOuter.push(id)
      }
      steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: false,
        codeLines: [li.INIT], caption: `반복할 때마다 [0] * ${cols}를 새로 실행해 독립된 리스트 ${rows}개를 만듭니다.` })
    }

    const targetId = primaryOuter[0]
    rowBoxes[targetId] = [...rowBoxes[targetId]]
    rowBoxes[targetId][0] = 99
    const varName = spec.mode === "multiply" ? "a" : "b"
    steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: false,
      codeLines: [li.MUTATE], caption: spec.mode === "multiply"
        ? `${varName}[0][0] = 99로 바꿉니다. ${varName}의 모든 행이 같은 상자를 가리키므로 함께 바뀝니다.`
        : `${varName}[0][0] = 99로 바꿉니다. ${varName}[0]은 독립된 상자이므로 다른 행은 영향받지 않습니다.` })

    steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: true,
      codeLines: [li.PRINT_PRIMARY], caption: spec.mode === "multiply"
        ? `출력 결과 → ${gridDisplayFromOuter(primaryOuter, rowBoxes)} 모든 행의 첫 칸이 99입니다! (하나뿐인 리스트를 공유하기 때문)`
        : `출력 결과 → ${gridDisplayFromOuter(primaryOuter, rowBoxes)} 0번째 행만 바뀌고 나머지는 그대로입니다.` })

    return steps
  }

  // shallow_copy / deepcopy
  const grid = spec.grid!
  const primaryOuter: string[] = grid.map((row, i) => {
    const id = `S${i}`
    rowBoxes[id] = [...row]
    return id
  })
  const primaryVar = spec.mode === "shallow_copy" ? "lst" : "original"
  const secondaryVar = spec.mode === "shallow_copy" ? "k" : "deep"

  steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: false,
    codeLines: [li.IMPORT !== -1 ? li.IMPORT : li.INIT], caption: spec.mode === "deepcopy"
      ? "copy 모듈을 불러옵니다."
      : `${primaryVar} = ${pyGridLit(grid)}를 만듭니다.` })

  if (spec.mode === "deepcopy") {
    steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: null, rowBoxes: { ...rowBoxes }, finished: false,
      codeLines: [li.INIT], caption: `${primaryVar} = ${pyGridLit(grid)}를 만듭니다.` })
  }

  let secondaryOuter: string[]
  if (spec.mode === "shallow_copy") {
    secondaryOuter = [...primaryOuter]   // 같은 boxId를 그대로 재사용 → 행 공유 재현
    steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: [...secondaryOuter], rowBoxes: { ...rowBoxes }, finished: false,
      codeLines: [li.COPY], caption: `${secondaryVar} = ${primaryVar}.copy() → 바깥 리스트만 새로 만들고, 안쪽 행들은 원본과 같은 상자를 그대로 가리킵니다.` })
  } else {
    secondaryOuter = grid.map((row, i) => {
      const id = `D${i}`
      rowBoxes[id] = [...row]
      return id
    })
    steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: [...secondaryOuter], rowBoxes: { ...rowBoxes }, finished: false,
      codeLines: [li.COPY], caption: `${secondaryVar} = copy.deepcopy(${primaryVar}) → 바깥 리스트와 안쪽 행 모두 새로 복사합니다.` })
  }

  const mutateId = secondaryOuter[0]
  rowBoxes[mutateId] = [...rowBoxes[mutateId]]
  rowBoxes[mutateId][0] = 99
  steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: [...secondaryOuter], rowBoxes: { ...rowBoxes }, finished: false,
    codeLines: [li.MUTATE], caption: spec.mode === "shallow_copy"
      ? `${secondaryVar}[0][0] = 99로 바꿉니다. ${secondaryVar}[0]과 ${primaryVar}[0]이 같은 상자를 가리키므로 ${primaryVar}도 함께 바뀝니다!`
      : `${secondaryVar}[0][0] = 99로 바꿉니다. ${secondaryVar}[0]은 독립된 상자이므로 ${primaryVar}은(는) 영향받지 않습니다.` })

  steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: [...secondaryOuter], rowBoxes: { ...rowBoxes }, finished: false,
    codeLines: [li.PRINT_PRIMARY], caption: `${primaryVar}를 출력합니다 → ${gridDisplayFromOuter(primaryOuter, rowBoxes)}` })
  steps.push({ primaryOuter: [...primaryOuter], secondaryOuter: [...secondaryOuter], rowBoxes: { ...rowBoxes }, finished: true,
    codeLines: [li.PRINT_SECONDARY], caption: `${secondaryVar}를 출력합니다 → ${gridDisplayFromOuter(secondaryOuter, rowBoxes)}` })

  return steps
}

export type NestedListAliasVizResult =
  | { ok: true;  spec: NestedListAliasSpec; steps: NestedListAliasStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildNestedListAliasVisualization(raw: string): NestedListAliasVizResult {
  const parsed = parseNestedListAliasSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const li = buildNestedListAliasPseudocode(parsed.spec)
    const steps = computeNestedListAliasSteps(parsed.spec, li.lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: li.lines, codeCollapseBefore: li.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `2차원 리스트 별칭 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 격자 탐색 + 행/열 합계 (```grid-traverse-sum) ──

export type GridTraverseSumSpec = { title?: string; grid: number[][]; direction: "row" | "col" }
const GTS_MAX_SIZE = 5

export type GridTraverseSumValidationResult =
  | { ok: true;  spec: GridTraverseSumSpec }
  | { ok: false; error: string }

export function parseGridTraverseSumSpec(raw: string): GridTraverseSumValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "격자 탐색 데이터 형식이 올바르지 않습니다." }
  }
  const { title, grid, direction } = parsed
  const gridError = validateGrid(grid, GTS_MAX_SIZE)
  if (gridError) return { ok: false, error: gridError }
  if (direction !== "row" && direction !== "col") {
    return { ok: false, error: 'direction은 "row" 또는 "col"이어야 합니다.' }
  }
  return { ok: true, spec: { title, grid, direction } }
}

function buildGridTraverseSumPseudocode(spec: GridTraverseSumSpec) {
  if (spec.direction === "row") {
    const lines = [
      `scores = ${pyGridLit(spec.grid)}`,
      "",
      "for i, row in enumerate(scores):",
      "    avg = sum(row) / len(row)",
      '    print(f"학생 {i+1}: 평균 {avg:.1f}점")',
    ]
    return { lines, lineIdx: { INIT: 0, FOR_J: -1, COL_SUM_INIT: -1, FOR_I: 2, ACCUM: 3, AVG: 3, PRINT: 4 }, collapseBefore: 1 }
  }
  const lines = [
    `scores = ${pyGridLit(spec.grid)}`,
    "rows = len(scores)",
    "cols = len(scores[0])",
    "",
    "for j in range(cols):",
    "    col_sum = 0",
    "    for i in range(rows):",
    "        col_sum += scores[i][j]",
    "    avg = col_sum / rows",
    '    print(f"과목 {j+1}: 평균 {avg:.1f}점")',
  ]
  return { lines, lineIdx: { INIT: 0, FOR_J: 4, COL_SUM_INIT: 5, FOR_I: 6, ACCUM: 7, AVG: 8, PRINT: 9 }, collapseBefore: 3 }
}

export type GridTraverseSumCellState = "empty" | "current" | "done"
export type GridTraverseSumStep = {
  cellStates:   GridTraverseSumCellState[][]
  runningValue: number | null
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

type GridTraverseSumLineIdx = ReturnType<typeof buildGridTraverseSumPseudocode>["lineIdx"]

function computeGridTraverseSumSteps(spec: GridTraverseSumSpec, li: GridTraverseSumLineIdx): GridTraverseSumStep[] {
  const steps: GridTraverseSumStep[] = []
  const rows = spec.grid.length, cols = spec.grid[0].length
  const cellStates: GridTraverseSumCellState[][] = Array.from({ length: rows }, () => Array(cols).fill("empty"))

  const snapshot = (runningValue: number | null, finished: boolean, codeLines: number[], caption: string): GridTraverseSumStep => ({
    cellStates: cellStates.map(row => [...row]), runningValue, finished, codeLines, caption,
  })

  if (spec.direction === "row") {
    for (let i = 0; i < rows; i++) {
      for (let c = 0; c < cols; c++) cellStates[i][c] = "current"
      steps.push(snapshot(null, false, [li.FOR_I], `${i}번째 행을 선택합니다.`))

      const row = spec.grid[i]
      const sum = row.reduce((a, b) => a + b, 0)
      const avg = sum / row.length
      steps.push(snapshot(sum, false, [li.ACCUM], `sum(row) / len(row) = ${sum} / ${row.length} = ${avg.toFixed(1)}`))

      for (let c = 0; c < cols; c++) cellStates[i][c] = "done"
      const isLast = i === rows - 1
      steps.push(snapshot(sum, isLast, [li.PRINT], `학생 ${i + 1}: 평균 ${avg.toFixed(1)}점`))
    }
    return steps
  }

  for (let j = 0; j < cols; j++) {
    steps.push(snapshot(0, false, [li.FOR_J], `${j}번째 열을 선택합니다.`))
    steps.push(snapshot(0, false, [li.COL_SUM_INIT], "col_sum을 0으로 초기화합니다."))

    let colSum = 0
    for (let i = 0; i < rows; i++) {
      cellStates[i][j] = "current"
      steps.push(snapshot(colSum, false, [li.FOR_I], `${i}번째 행으로 이동합니다.`))
      colSum += spec.grid[i][j]
      steps.push(snapshot(colSum, false, [li.ACCUM], `col_sum += scores[${i}][${j}] → col_sum = ${colSum}`))
      cellStates[i][j] = "done"
    }

    const avg = colSum / rows
    steps.push(snapshot(colSum, false, [li.AVG], `avg = col_sum / rows = ${colSum} / ${rows} = ${avg.toFixed(1)}`))
    const isLast = j === cols - 1
    steps.push(snapshot(colSum, isLast, [li.PRINT], `과목 ${j + 1}: 평균 ${avg.toFixed(1)}점`))
  }
  return steps
}

export type GridTraverseSumVizResult =
  | { ok: true;  spec: GridTraverseSumSpec; steps: GridTraverseSumStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridTraverseSumVisualization(raw: string): GridTraverseSumVizResult {
  const parsed = parseGridTraverseSumSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildGridTraverseSumPseudocode(parsed.spec)
    const steps = computeGridTraverseSumSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `격자 탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 상하좌우 이웃 탐색 (```grid-neighbor-scan) ──
// lib/gridTraversal.ts의 grid-directions(4.6절)와는 다르다: 그건 격자 값도 경계
// 검사도 없는 순수 dx/dy 데모이고, 이건 실제 격자 값 출력 + 경계 검사가 핵심이라
// 새로 만든다. GridCanvas의 padding=1로 격자 밖 이웃 칸까지 그려서 보여준다.

export type GridNeighborScanSpec = { title?: string; grid: number[][]; r: number; c: number; directions: 4 | 8 }
const GNS_MAX_SIZE = 6

const DR4 = [-1, 1, 0, 0]
const DC4 = [0, 0, -1, 1]
const DIR_NAME4 = ["위", "아래", "왼쪽", "오른쪽"]
const DR8 = [-1, -1, -1, 0, 0, 1, 1, 1]
const DC8 = [-1, 0, 1, -1, 1, -1, 0, 1]

export type GridNeighborScanValidationResult =
  | { ok: true;  spec: GridNeighborScanSpec }
  | { ok: false; error: string }

export function parseGridNeighborScanSpec(raw: string): GridNeighborScanValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "이웃 탐색 데이터 형식이 올바르지 않습니다." }
  }
  const { title, grid, r, c, directions } = parsed
  const gridError = validateGrid(grid, GNS_MAX_SIZE)
  if (gridError) return { ok: false, error: gridError }
  const rows = grid.length, cols = grid[0].length
  if (!Number.isInteger(r) || r < 0 || r >= rows) return { ok: false, error: `r은 0~${rows - 1} 사이의 정수여야 합니다.` }
  if (!Number.isInteger(c) || c < 0 || c >= cols) return { ok: false, error: `c는 0~${cols - 1} 사이의 정수여야 합니다.` }
  if (directions !== 4 && directions !== 8) return { ok: false, error: "directions는 4 또는 8이어야 합니다." }
  return { ok: true, spec: { title, grid, r, c, directions } }
}

function buildGridNeighborScanPseudocode(spec: GridNeighborScanSpec) {
  const dr = spec.directions === 4 ? DR4 : DR8
  const dc = spec.directions === 4 ? DC4 : DC8
  const lines = [
    `grid = ${pyGridLit(spec.grid)}`,
    "rows = len(grid)",
    "cols = len(grid[0])",
    "",
    `dr = [${dr.join(", ")}]`,
    `dc = [${dc.join(", ")}]`,
    `r, c = ${spec.r}, ${spec.c}`,
    "",
    `for d in range(${spec.directions}):`,
    "    nr = r + dr[d]",
    "    nc = c + dc[d]",
    "    if 0 <= nr < rows and 0 <= nc < cols:",
    '        print(f"({nr},{nc}) 값: {grid[nr][nc]}")',
  ]
  return { lines, lineIdx: { INIT: 0, DR: 4, DC: 5, POS: 6, FOR: 8, CALC_NR: 9, CALC_NC: 10, CHECK: 11, PRINT: 12 }, collapseBefore: 3 }
}

export type GridNeighborScanStep = {
  highlightR: number | null
  highlightC: number | null
  inRange:    boolean | null
  value:      number | null
  finished:   boolean
  codeLines:  number[]
  caption:    string
}

type GridNeighborScanLineIdx = ReturnType<typeof buildGridNeighborScanPseudocode>["lineIdx"]

function computeGridNeighborScanSteps(spec: GridNeighborScanSpec, li: GridNeighborScanLineIdx): GridNeighborScanStep[] {
  const steps: GridNeighborScanStep[] = []
  const dr = spec.directions === 4 ? DR4 : DR8
  const dc = spec.directions === 4 ? DC4 : DC8
  const rows = spec.grid.length, cols = spec.grid[0].length

  const push = (highlightR: number | null, highlightC: number | null, inRange: boolean | null, value: number | null, finished: boolean, codeLines: number[], caption: string) => {
    steps.push({ highlightR, highlightC, inRange, value, finished, codeLines, caption })
  }

  push(spec.r, spec.c, null, null, false, [li.DR], "네 방향(또는 여덟 방향)의 행 변화량 dr을 정의합니다.")
  push(spec.r, spec.c, null, null, false, [li.DC], "이동량 dc를 정의합니다.")
  push(spec.r, spec.c, null, null, false, [li.POS], `기준 위치 (r, c) = (${spec.r}, ${spec.c})로 정합니다.`)
  push(spec.r, spec.c, null, null, false, [li.FOR], `d를 0부터 ${spec.directions - 1}까지 반복하며 각 방향을 확인합니다.`)

  for (let d = 0; d < spec.directions; d++) {
    const nr = spec.r + dr[d]
    const nc = spec.c + dc[d]
    const dirName = spec.directions === 4 ? `(${DIR_NAME4[d]}) ` : ""

    push(nr, spec.c, null, null, false, [li.CALC_NR], `방향 ${d} ${dirName}: nr = r + dr[${d}] = ${nr}`)
    push(nr, nc, null, null, false, [li.CALC_NC], `방향 ${d} ${dirName}: nc = c + dc[${d}] = ${nc}`)

    const inRange = nr >= 0 && nr < rows && nc >= 0 && nc < cols
    if (inRange) {
      push(nr, nc, true, null, false, [li.CHECK], `0 <= ${nr} < ${rows} and 0 <= ${nc} < ${cols} → 참, 격자 안입니다.`)
      push(nr, nc, true, spec.grid[nr][nc], false, [li.PRINT], `(${nr},${nc}) 값: ${spec.grid[nr][nc]}`)
    } else {
      push(nr, nc, false, null, false, [li.CHECK], `0 <= ${nr} < ${rows} and 0 <= ${nc} < ${cols} → 거짓, 격자 밖이라 출력하지 않습니다.`)
    }
  }

  push(null, null, null, null, true, [li.FOR], "모든 방향을 확인했습니다.")
  return steps
}

export type GridNeighborScanVizResult =
  | { ok: true;  spec: GridNeighborScanSpec; steps: GridNeighborScanStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridNeighborScanVisualization(raw: string): GridNeighborScanVizResult {
  const parsed = parseGridNeighborScanSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildGridNeighborScanPseudocode(parsed.spec)
    const steps = computeGridNeighborScanSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `이웃 탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 전치·회전 (```grid-transpose-rotate) ──

export type GridTransposeRotateSpec = { title?: string; grid: number[][]; mode: "transpose" | "rotate" }
const GTR_MAX_SIZE = 5

export type GridTransposeRotateValidationResult =
  | { ok: true;  spec: GridTransposeRotateSpec }
  | { ok: false; error: string }

export function parseGridTransposeRotateSpec(raw: string): GridTransposeRotateValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "전치/회전 데이터 형식이 올바르지 않습니다." }
  }
  const { title, grid, mode } = parsed
  const gridError = validateGrid(grid, GTR_MAX_SIZE)
  if (gridError) return { ok: false, error: gridError }
  if (mode !== "transpose" && mode !== "rotate") {
    return { ok: false, error: 'mode는 "transpose" 또는 "rotate"여야 합니다.' }
  }
  return { ok: true, spec: { title, grid, mode } }
}

function buildGridTransposeRotatePseudocode(spec: GridTransposeRotateSpec) {
  if (spec.mode === "transpose") {
    const lines = [
      `lst = ${pyGridLit(spec.grid)}`,
      "rows = len(lst)",
      "cols = len(lst[0])",
      "",
      "result = [[lst[i][j] for i in range(rows)] for j in range(cols)]",
    ]
    return { lines, lineIdx: { INIT: 0, ROWS: 1, COLS: 2, BUILD: 4, REVERSE: -1 }, collapseBefore: 3 }
  }
  const lines = [
    `matrix = ${pyGridLit(spec.grid)}`,
    "rows = len(matrix)",
    "cols = len(matrix[0])",
    "",
    "transposed = [[matrix[i][j] for i in range(rows)] for j in range(cols)]",
    "rotated = [row[::-1] for row in transposed]",
  ]
  return { lines, lineIdx: { INIT: 0, ROWS: 1, COLS: 2, BUILD: 4, REVERSE: 5 }, collapseBefore: 3 }
}

export type GridTransposeRotateStep = {
  sourceHighlight: [number, number] | null
  destGrid:        (number | null)[][]
  destHighlight:   [number, number] | null
  reverseRow:      number | null
  finished:        boolean
  codeLines:       number[]
  caption:         string
}

type GridTransposeRotateLineIdx = ReturnType<typeof buildGridTransposeRotatePseudocode>["lineIdx"]

function computeGridTransposeRotateSteps(spec: GridTransposeRotateSpec, li: GridTransposeRotateLineIdx): GridTransposeRotateStep[] {
  const steps: GridTransposeRotateStep[] = []
  const rows = spec.grid.length, cols = spec.grid[0].length
  const destGrid: (number | null)[][] = Array.from({ length: cols }, () => Array(rows).fill(null))

  const snapshot = (sourceHighlight: [number, number] | null, destHighlight: [number, number] | null, reverseRow: number | null, finished: boolean, codeLines: number[], caption: string): GridTransposeRotateStep => ({
    sourceHighlight, destGrid: destGrid.map(row => [...row]), destHighlight, reverseRow, finished, codeLines, caption,
  })

  steps.push(snapshot(null, null, null, false, [li.ROWS], `rows = len(lst) = ${rows}`))
  steps.push(snapshot(null, null, null, false, [li.COLS], `cols = len(lst[0]) = ${cols}`))

  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
      const value = spec.grid[i][j]
      destGrid[j][i] = value
      steps.push(snapshot([i, j], [j, i], null, false, [li.BUILD], `result[${j}][${i}] = lst[${i}][${j}] = ${value}`))
    }
  }

  if (spec.mode === "transpose") {
    steps.push(snapshot(null, null, null, true, [li.BUILD], "전치가 완료되었습니다."))
    return steps
  }

  for (let r = 0; r < destGrid.length; r++) {
    const before = destGrid[r] as number[]
    destGrid[r] = [...before].reverse()
    const isLast = r === destGrid.length - 1
    steps.push(snapshot(null, null, r, isLast, [li.REVERSE], `${r}번째 행을 뒤집습니다: [${before.join(", ")}] → [${destGrid[r].join(", ")}]`))
  }

  return steps
}

export type GridTransposeRotateVizResult =
  | { ok: true;  spec: GridTransposeRotateSpec; steps: GridTransposeRotateStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridTransposeRotateVisualization(raw: string): GridTransposeRotateVizResult {
  const parsed = parseGridTransposeRotateSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildGridTransposeRotatePseudocode(parsed.spec)
    const steps = computeGridTransposeRotateSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `전치/회전 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 최댓값/최솟값 위치 찾기 (```grid-max-pos) ──

export type GridMaxPosSpec = { title?: string; grid: number[][]; mode: "max" | "min" }
const GMP_MAX_SIZE = 5

export type GridMaxPosValidationResult =
  | { ok: true;  spec: GridMaxPosSpec }
  | { ok: false; error: string }

export function parseGridMaxPosSpec(raw: string): GridMaxPosValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "최댓값/최솟값 데이터 형식이 올바르지 않습니다." }
  }
  const { title, grid, mode } = parsed
  const gridError = validateGrid(grid, GMP_MAX_SIZE)
  if (gridError) return { ok: false, error: gridError }
  if (mode !== "max" && mode !== "min") {
    return { ok: false, error: 'mode는 "max" 또는 "min"이어야 합니다.' }
  }
  return { ok: true, spec: { title, grid, mode } }
}

function buildGridMaxPosPseudocode(spec: GridMaxPosSpec) {
  const varName = spec.mode === "max" ? "max_val" : "min_val"
  const posName = spec.mode === "max" ? "max_pos" : "min_pos"
  const op = spec.mode === "max" ? ">" : "<"
  const label = spec.mode === "max" ? "최댓값" : "최솟값"
  const lines = [
    `lst = ${pyGridLit(spec.grid)}`,
    "",
    `${varName} = lst[0][0]`,
    `${posName} = (0, 0)`,
    "",
    "for i in range(len(lst)):",
    "    for j in range(len(lst[i])):",
    `        if lst[i][j] ${op} ${varName}:`,
    `            ${varName} = lst[i][j]`,
    `            ${posName} = (i, j)`,
    "",
    `print(f"${label}: {${varName}}, 위치: {${posName}[0]}행 {${posName}[1]}열")`,
  ]
  return {
    lines,
    lineIdx: { INIT: 0, VAL_INIT: 2, POS_INIT: 3, FOR_I: 5, FOR_J: 6, CHECK: 7, UPDATE_VAL: 8, UPDATE_POS: 9, PRINT: 11 },
    collapseBefore: 1,
  }
}

export type GridMaxPosCellState = "empty" | "current" | "champion" | "checked"
export type GridMaxPosStep = {
  cellStates:  GridMaxPosCellState[][]
  currentVal:  number
  currentPos:  [number, number]
  finished:    boolean
  codeLines:   number[]
  caption:     string
}

type GridMaxPosLineIdx = ReturnType<typeof buildGridMaxPosPseudocode>["lineIdx"]

function computeGridMaxPosSteps(spec: GridMaxPosSpec, li: GridMaxPosLineIdx): GridMaxPosStep[] {
  const steps: GridMaxPosStep[] = []
  const rows = spec.grid.length, cols = spec.grid[0].length
  const cellStates: GridMaxPosCellState[][] = Array.from({ length: rows }, () => Array(cols).fill("empty"))
  const label = spec.mode === "max" ? "max_val" : "min_val"
  const posLabel = spec.mode === "max" ? "max_pos" : "min_pos"

  const snapshot = (currentVal: number, currentPos: [number, number], finished: boolean, codeLines: number[], caption: string): GridMaxPosStep => ({
    cellStates: cellStates.map(row => [...row]), currentVal, currentPos, finished, codeLines, caption,
  })

  let best = spec.grid[0][0]
  let bestPos: [number, number] = [0, 0]
  steps.push(snapshot(best, bestPos, false, [li.VAL_INIT], `${label}을 lst[0][0] = ${best}로 초기화합니다.`))
  steps.push(snapshot(best, bestPos, false, [li.POS_INIT], `${posLabel}를 (0, 0)으로 초기화합니다.`))

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cellStates[i][j] = "current"
      const value = spec.grid[i][j]
      const better = spec.mode === "max" ? value > best : value < best
      steps.push(snapshot(best, bestPos, false, [li.CHECK], `lst[${i}][${j}] = ${value} ${spec.mode === "max" ? ">" : "<"} ${label}(${best}) → ${better ? "참" : "거짓"}`))

      if (better) {
        best = value
        bestPos = [i, j]
        cellStates[i][j] = "champion"
        steps.push(snapshot(best, bestPos, false, [li.UPDATE_VAL], `${label} = ${best}`))
        steps.push(snapshot(best, bestPos, false, [li.UPDATE_POS], `${posLabel} = (${i}, ${j})`))
      } else {
        cellStates[i][j] = "checked"
      }
    }
  }

  steps.push(snapshot(best, bestPos, true, [li.PRINT], `${spec.mode === "max" ? "최댓값" : "최솟값"}: ${best}, 위치: ${bestPos[0]}행 ${bestPos[1]}열`))
  return steps
}

export type GridMaxPosVizResult =
  | { ok: true;  spec: GridMaxPosSpec; steps: GridMaxPosStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGridMaxPosVisualization(raw: string): GridMaxPosVizResult {
  const parsed = parseGridMaxPosSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildGridMaxPosPseudocode(parsed.spec)
    const steps = computeGridMaxPosSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `최댓값/최솟값 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
