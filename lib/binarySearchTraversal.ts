// 학습자료 "7단계. 이분탐색" 챕터 본문의 ```binary-search / ```parametric-search /
// ```binary-search-recursive / ```bisect-search 코드펜스에 들어가는 JSON을 파싱/검증하고,
// 실제 코드와 동일한 순서로 스텝을 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.
// lib/graphTraversal.ts / lib/gridTraversal.ts와는 독립된 도메인(1차원 배열/범위)이라
// 별도 파일로 분리한다.

const ARR_LEN_MIN = 1
const ARR_LEN_MAX = 20
const VALUES_LEN_MIN = 1
const VALUES_LEN_MAX = 10

function isSortedAscending(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[i - 1]) return false
  return true
}

// ── 배열 이분탐색 (```binary-search) & 재귀 이분탐색 (```binary-search-recursive) 공용 스펙 ──

export type BinarySearchSpec = { title?: string; array: number[]; target: number }

export type BinarySearchValidationResult =
  | { ok: true;  spec: BinarySearchSpec }
  | { ok: false; error: string }

export function parseBinarySearchSpec(raw: string): BinarySearchValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "이분탐색 데이터 형식이 올바르지 않습니다." }
  }

  const { array, target, title } = parsed

  if (!Array.isArray(array) || array.length < ARR_LEN_MIN || array.length > ARR_LEN_MAX || !array.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: `array는 길이 ${ARR_LEN_MIN}~${ARR_LEN_MAX}의 정수 배열이어야 합니다.` }
  }
  if (!isSortedAscending(array)) {
    return { ok: false, error: "array는 오름차순으로 정렬되어 있어야 합니다 (이분탐색의 전제 조건)." }
  }
  if (!Number.isInteger(target)) {
    return { ok: false, error: "target은 정수여야 합니다." }
  }

  return { ok: true, spec: { title, array, target } }
}

function buildBinarySearchPseudocode(spec: BinarySearchSpec) {
  const contextLines = [`arr = [${spec.array.join(", ")}]`, `target = ${spec.target}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "def binary_search(arr, target):",
    "    left, right = 0, len(arr) - 1",
    "",
    "    while left <= right:",
    "        mid = (left + right) // 2",
    "",
    "        if arr[mid] == target:",
    "            return mid",
    "        elif arr[mid] < target:",
    "            left = mid + 1",
    "        else:",
    "            right = mid - 1",
    "",
    "    return -1",
  ]
  const offset = contextLines.length + 1   // +1: 컨텍스트와 본문 사이 빈 줄
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    INIT:             offset + 1,
    LOOP:             offset + 3,
    CALC_MID:         offset + 4,
    CHECK_EQ:         offset + 6,
    RETURN_FOUND:     offset + 7,
    CHECK_LT:         offset + 8,
    MOVE_LEFT:        offset + 9,
    MOVE_RIGHT:       offset + 11,
    RETURN_NOT_FOUND: offset + 13,
  }
  return { lines, lineIdx, collapseBefore }
}

export type BinarySearchStep = {
  left: number; right: number; mid: number | null
  foundIndex: number | null   // 최종 성공 스텝에서만 값 설정
  codeLines: number[]         // 항상 정확히 한 줄만 담는다
  caption: string
}

function computeBinarySearchSteps(spec: BinarySearchSpec, lineIdx: ReturnType<typeof buildBinarySearchPseudocode>["lineIdx"]): BinarySearchStep[] {
  const { array, target } = spec
  const steps: BinarySearchStep[] = []
  let left = 0, right = array.length - 1

  function pushStep(partial: Pick<BinarySearchStep, "codeLines" | "caption"> & Partial<Pick<BinarySearchStep, "mid" | "foundIndex">>) {
    steps.push({ left, right, mid: partial.mid ?? null, foundIndex: partial.foundIndex ?? null, codeLines: partial.codeLines, caption: partial.caption })
  }

  pushStep({ codeLines: [lineIdx.INIT], caption: `left=0, right=${right}로 초기화합니다.` })

  while (left <= right) {
    pushStep({ codeLines: [lineIdx.LOOP], caption: `탐색 범위 [${left}, ${right}]가 남아있는 동안 반복합니다.` })

    const mid = Math.floor((left + right) / 2)
    pushStep({ mid, codeLines: [lineIdx.CALC_MID], caption: `mid = (${left}+${right})//2 = ${mid}, arr[mid] = ${array[mid]}` })

    if (array[mid] === target) {
      pushStep({ mid, codeLines: [lineIdx.CHECK_EQ], caption: `arr[mid](${array[mid]}) == target(${target})? 참` })
      pushStep({ mid, foundIndex: mid, codeLines: [lineIdx.RETURN_FOUND], caption: `찾았습니다! 인덱스 ${mid}를 반환합니다.` })
      return steps
    }
    pushStep({ mid, codeLines: [lineIdx.CHECK_EQ], caption: `arr[mid](${array[mid]}) == target(${target})? 거짓` })

    if (array[mid] < target) {
      pushStep({ mid, codeLines: [lineIdx.CHECK_LT], caption: `arr[mid](${array[mid]}) < target(${target})? 참` })
      left = mid + 1
      pushStep({ mid, codeLines: [lineIdx.MOVE_LEFT], caption: `target이 더 크므로 오른쪽 절반을 탐색합니다: left = ${left}` })
    } else {
      pushStep({ mid, codeLines: [lineIdx.CHECK_LT], caption: `arr[mid](${array[mid]}) < target(${target})? 거짓` })
      right = mid - 1
      pushStep({ mid, codeLines: [lineIdx.MOVE_RIGHT], caption: `target이 더 작으므로 왼쪽 절반을 탐색합니다: right = ${right}` })
    }
  }

  pushStep({ codeLines: [lineIdx.RETURN_NOT_FOUND], caption: `left(${left}) > right(${right})가 되어 탐색을 마칩니다. target을 찾지 못해 -1을 반환합니다.` })
  return steps
}

export type BinaryVizResult =
  | { ok: true;  spec: BinarySearchSpec; steps: BinarySearchStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildBinarySearchVisualization(raw: string): BinaryVizResult {
  const parsed = parseBinarySearchSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildBinarySearchPseudocode(parsed.spec)
    const steps = computeBinarySearchSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `이분탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 재귀 이분탐색 (```binary-search-recursive) — BinarySearchSpec 재사용 ──

function buildBinarySearchRecursivePseudocode(spec: BinarySearchSpec) {
  const contextLines = [`arr = [${spec.array.join(", ")}]`, `target = ${spec.target}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "def binary_search_recursive(arr, target, left, right):",
    "    if left > right:",
    "        return -1",
    "",
    "    mid = (left + right) // 2",
    "",
    "    if arr[mid] == target:",
    "        return mid",
    "    elif arr[mid] < target:",
    "        return binary_search_recursive(arr, target, mid + 1, right)",
    "    else:",
    "        return binary_search_recursive(arr, target, left, mid - 1)",
    "",
    "binary_search_recursive(arr, target, 0, len(arr) - 1)",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    BASE_CHECK:   offset + 1,
    BASE_RETURN:  offset + 2,
    CALC_MID:     offset + 4,
    CHECK_EQ:     offset + 6,
    RETURN_FOUND: offset + 7,
    CHECK_LT:     offset + 8,
    CALL_RIGHT:   offset + 9,
    CALL_LEFT:    offset + 11,
    DRIVER_CALL:  offset + 13,
  }
  return { lines, lineIdx, collapseBefore }
}

export type BinarySearchRecursiveFrame = { left: number; right: number; mid: number | null }

export type BinarySearchRecursiveStep = {
  callStack:   BinarySearchRecursiveFrame[]   // [0]=최초 호출 ... 마지막=현재 프레임(top)
  foundIndex:  number | null
  codeLines:   number[]
  caption:     string
}

// JS 자체 재귀로 Python의 재귀를 그대로 모사한다 (기존 computeDfsRecursiveSteps와 동일한 기법).
function computeBinarySearchRecursiveSteps(spec: BinarySearchSpec, lineIdx: ReturnType<typeof buildBinarySearchRecursivePseudocode>["lineIdx"]): BinarySearchRecursiveStep[] {
  const { array, target } = spec
  const steps: BinarySearchRecursiveStep[] = []
  const callStack: BinarySearchRecursiveFrame[] = []
  let foundIndex: number | null = null

  function pushStep(codeLines: number[], caption: string) {
    steps.push({ callStack: callStack.map(f => ({ ...f })), foundIndex, codeLines, caption })
  }

  pushStep([lineIdx.DRIVER_CALL], `binary_search_recursive(arr, target, 0, ${array.length - 1})를 호출합니다.`)

  function search(left: number, right: number) {
    callStack.push({ left, right, mid: null })

    if (left > right) {
      pushStep([lineIdx.BASE_CHECK], `left(${left}) > right(${right})이므로 기저 조건에 해당합니다.`)
      pushStep([lineIdx.BASE_RETURN], `-1을 반환합니다.`)
    } else {
      pushStep([lineIdx.BASE_CHECK], `left(${left}) > right(${right})? 거짓 — 계속 탐색합니다.`)

      const mid = Math.floor((left + right) / 2)
      callStack[callStack.length - 1].mid = mid
      pushStep([lineIdx.CALC_MID], `mid = (${left}+${right})//2 = ${mid}, arr[mid] = ${array[mid]}`)

      if (array[mid] === target) {
        pushStep([lineIdx.CHECK_EQ], `arr[mid](${array[mid]}) == target(${target})? 참`)
        foundIndex = mid
        pushStep([lineIdx.RETURN_FOUND], `찾았습니다! 인덱스 ${mid}를 반환합니다.`)
      } else {
        pushStep([lineIdx.CHECK_EQ], `arr[mid](${array[mid]}) == target(${target})? 거짓`)
        if (array[mid] < target) {
          pushStep([lineIdx.CHECK_LT], `arr[mid](${array[mid]}) < target(${target})? 참`)
          pushStep([lineIdx.CALL_RIGHT], `binary_search_recursive(arr, target, ${mid + 1}, ${right})를 재귀 호출합니다.`)
          search(mid + 1, right)
        } else {
          pushStep([lineIdx.CHECK_LT], `arr[mid](${array[mid]}) < target(${target})? 거짓`)
          pushStep([lineIdx.CALL_LEFT], `binary_search_recursive(arr, target, ${left}, ${mid - 1})를 재귀 호출합니다.`)
          search(left, mid - 1)
        }
      }
    }

    callStack.pop()
  }

  search(0, array.length - 1)

  pushStep([lineIdx.DRIVER_CALL], foundIndex !== null
    ? `모든 재귀 호출이 반환되어 탐색을 마칩니다. 인덱스 ${foundIndex}를 찾았습니다.`
    : `모든 재귀 호출이 반환되어 탐색을 마칩니다. target을 찾지 못했습니다.`)

  return steps
}

export type BinaryRecursiveVizResult =
  | { ok: true;  spec: BinarySearchSpec; steps: BinarySearchRecursiveStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildBinarySearchRecursiveVisualization(raw: string): BinaryRecursiveVizResult {
  const parsed = parseBinarySearchSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildBinarySearchRecursivePseudocode(parsed.spec)
    const steps = computeBinarySearchRecursiveSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `재귀 이분탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 파라메트릭 서치 (```parametric-search, "나무 자르기") ──
// 문서 원문의 answer/ans 변수명 불일치(오타로 추정 — 그대로 실행하면 NameError)는
// 사용자 확인 후 ans로 통일해서 표시한다(실제 동작하는 코드로 보여줌).

export type ParametricSearchSpec = { title?: string; values: number[]; m: number }

export type ParametricSearchValidationResult =
  | { ok: true;  spec: ParametricSearchSpec }
  | { ok: false; error: string }

export function parseParametricSearchSpec(raw: string): ParametricSearchValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "파라메트릭 서치 데이터 형식이 올바르지 않습니다." }
  }

  const { values, m, title } = parsed

  if (!Array.isArray(values) || values.length < VALUES_LEN_MIN || values.length > VALUES_LEN_MAX || !values.every((v: any) => Number.isInteger(v) && v > 0)) {
    return { ok: false, error: `values는 길이 ${VALUES_LEN_MIN}~${VALUES_LEN_MAX}의 양의 정수 배열이어야 합니다.` }
  }
  if (!Number.isInteger(m) || m <= 0) {
    return { ok: false, error: "m은 양의 정수여야 합니다." }
  }

  return { ok: true, spec: { title, values, m } }
}

function buildParametricSearchPseudocode(spec: ParametricSearchSpec) {
  const contextLines = [`arr = [${spec.values.join(", ")}]`, `m = ${spec.m}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "def get(t, h, m):",
    "    s = 0",
    "    for i in t:",
    "        if i > h:",
    "            s += i - h",
    "    return s >= m",
    "",
    "",
    "def func(arr, m):",
    "    left, right = 0, max(arr)",
    "    ans = 0",
    "",
    "    while left <= right:",
    "        mid = (left + right) // 2",
    "",
    "        if get(arr, mid, m):",
    "            ans = mid",
    "            left = mid + 1",
    "        else:",
    "            right = mid - 1",
    "",
    "    return ans",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    GET_INIT_S: offset + 1,
    GET_FOR:    offset + 2,
    GET_CHECK:  offset + 3,
    GET_ADD:    offset + 4,
    GET_RETURN: offset + 5,
    FUNC_INIT:  offset + 9,
    ANS_INIT:   offset + 10,
    LOOP:       offset + 12,
    CALC_MID:   offset + 13,
    GET_CALL:   offset + 15,
    SET_ANS:    offset + 16,
    MOVE_LEFT:  offset + 17,
    MOVE_RIGHT: offset + 19,
    RETURN:     offset + 21,
  }
  return { lines, lineIdx, collapseBefore }
}

export type ParametricSearchStep = {
  left: number; right: number; mid: number | null; ans: number
  activeValueIndex: number | null   // get() 내부 for문이 지금 확인 중인 values의 인덱스
  cutAmounts: number[]              // 이번 mid 평가에서 각 값이 잘린 양 (매 스텝 스냅샷)
  codeLines: number[]
  caption: string
}

function computeParametricSearchSteps(spec: ParametricSearchSpec, lineIdx: ReturnType<typeof buildParametricSearchPseudocode>["lineIdx"]): ParametricSearchStep[] {
  const { values, m } = spec
  const steps: ParametricSearchStep[] = []
  let left = 0, right = Math.max(...values), ans = 0
  let cutAmounts = values.map(() => 0)

  function pushStep(partial: Pick<ParametricSearchStep, "codeLines" | "caption"> & Partial<Pick<ParametricSearchStep, "mid" | "activeValueIndex">>) {
    steps.push({
      left, right, ans,
      mid: partial.mid ?? null,
      activeValueIndex: partial.activeValueIndex ?? null,
      cutAmounts: [...cutAmounts],
      codeLines: partial.codeLines, caption: partial.caption,
    })
  }

  pushStep({ codeLines: [lineIdx.FUNC_INIT], caption: `left=0, right=max(arr)=${right}로 초기화합니다.` })
  pushStep({ codeLines: [lineIdx.ANS_INIT], caption: `ans=0으로 초기화합니다.` })

  while (left <= right) {
    pushStep({ codeLines: [lineIdx.LOOP], caption: `탐색 범위 [${left}, ${right}]가 남아있는 동안 반복합니다.` })

    const mid = Math.floor((left + right) / 2)
    pushStep({ mid, codeLines: [lineIdx.CALC_MID], caption: `mid = (${left}+${right})//2 = ${mid} (자르는 높이 후보)` })

    cutAmounts = values.map(() => 0)
    for (let i = 0; i < values.length; i++) {
      pushStep({ mid, activeValueIndex: i, codeLines: [lineIdx.GET_FOR], caption: `${i + 1}번째 값 ${values[i]}을(를) 확인합니다.` })
      const cut = values[i] > mid
      pushStep({ mid, activeValueIndex: i, codeLines: [lineIdx.GET_CHECK], caption: `${values[i]} > ${mid}? ${cut ? "참" : "거짓"}` })
      if (cut) {
        cutAmounts[i] = values[i] - mid
        pushStep({ mid, activeValueIndex: i, codeLines: [lineIdx.GET_ADD], caption: `s += ${values[i]} - ${mid} → 누적 ${cutAmounts[i]}만큼 잘립니다.` })
      }
    }
    const total = cutAmounts.reduce((a, b) => a + b, 0)
    const satisfied = total >= m
    pushStep({ mid, codeLines: [lineIdx.GET_RETURN], caption: `합계 ${total} >= m(${m})? ${satisfied ? "참" : "거짓"}` })

    if (satisfied) {
      ans = mid
      pushStep({ mid, codeLines: [lineIdx.SET_ANS], caption: `조건을 만족하므로 ans = ${mid}로 갱신합니다.` })
      left = mid + 1
      pushStep({ mid, codeLines: [lineIdx.MOVE_LEFT], caption: `더 큰 높이도 가능한지 확인하기 위해 left = ${left}로 이동합니다.` })
    } else {
      right = mid - 1
      pushStep({ mid, codeLines: [lineIdx.MOVE_RIGHT], caption: `조건을 만족하지 않으므로 right = ${right}로 이동합니다.` })
    }
  }

  pushStep({ codeLines: [lineIdx.RETURN], caption: `left(${left}) > right(${right})가 되어 탐색을 마칩니다. 최종 정답 ans=${ans}를 반환합니다.` })
  return steps
}

export type ParametricVizResult =
  | { ok: true;  spec: ParametricSearchSpec; steps: ParametricSearchStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildParametricSearchVisualization(raw: string): ParametricVizResult {
  const parsed = parseParametricSearchSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildParametricSearchPseudocode(parsed.spec)
    const steps = computeParametricSearchSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `파라메트릭 서치 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── bisect_left 개념 구현 (```bisect-search) ──
// bisect 모듈은 문서에서 블랙박스로 다뤄져 내부 코드가 없다. 사용자 확인 후,
// "개념적 구현"이라고 코드 첫 줄에 명시적으로 라벨링한 코드를 보여주기로 했다.

export type BisectSearchSpec = { title?: string; array: number[]; x: number }

export type BisectSearchValidationResult =
  | { ok: true;  spec: BisectSearchSpec }
  | { ok: false; error: string }

export function parseBisectSearchSpec(raw: string): BisectSearchValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "bisect 데이터 형식이 올바르지 않습니다." }
  }

  const { array, x, title } = parsed

  if (!Array.isArray(array) || array.length < ARR_LEN_MIN || array.length > ARR_LEN_MAX || !array.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: `array는 길이 ${ARR_LEN_MIN}~${ARR_LEN_MAX}의 정수 배열이어야 합니다.` }
  }
  if (!isSortedAscending(array)) {
    return { ok: false, error: "array는 오름차순으로 정렬되어 있어야 합니다 (이분탐색의 전제 조건)." }
  }
  if (!Number.isInteger(x)) {
    return { ok: false, error: "x는 정수여야 합니다." }
  }

  return { ok: true, spec: { title, array, x } }
}

function buildBisectSearchPseudocode(spec: BisectSearchSpec) {
  const contextLines = [`arr = [${spec.array.join(", ")}]`, `x = ${spec.x}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "# bisect.bisect_left(arr, x)가 내부적으로 하는 일 (개념적 구현)",
    "def bisect_left(arr, x):",
    "    left, right = 0, len(arr)",
    "    while left < right:",
    "        mid = (left + right) // 2",
    "        if arr[mid] < x:",
    "            left = mid + 1",
    "        else:",
    "            right = mid",
    "    return left",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    INIT:       offset + 2,
    LOOP:       offset + 3,
    CALC_MID:   offset + 4,
    CHECK_LT:   offset + 5,
    MOVE_LEFT:  offset + 6,
    MOVE_RIGHT: offset + 8,
    RETURN:     offset + 9,
  }
  return { lines, lineIdx, collapseBefore }
}

export type BisectSearchStep = {
  left: number; right: number; mid: number | null
  resultIndex: number | null   // 종료 스텝에서만 값 설정
  codeLines: number[]
  caption: string
}

function computeBisectSearchSteps(spec: BisectSearchSpec, lineIdx: ReturnType<typeof buildBisectSearchPseudocode>["lineIdx"]): BisectSearchStep[] {
  const { array, x } = spec
  const steps: BisectSearchStep[] = []
  let left = 0, right = array.length

  function pushStep(partial: Pick<BisectSearchStep, "codeLines" | "caption"> & Partial<Pick<BisectSearchStep, "mid" | "resultIndex">>) {
    steps.push({ left, right, mid: partial.mid ?? null, resultIndex: partial.resultIndex ?? null, codeLines: partial.codeLines, caption: partial.caption })
  }

  pushStep({ codeLines: [lineIdx.INIT], caption: `left=0, right=len(arr)=${right}로 초기화합니다.` })

  while (left < right) {
    pushStep({ codeLines: [lineIdx.LOOP], caption: `left(${left}) < right(${right})인 동안 반복합니다.` })

    const mid = Math.floor((left + right) / 2)
    pushStep({ mid, codeLines: [lineIdx.CALC_MID], caption: `mid = (${left}+${right})//2 = ${mid}, arr[mid] = ${array[mid]}` })

    const lt = array[mid] < x
    pushStep({ mid, codeLines: [lineIdx.CHECK_LT], caption: `arr[mid](${array[mid]}) < x(${x})? ${lt ? "참" : "거짓"}` })

    if (lt) {
      left = mid + 1
      pushStep({ mid, codeLines: [lineIdx.MOVE_LEFT], caption: `arr[mid]가 x보다 작으므로 left = ${left}로 이동합니다.` })
    } else {
      right = mid
      pushStep({ mid, codeLines: [lineIdx.MOVE_RIGHT], caption: `arr[mid]가 x 이상이므로 right = ${right}로 이동합니다.` })
    }
  }

  pushStep({
    resultIndex: left,
    codeLines: [lineIdx.RETURN],
    caption: left < array.length
      ? `left(${left})를 반환합니다 — x(${x})를 삽입할 가장 왼쪽 위치는 인덱스 ${left}입니다. (bisect_right는 arr[mid] < x 조건을 arr[mid] <= x로 바꾸면 됩니다)`
      : `left(${left})를 반환합니다 — x(${x})는 배열의 모든 값보다 커서 배열 끝(인덱스 ${left})에 삽입해야 합니다.`,
  })
  return steps
}

export type BisectVizResult =
  | { ok: true;  spec: BisectSearchSpec; steps: BisectSearchStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildBisectSearchVisualization(raw: string): BisectVizResult {
  const parsed = parseBisectSearchSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildBisectSearchPseudocode(parsed.spec)
    const steps = computeBisectSearchSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `bisect_left 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
