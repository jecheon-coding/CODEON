// 파이썬가이드 "5장. 리스트" 챕터 본문의 ```list-ops / ```list-slice / ```list-copy-ref /
// ```list-index-compare 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한
// 순서로 스텝을 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.

export type ListValue = number | string
// append()는 실제로 리스트 자체를 통째로 하나의 요소로 넣을 수 있다(예: list1.append([4, 5])).
// extend()와의 대조를 보여주려면 이 케이스가 꼭 필요해서 append 전용으로만 배열 값을 허용한다.
export type ListItem = ListValue | ListValue[]

function isListValue(v: any): v is ListValue {
  return typeof v === "number" || typeof v === "string"
}

function isListItem(v: any): v is ListItem {
  return isListValue(v) || (Array.isArray(v) && v.every(isListValue))
}

function pyLit(v: ListItem): string {
  if (Array.isArray(v)) return pyListLit(v)
  return typeof v === "string" ? `'${v}'` : String(v)
}

function pyListLit(vs: ListItem[]): string {
  return `[${vs.map(pyLit).join(", ")}]`
}

export function formatListItem(v: ListItem): string {
  return Array.isArray(v) ? pyListLit(v) : String(v)
}

// ── 리스트 연산 (```list-ops) ──

export type ListOp =
  | { type: "append"; value: ListItem }
  | { type: "insert"; index: number; value: ListValue }
  | { type: "extend"; values: ListValue[] }
  | { type: "remove"; value: ListValue }
  | { type: "pop"; index?: number }
  | { type: "del"; index: number }
  | { type: "del_slice"; start: number; end: number }
  | { type: "clear" }
  | { type: "reverse" }
  | { type: "slice_assign"; start: number; end: number; values: ListValue[] }

export type ListOpsSpec = { title?: string; initial: ListItem[]; operations: ListOp[] }

const INITIAL_LEN_MAX = 8
const OPS_LEN_MIN = 1
const OPS_LEN_MAX = 10
const VALUES_LEN_MAX = 5

export type ListOpsValidationResult =
  | { ok: true;  spec: ListOpsSpec }
  | { ok: false; error: string }

export function parseListOpsSpec(raw: string): ListOpsValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "리스트 연산 데이터 형식이 올바르지 않습니다." }
  }

  const { initial, operations, title } = parsed

  if (!Array.isArray(initial) || initial.length > INITIAL_LEN_MAX || !initial.every(isListItem)) {
    return { ok: false, error: `initial은 길이 0~${INITIAL_LEN_MAX}의 배열이어야 합니다.` }
  }
  if (!Array.isArray(operations) || operations.length < OPS_LEN_MIN || operations.length > OPS_LEN_MAX) {
    return { ok: false, error: `operations는 길이 ${OPS_LEN_MIN}~${OPS_LEN_MAX}의 배열이어야 합니다.` }
  }

  let list: ListItem[] = [...initial]

  for (const op of operations) {
    if (!op || typeof op.type !== "string") {
      return { ok: false, error: "operations의 각 항목은 type 필드가 필요합니다." }
    }
    switch (op.type) {
      case "append":
        if (!isListItem(op.value)) return { ok: false, error: "append의 value가 올바르지 않습니다." }
        list.push(op.value)
        break
      case "insert":
        if (!Number.isInteger(op.index) || op.index < 0 || op.index > list.length) {
          return { ok: false, error: `insert의 index는 0~${list.length} 사이여야 합니다.` }
        }
        if (!isListValue(op.value)) return { ok: false, error: "insert의 value가 올바르지 않습니다." }
        list.splice(op.index, 0, op.value)
        break
      case "extend":
        if (!Array.isArray(op.values) || op.values.length < 1 || op.values.length > VALUES_LEN_MAX || !op.values.every(isListValue)) {
          return { ok: false, error: `extend의 values는 길이 1~${VALUES_LEN_MAX}의 배열이어야 합니다.` }
        }
        list.push(...op.values)
        break
      case "remove":
        if (!isListValue(op.value)) return { ok: false, error: "remove의 value가 올바르지 않습니다." }
        if (!list.includes(op.value)) return { ok: false, error: `remove(${op.value}) — 값이 리스트에 없어 ValueError가 발생합니다.` }
        list.splice(list.indexOf(op.value), 1)
        break
      case "pop": {
        if (list.length === 0) return { ok: false, error: "빈 리스트에서 pop을 시도합니다." }
        const idx = op.index ?? list.length - 1
        if (op.index !== undefined && (!Number.isInteger(op.index) || idx < 0 || idx >= list.length)) {
          return { ok: false, error: "pop의 index가 범위를 벗어났습니다." }
        }
        list.splice(idx, 1)
        break
      }
      case "del":
        if (!Number.isInteger(op.index) || op.index < 0 || op.index >= list.length) {
          return { ok: false, error: "del의 index가 범위를 벗어났습니다." }
        }
        list.splice(op.index, 1)
        break
      case "del_slice":
        if (!Number.isInteger(op.start) || !Number.isInteger(op.end) || op.start < 0 || op.end > list.length || op.start > op.end) {
          return { ok: false, error: "del_slice의 범위가 올바르지 않습니다." }
        }
        list.splice(op.start, op.end - op.start)
        break
      case "clear":
        list = []
        break
      case "reverse":
        list.reverse()
        break
      case "slice_assign":
        if (!Number.isInteger(op.start) || !Number.isInteger(op.end) || op.start < 0 || op.end > list.length || op.start > op.end) {
          return { ok: false, error: "slice_assign의 범위가 올바르지 않습니다." }
        }
        if (!Array.isArray(op.values) || op.values.length > VALUES_LEN_MAX || !op.values.every(isListValue)) {
          return { ok: false, error: `slice_assign의 values는 길이 0~${VALUES_LEN_MAX}의 배열이어야 합니다.` }
        }
        list.splice(op.start, op.end - op.start, ...op.values)
        break
      default:
        return { ok: false, error: `알 수 없는 연산 type입니다: ${op.type}` }
    }
  }

  return { ok: true, spec: { title, initial, operations } }
}

function opToCode(op: ListOp): string {
  switch (op.type) {
    case "append":       return `my_list.append(${pyLit(op.value)})`
    case "insert":       return `my_list.insert(${op.index}, ${pyLit(op.value)})`
    case "extend":       return `my_list.extend(${pyListLit(op.values)})`
    case "remove":       return `my_list.remove(${pyLit(op.value)})`
    case "pop":          return op.index !== undefined ? `x = my_list.pop(${op.index})` : "x = my_list.pop()"
    case "del":          return `del my_list[${op.index}]`
    case "del_slice":    return `del my_list[${op.start}:${op.end}]`
    case "clear":         return "my_list.clear()"
    case "reverse":       return "my_list.reverse()"
    case "slice_assign": return `my_list[${op.start}:${op.end}] = ${pyListLit(op.values)}`
  }
}

function buildListOpsPseudocode(spec: ListOpsSpec) {
  const lines = [`my_list = ${pyListLit(spec.initial)}`, ""]
  const opLineIdx: number[] = []
  for (const op of spec.operations) {
    opLineIdx.push(lines.length)
    lines.push(opToCode(op))
  }
  return { lines, opLineIdx, collapseBefore: 0 }
}

export type ListOpsStep = {
  list:           ListItem[]
  highlightRange: [number, number] | null
  poppedValue:    ListItem | null
  codeLines:      number[]
  caption:        string
}

function computeListOpsSteps(spec: ListOpsSpec, opLineIdx: number[]): ListOpsStep[] {
  const steps: ListOpsStep[] = []
  let list: ListItem[] = [...spec.initial]

  spec.operations.forEach((op, i) => {
    let highlightRange: [number, number] | null = null
    let poppedValue: ListItem | null = null
    let caption = ""

    switch (op.type) {
      case "append": {
        list.push(op.value)
        highlightRange = [list.length - 1, list.length]
        caption = `${pyLit(op.value)}을(를) 끝에 추가합니다 → ${pyListLit(list)}`
        break
      }
      case "insert": {
        list.splice(op.index, 0, op.value)
        highlightRange = [op.index, op.index + 1]
        caption = `인덱스 ${op.index}에 ${pyLit(op.value)}을(를) 삽입합니다 → ${pyListLit(list)}`
        break
      }
      case "extend": {
        const start = list.length
        list.push(...op.values)
        highlightRange = [start, list.length]
        caption = `${pyListLit(op.values)}을(를) 풀어서 각각 추가합니다 → ${pyListLit(list)}`
        break
      }
      case "remove": {
        const idx = list.indexOf(op.value)
        list.splice(idx, 1)
        caption = `처음 나오는 ${pyLit(op.value)}을(를) 제거합니다 → ${pyListLit(list)}`
        break
      }
      case "pop": {
        const idx = op.index ?? list.length - 1
        poppedValue = list[idx]
        list.splice(idx, 1)
        caption = `인덱스 ${idx}의 값 ${pyLit(poppedValue)}을(를) 꺼냅니다 → ${pyListLit(list)}`
        break
      }
      case "del": {
        const removed = list[op.index]
        list.splice(op.index, 1)
        caption = `인덱스 ${op.index}(값 ${pyLit(removed)})을(를) 삭제합니다 → ${pyListLit(list)}`
        break
      }
      case "del_slice": {
        list.splice(op.start, op.end - op.start)
        caption = `인덱스 [${op.start}:${op.end}] 구간을 삭제합니다 → ${pyListLit(list)}`
        break
      }
      case "clear": {
        list = []
        caption = "모든 요소를 제거합니다 → []"
        break
      }
      case "reverse": {
        list.reverse()
        caption = `순서를 뒤집습니다 → ${pyListLit(list)}`
        break
      }
      case "slice_assign": {
        list.splice(op.start, op.end - op.start, ...op.values)
        highlightRange = [op.start, op.start + op.values.length]
        caption = `인덱스 [${op.start}:${op.end}] 자리에 ${pyListLit(op.values)}을(를) 넣습니다 → ${pyListLit(list)} (길이 변화 주의)`
        break
      }
    }

    steps.push({ list: [...list], highlightRange, poppedValue, codeLines: [opLineIdx[i]], caption })
  })

  return steps
}

export type ListOpsVizResult =
  | { ok: true;  spec: ListOpsSpec; steps: ListOpsStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildListOpsVisualization(raw: string): ListOpsVizResult {
  const parsed = parseListOpsSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, opLineIdx, collapseBefore } = buildListOpsPseudocode(parsed.spec)
    const steps = computeListOpsSteps(parsed.spec, opLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `리스트 연산 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 슬라이싱 비교 (```list-slice) ──

export type SliceExpr = { start?: number; end?: number; step?: number }
export type ListSliceSpec = { title?: string; list: ListValue[]; slices: SliceExpr[] }

const LIST_LEN_MIN = 1
const LIST_LEN_MAX = 12
const SLICES_LEN_MIN = 1
const SLICES_LEN_MAX = 6

export type ListSliceValidationResult =
  | { ok: true;  spec: ListSliceSpec }
  | { ok: false; error: string }

export function parseListSliceSpec(raw: string): ListSliceValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "슬라이싱 데이터 형식이 올바르지 않습니다." }
  }

  const { list, slices, title } = parsed

  if (!Array.isArray(list) || list.length < LIST_LEN_MIN || list.length > LIST_LEN_MAX || !list.every(isListValue)) {
    return { ok: false, error: `list는 길이 ${LIST_LEN_MIN}~${LIST_LEN_MAX}의 배열이어야 합니다.` }
  }
  if (!Array.isArray(slices) || slices.length < SLICES_LEN_MIN || slices.length > SLICES_LEN_MAX) {
    return { ok: false, error: `slices는 길이 ${SLICES_LEN_MIN}~${SLICES_LEN_MAX}의 배열이어야 합니다.` }
  }
  for (const s of slices) {
    if (!s || typeof s !== "object") return { ok: false, error: "slices의 각 항목은 객체여야 합니다." }
    if (s.start !== undefined && !Number.isInteger(s.start)) return { ok: false, error: "start는 정수여야 합니다." }
    if (s.end !== undefined && !Number.isInteger(s.end)) return { ok: false, error: "end는 정수여야 합니다." }
    if (s.step !== undefined && (!Number.isInteger(s.step) || s.step === 0)) return { ok: false, error: "step은 0이 아닌 정수여야 합니다." }
  }

  return { ok: true, spec: { title, list, slices } }
}

// 파이썬 슬라이스 규칙(음수 인덱스, 생략된 start/end, 음수 step)을 그대로 재현
function resolveSlice(len: number, s: SliceExpr): number[] {
  const step = s.step ?? 1
  const norm = (idx: number): number => (idx < 0 ? idx + len : idx)

  let start: number, end: number
  if (step > 0) {
    start = s.start === undefined ? 0 : Math.max(0, Math.min(len, norm(s.start)))
    end   = s.end   === undefined ? len : Math.max(0, Math.min(len, norm(s.end)))
  } else {
    start = s.start === undefined ? len - 1 : Math.max(-1, Math.min(len - 1, norm(s.start)))
    end   = s.end   === undefined ? -1 : Math.max(-1, Math.min(len - 1, norm(s.end)))
  }

  const indices: number[] = []
  if (step > 0) {
    for (let i = start; i < end; i += step) indices.push(i)
  } else {
    for (let i = start; i > end; i += step) indices.push(i)
  }
  return indices
}

function sliceLabel(s: SliceExpr): string {
  const start = s.start !== undefined ? String(s.start) : ""
  const end = s.end !== undefined ? String(s.end) : ""
  const step = s.step !== undefined ? `:${s.step}` : ""
  return `${start}:${end}${step}`
}

function buildListSlicePseudocode(spec: ListSliceSpec) {
  const contextLines = [`my_list = ${pyListLit(spec.list)}`]
  const collapseBefore = contextLines.length
  const bodyLines = spec.slices.map(s => `print(my_list[${sliceLabel(s)}])`)
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const printLineIdx = spec.slices.map((_, i) => offset + i)
  return { lines, printLineIdx, collapseBefore }
}

export type ListSliceStep = {
  includedIndices: number[]
  resultValues:    ListValue[]
  codeLines:       number[]
  caption:         string
}

function computeListSliceSteps(spec: ListSliceSpec, printLineIdx: number[]): ListSliceStep[] {
  return spec.slices.map((s, i) => {
    const includedIndices = resolveSlice(spec.list.length, s)
    const resultValues = includedIndices.map(idx => spec.list[idx])
    return {
      includedIndices, resultValues,
      codeLines: [printLineIdx[i]],
      caption: `my_list[${sliceLabel(s)}] → 인덱스 [${includedIndices.join(", ")}] → ${pyListLit(resultValues)}`,
    }
  })
}

export type ListSliceVizResult =
  | { ok: true;  spec: ListSliceSpec; steps: ListSliceStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildListSliceVisualization(raw: string): ListSliceVizResult {
  const parsed = parseListSliceSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, printLineIdx, collapseBefore } = buildListSlicePseudocode(parsed.spec)
    const steps = computeListSliceSteps(parsed.spec, printLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `슬라이싱 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 인덱스 접근 비교 (```list-index-compare) ──

export type ListIndexCompareSpec = { title?: string; list: ListValue[]; expressions: number[] }

const EXPR_LEN_MIN = 1
const EXPR_LEN_MAX = 6

export type ListIndexCompareValidationResult =
  | { ok: true;  spec: ListIndexCompareSpec }
  | { ok: false; error: string }

export function parseListIndexCompareSpec(raw: string): ListIndexCompareValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "인덱스 비교 데이터 형식이 올바르지 않습니다." }
  }

  const { list, expressions, title } = parsed

  if (!Array.isArray(list) || list.length < LIST_LEN_MIN || list.length > LIST_LEN_MAX || !list.every(isListValue)) {
    return { ok: false, error: `list는 길이 ${LIST_LEN_MIN}~${LIST_LEN_MAX}의 배열이어야 합니다.` }
  }
  if (!Array.isArray(expressions) || expressions.length < EXPR_LEN_MIN || expressions.length > EXPR_LEN_MAX) {
    return { ok: false, error: `expressions는 길이 ${EXPR_LEN_MIN}~${EXPR_LEN_MAX}의 배열이어야 합니다.` }
  }
  for (const e of expressions) {
    if (!Number.isInteger(e) || e < -list.length || e >= list.length) {
      return { ok: false, error: `expressions의 값 ${e}는 -${list.length}~${list.length - 1} 범위여야 합니다.` }
    }
  }

  return { ok: true, spec: { title, list, expressions } }
}

function buildListIndexComparePseudocode(spec: ListIndexCompareSpec) {
  const contextLines = [`my_list = ${pyListLit(spec.list)}`]
  const collapseBefore = contextLines.length
  const bodyLines = spec.expressions.map(e => `print(my_list[${e}])`)
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const printLineIdx = spec.expressions.map((_, i) => offset + i)
  return { lines, printLineIdx, collapseBefore }
}

export type ListIndexCompareStep = {
  expr:          number
  resolvedIndex: number   // 실제 위치(항상 0 이상)
  value:         ListValue
  codeLines:     number[]
  caption:       string
}

function computeListIndexCompareSteps(spec: ListIndexCompareSpec, printLineIdx: number[]): ListIndexCompareStep[] {
  const len = spec.list.length
  return spec.expressions.map((expr, i) => {
    const resolvedIndex = expr < 0 ? expr + len : expr
    const value = spec.list[resolvedIndex]
    return {
      expr, resolvedIndex, value,
      codeLines: [printLineIdx[i]],
      caption: `my_list[${expr}] → 실제 위치 인덱스 ${resolvedIndex}, 값 ${pyLit(value)}`,
    }
  })
}

export type ListIndexCompareVizResult =
  | { ok: true;  spec: ListIndexCompareSpec; steps: ListIndexCompareStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildListIndexCompareVisualization(raw: string): ListIndexCompareVizResult {
  const parsed = parseListIndexCompareSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, printLineIdx, collapseBefore } = buildListIndexComparePseudocode(parsed.spec)
    const steps = computeListIndexCompareSteps(parsed.spec, printLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `인덱스 비교 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 할당(=) vs copy() vs deepcopy() — 참조 공유 (```list-copy-ref) ──
// SVG 연결선 대신, 같은 boxId를 가진 칸은 같은 색+배지로 표시해서 "같은 상자"임을 전달한다.

export type ListCopyRefMode = "assign" | "shallow" | "deep"
export type ListCopyRefSpec = { title?: string; mode: ListCopyRefMode; flat: ListValue[]; nested?: ListValue[] }

const FLAT_LEN_MIN = 1
const FLAT_LEN_MAX = 5
const NESTED_LEN_MIN = 1
const NESTED_LEN_MAX = 4

export type ListCopyRefValidationResult =
  | { ok: true;  spec: ListCopyRefSpec }
  | { ok: false; error: string }

export function parseListCopyRefSpec(raw: string): ListCopyRefValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "참조/복사 데이터 형식이 올바르지 않습니다." }
  }

  const { mode, flat, nested, title } = parsed

  if (mode !== "assign" && mode !== "shallow" && mode !== "deep") {
    return { ok: false, error: `mode는 "assign", "shallow", "deep" 중 하나여야 합니다.` }
  }
  if (!Array.isArray(flat) || flat.length < FLAT_LEN_MIN || flat.length > FLAT_LEN_MAX || !flat.every(isListValue)) {
    return { ok: false, error: `flat은 길이 ${FLAT_LEN_MIN}~${FLAT_LEN_MAX}의 배열이어야 합니다.` }
  }
  if (nested !== undefined) {
    if (!Array.isArray(nested) || nested.length < NESTED_LEN_MIN || nested.length > NESTED_LEN_MAX || !nested.every(isListValue)) {
      return { ok: false, error: `nested는 길이 ${NESTED_LEN_MIN}~${NESTED_LEN_MAX}의 배열이어야 합니다.` }
    }
  }
  if (mode === "deep" && !nested) {
    return { ok: false, error: `mode가 "deep"이면 nested가 필요합니다 (중첩 리스트가 없으면 deepcopy의 효과를 보여줄 수 없습니다).` }
  }

  return { ok: true, spec: { title, mode, flat, nested } }
}

export type Cell = { kind: "value"; value: ListValue } | { kind: "nested"; boxId: string }

export type ListCopyRefStep = {
  aOuter:      Cell[]
  bOuter:      Cell[] | null
  nestedBoxes: Record<string, ListValue[]>
  aBoxId:      string
  bBoxId:      string | null
  codeLines:   number[]
  caption:     string
}

function cellsToDisplayList(cells: Cell[], nestedBoxes: Record<string, ListValue[]>): string {
  return `[${cells.map(c => c.kind === "value" ? pyLit(c.value) : pyListLit(nestedBoxes[c.boxId])).join(", ")}]`
}

function mkStep(aOuter: Cell[], bOuter: Cell[] | null, nestedBoxes: Record<string, ListValue[]>, aBoxId: string, bBoxId: string | null, codeLines: number[], caption: string): ListCopyRefStep {
  return { aOuter: aOuter.map(c => ({ ...c })), bOuter: bOuter ? bOuter.map(c => ({ ...c })) : null, nestedBoxes: { ...nestedBoxes }, aBoxId, bBoxId, codeLines, caption }
}

function buildAssignPseudocode(spec: ListCopyRefSpec) {
  const lines = [
    `my_list = ${pyListLit(spec.flat)}`,
    "ref_list = my_list",
    "my_list[0] = 99",
    "",
    "print(ref_list)",
  ]
  const lineIdx = { INIT: 0, ASSIGN: 1, MUTATE: 2, PRINT: 4 }
  return { lines, lineIdx, collapseBefore: 0 }
}

function computeAssignSteps(spec: ListCopyRefSpec, lineIdx: ReturnType<typeof buildAssignPseudocode>["lineIdx"]): ListCopyRefStep[] {
  const steps: ListCopyRefStep[] = []
  const boxId = "L1"
  let aOuter: Cell[] = spec.flat.map(v => ({ kind: "value", value: v }))
  const nestedBoxes: Record<string, ListValue[]> = {}

  steps.push(mkStep(aOuter, null, nestedBoxes, boxId, null, [lineIdx.INIT], `my_list = ${pyListLit(spec.flat)}를 만듭니다.`))
  steps.push(mkStep(aOuter, aOuter, nestedBoxes, boxId, boxId, [lineIdx.ASSIGN], "ref_list = my_list → 새 리스트를 만들지 않고 같은 리스트를 가리킵니다."))

  aOuter = [...aOuter]
  aOuter[0] = { kind: "value", value: 99 }
  steps.push(mkStep(aOuter, aOuter, nestedBoxes, boxId, boxId, [lineIdx.MUTATE], "my_list[0] = 99로 바꿉니다. 같은 상자이므로 ref_list도 함께 바뀝니다."))
  steps.push(mkStep(aOuter, aOuter, nestedBoxes, boxId, boxId, [lineIdx.PRINT], `ref_list를 출력합니다 → ${cellsToDisplayList(aOuter, nestedBoxes)} (my_list와 동일)`))

  return steps
}

function buildShallowPseudocode(spec: ListCopyRefSpec) {
  const initLit = spec.nested
    ? `[${[...spec.flat.map(pyLit), pyListLit(spec.nested)].join(", ")}]`
    : pyListLit(spec.flat)
  const lines: string[] = [`my_list = ${initLit}`, "copy_list = my_list.copy()"]
  const lineIdx: { INIT: number; COPY: number; MUTATE_OUTER: number; MUTATE_NESTED?: number; PRINT: number } =
    { INIT: 0, COPY: 1, MUTATE_OUTER: 0, PRINT: 0 }

  if (spec.nested) {
    lines.push("copy_list[0] = 99")
    lineIdx.MUTATE_OUTER = lines.length - 1
    lines.push(`copy_list[${spec.flat.length}][0] = 99`)
    lineIdx.MUTATE_NESTED = lines.length - 1
  } else {
    lines.push("my_list[0] = 99")
    lineIdx.MUTATE_OUTER = lines.length - 1
  }
  lines.push("")
  lines.push(spec.nested ? "print(my_list)" : "print(copy_list)")
  lineIdx.PRINT = lines.length - 1

  return { lines, lineIdx, collapseBefore: 0 }
}

function computeShallowSteps(spec: ListCopyRefSpec, lineIdx: ReturnType<typeof buildShallowPseudocode>["lineIdx"]): ListCopyRefStep[] {
  const steps: ListCopyRefStep[] = []
  const aBoxId = "L1", bBoxId = "L2"
  let aOuter: Cell[] = spec.flat.map(v => ({ kind: "value", value: v }))
  const nestedBoxes: Record<string, ListValue[]> = {}
  let nestedBoxId: string | null = null

  if (spec.nested) {
    nestedBoxId = "N1"
    nestedBoxes[nestedBoxId] = [...spec.nested]
    aOuter = [...aOuter, { kind: "nested", boxId: nestedBoxId }]
  }

  steps.push(mkStep(aOuter, null, nestedBoxes, aBoxId, null, [lineIdx.INIT], `my_list = ${cellsToDisplayList(aOuter, nestedBoxes)}를 만듭니다.`))

  let bOuter: Cell[] = aOuter.map(c => ({ ...c }))
  steps.push(mkStep(aOuter, bOuter, nestedBoxes, aBoxId, bBoxId, [lineIdx.COPY],
    spec.nested
      ? "copy_list = my_list.copy() → 바깥쪽은 새로 만들어지지만, 안쪽 리스트는 같은 것을 가리킵니다(얕은 복사)."
      : "copy_list = my_list.copy() → 새 리스트를 만듭니다."))

  if (spec.nested && nestedBoxId) {
    bOuter = [...bOuter]
    bOuter[0] = { kind: "value", value: 99 }
    steps.push(mkStep(aOuter, bOuter, nestedBoxes, aBoxId, bBoxId, [lineIdx.MUTATE_OUTER!], "copy_list[0] = 99 → 바깥쪽 값 변경, my_list엔 영향 없습니다."))

    const nb = { ...nestedBoxes }
    nb[nestedBoxId] = [...nb[nestedBoxId]]
    nb[nestedBoxId][0] = 99
    steps.push(mkStep(aOuter, bOuter, nb, aBoxId, bBoxId, [lineIdx.MUTATE_NESTED!], "copy_list[마지막 자리][0] = 99 → 안쪽 리스트를 공유하므로 my_list도 함께 바뀝니다!"))
    steps.push(mkStep(aOuter, bOuter, nb, aBoxId, bBoxId, [lineIdx.PRINT], `my_list를 출력합니다 → ${cellsToDisplayList(aOuter, nb)} (안쪽 값은 바뀜)`))
  } else {
    aOuter = [...aOuter]
    aOuter[0] = { kind: "value", value: 99 }
    steps.push(mkStep(aOuter, bOuter, nestedBoxes, aBoxId, bBoxId, [lineIdx.MUTATE_OUTER], "my_list[0] = 99 → copy_list는 영향 없습니다(다른 상자)."))
    steps.push(mkStep(aOuter, bOuter, nestedBoxes, aBoxId, bBoxId, [lineIdx.PRINT], `copy_list를 출력합니다 → ${cellsToDisplayList(bOuter, nestedBoxes)} (바뀌지 않음)`))
  }

  return steps
}

function buildDeepPseudocode(spec: ListCopyRefSpec) {
  const initLit = `[${[...spec.flat.map(pyLit), pyListLit(spec.nested!)].join(", ")}]`
  const lines = [
    "import copy",
    "",
    `my_list = ${initLit}`,
    "deep_copy_list = copy.deepcopy(my_list)",
    `deep_copy_list[${spec.flat.length}][0] = 99`,
    "",
    "print(my_list)",
    "print(deep_copy_list)",
  ]
  const lineIdx = { INIT: 2, DEEPCOPY: 3, MUTATE: 4, PRINT_A: 6, PRINT_B: 7 }
  return { lines, lineIdx, collapseBefore: 0 }
}

function computeDeepSteps(spec: ListCopyRefSpec, lineIdx: ReturnType<typeof buildDeepPseudocode>["lineIdx"]): ListCopyRefStep[] {
  const steps: ListCopyRefStep[] = []
  const aBoxId = "L1", bBoxId = "L2"
  const aNestedId = "N1", bNestedId = "N2"
  const nestedBoxes: Record<string, ListValue[]> = { [aNestedId]: [...spec.nested!] }
  const aOuter: Cell[] = [...spec.flat.map(v => ({ kind: "value", value: v } as Cell)), { kind: "nested", boxId: aNestedId }]

  steps.push(mkStep(aOuter, null, nestedBoxes, aBoxId, null, [lineIdx.INIT], `my_list = ${cellsToDisplayList(aOuter, nestedBoxes)}를 만듭니다.`))

  nestedBoxes[bNestedId] = [...spec.nested!]
  const bOuter: Cell[] = [...spec.flat.map(v => ({ kind: "value", value: v } as Cell)), { kind: "nested", boxId: bNestedId }]
  steps.push(mkStep(aOuter, bOuter, nestedBoxes, aBoxId, bBoxId, [lineIdx.DEEPCOPY], "deep_copy_list = copy.deepcopy(my_list) → 안쪽까지 전부 새로 복사합니다."))

  const nb = { ...nestedBoxes }
  nb[bNestedId] = [...nb[bNestedId]]
  nb[bNestedId][0] = 99
  steps.push(mkStep(aOuter, bOuter, nb, aBoxId, bBoxId, [lineIdx.MUTATE], "deep_copy_list[마지막 자리][0] = 99 → 독립적인 안쪽 리스트라 my_list는 영향 없습니다."))
  steps.push(mkStep(aOuter, bOuter, nb, aBoxId, bBoxId, [lineIdx.PRINT_A], `my_list를 출력합니다 → ${cellsToDisplayList(aOuter, nb)} (안 바뀜)`))
  steps.push(mkStep(aOuter, bOuter, nb, aBoxId, bBoxId, [lineIdx.PRINT_B], `deep_copy_list를 출력합니다 → ${cellsToDisplayList(bOuter, nb)}`))

  return steps
}

export type ListCopyRefVizResult =
  | { ok: true;  spec: ListCopyRefSpec; steps: ListCopyRefStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildListCopyRefVisualization(raw: string): ListCopyRefVizResult {
  const parsed = parseListCopyRefSpec(raw)
  if (!parsed.ok) return parsed
  try {
    if (parsed.spec.mode === "assign") {
      const pseudo = buildAssignPseudocode(parsed.spec)
      const steps = computeAssignSteps(parsed.spec, pseudo.lineIdx)
      return { ok: true, spec: parsed.spec, steps, pseudocode: pseudo.lines, codeCollapseBefore: pseudo.collapseBefore }
    }
    if (parsed.spec.mode === "shallow") {
      const pseudo = buildShallowPseudocode(parsed.spec)
      const steps = computeShallowSteps(parsed.spec, pseudo.lineIdx)
      return { ok: true, spec: parsed.spec, steps, pseudocode: pseudo.lines, codeCollapseBefore: pseudo.collapseBefore }
    }
    const pseudo = buildDeepPseudocode(parsed.spec)
    const steps = computeDeepSteps(parsed.spec, pseudo.lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: pseudo.lines, codeCollapseBefore: pseudo.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `참조/복사 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
