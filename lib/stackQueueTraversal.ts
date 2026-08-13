// 학습자료 "3단계. 스택 / 큐" 챕터 본문의 ```stack-queue-basic / ```stack-parens /
// ```monotonic-stack 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한
// 순서로 스텝을 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.

// ── 스택/큐 기본 연산 (```stack-queue-basic) ──

export type StackQueueOp = { type: "push" | "pop"; value?: number }
export type StackQueueSpec = { title?: string; mode: "stack" | "queue"; operations: StackQueueOp[] }

const OPS_LEN_MIN = 1
const OPS_LEN_MAX = 15

export type StackQueueValidationResult =
  | { ok: true;  spec: StackQueueSpec }
  | { ok: false; error: string }

export function parseStackQueueSpec(raw: string): StackQueueValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "스택/큐 데이터 형식이 올바르지 않습니다." }
  }

  const { mode, operations, title } = parsed

  if (mode !== "stack" && mode !== "queue") {
    return { ok: false, error: `mode는 "stack" 또는 "queue"여야 합니다.` }
  }
  if (!Array.isArray(operations) || operations.length < OPS_LEN_MIN || operations.length > OPS_LEN_MAX) {
    return { ok: false, error: `operations는 길이 ${OPS_LEN_MIN}~${OPS_LEN_MAX}의 배열이어야 합니다.` }
  }

  let size = 0
  for (const op of operations) {
    if (op?.type === "push") {
      if (!Number.isInteger(op.value)) return { ok: false, error: "push 연산은 정수 value가 필요합니다." }
      size++
    } else if (op?.type === "pop") {
      if (size === 0) return { ok: false, error: "연산 순서 중 빈 상태에서 pop을 시도합니다." }
      size--
    } else {
      return { ok: false, error: `operations의 type은 "push" 또는 "pop"이어야 합니다.` }
    }
  }

  return { ok: true, spec: { title, mode, operations } }
}

function buildStackQueuePseudocode(spec: StackQueueSpec) {
  const varName = spec.mode === "stack" ? "stack" : "queue"
  const popResultName = spec.mode === "stack" ? "top" : "front"
  const lines: string[] = []

  if (spec.mode === "queue") {
    lines.push("from collections import deque")
    lines.push(`${varName} = deque()`)
  } else {
    lines.push(`${varName} = []`)
  }

  const opLineIdx: number[] = []
  for (const op of spec.operations) {
    opLineIdx.push(lines.length)
    if (op.type === "push") {
      lines.push(`${varName}.append(${op.value})`)
    } else {
      const call = spec.mode === "stack" ? `${varName}.pop()` : `${varName}.popleft()`
      lines.push(`${popResultName} = ${call}`)
    }
  }

  return { lines, opLineIdx, collapseBefore: 0 }
}

export type StackQueueStep = {
  container:   number[]        // 현재 상태 스냅샷
  poppedValue: number | null   // 이번 스텝이 pop이면 꺼낸 값
  codeLines:   number[]
  caption:     string
}

function computeStackQueueSteps(spec: StackQueueSpec, opLineIdx: number[]): StackQueueStep[] {
  const steps: StackQueueStep[] = []
  const container: number[] = []

  spec.operations.forEach((op, i) => {
    if (op.type === "push") {
      container.push(op.value!)
      steps.push({
        container: [...container], poppedValue: null, codeLines: [opLineIdx[i]],
        caption: `${op.value}을(를) 넣습니다 → [${container.join(", ")}]`,
      })
    } else {
      const popped = spec.mode === "stack" ? container.pop()! : container.shift()!
      steps.push({
        container: [...container], poppedValue: popped, codeLines: [opLineIdx[i]],
        caption: `${popped}을(를) 꺼냅니다 → [${container.join(", ")}]`,
      })
    }
  })

  return steps
}

export type StackQueueVizResult =
  | { ok: true;  spec: StackQueueSpec; steps: StackQueueStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildStackQueueVisualization(raw: string): StackQueueVizResult {
  const parsed = parseStackQueueSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, opLineIdx, collapseBefore } = buildStackQueuePseudocode(parsed.spec)
    const steps = computeStackQueueSteps(parsed.spec, opLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `스택/큐 연산 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 괄호 유효성 검사 (```stack-parens) ──

export type StackParensSpec = { title?: string; text: string }

const TEXT_LEN_MIN = 1
const TEXT_LEN_MAX = 30

export type StackParensValidationResult =
  | { ok: true;  spec: StackParensSpec }
  | { ok: false; error: string }

export function parseStackParensSpec(raw: string): StackParensValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "괄호 검사 데이터 형식이 올바르지 않습니다." }
  }

  const { text, title } = parsed

  if (typeof text !== "string" || text.length < TEXT_LEN_MIN || text.length > TEXT_LEN_MAX) {
    return { ok: false, error: `text는 길이 ${TEXT_LEN_MIN}~${TEXT_LEN_MAX}의 문자열이어야 합니다.` }
  }

  return { ok: true, spec: { title, text } }
}

function buildStackParensPseudocode(spec: StackParensSpec) {
  const contextLines = [`s = ${JSON.stringify(spec.text)}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "def is_valid(s):",
    "    stack = []",
    "    k = {')': '(', ']': '[', '}': '{'}",
    "    for ch in s:",
    "        if ch in '([{':",
    "            stack.append(ch)",
    "        elif ch in ')]}':",
    "            if not stack or stack[-1] != k[ch]:",
    "                return False",
    "            stack.pop()",
    "    return len(stack) == 0",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    INIT_STACK:     offset + 1,
    INIT_K:         offset + 2,
    FOR:            offset + 3,
    CHECK_OPEN:     offset + 4,
    PUSH:           offset + 5,
    CHECK_CLOSE:    offset + 6,
    CHECK_MISMATCH: offset + 7,
    RETURN_FALSE:   offset + 8,
    POP:            offset + 9,
    RETURN_RESULT:  offset + 10,
  }
  return { lines, lineIdx, collapseBefore }
}

export type StackParensStep = {
  index:  number | null   // 지금 확인 중인 문자 인덱스
  stack:  string[]        // 현재 스택 스냅샷
  result: boolean | null  // 종료 스텝에서만 값 설정
  codeLines: number[]
  caption: string
}

function computeStackParensSteps(spec: StackParensSpec, lineIdx: ReturnType<typeof buildStackParensPseudocode>["lineIdx"]): StackParensStep[] {
  const { text } = spec
  const openers = "([{"
  const closers = ")]}"
  const match: Record<string, string> = { ")": "(", "]": "[", "}": "{" }
  const steps: StackParensStep[] = []
  const stack: string[] = []

  function pushStep(partial: Pick<StackParensStep, "codeLines" | "caption"> & Partial<Pick<StackParensStep, "index" | "result">>) {
    steps.push({ index: partial.index ?? null, stack: [...stack], result: partial.result ?? null, codeLines: partial.codeLines, caption: partial.caption })
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    pushStep({ index: i, codeLines: [lineIdx.FOR], caption: `${i + 1}번째 문자 '${ch}'를 확인합니다.` })

    if (openers.includes(ch)) {
      pushStep({ index: i, codeLines: [lineIdx.CHECK_OPEN], caption: `'${ch}'는 여는 괄호입니다.` })
      stack.push(ch)
      pushStep({ index: i, codeLines: [lineIdx.PUSH], caption: `'${ch}'를 스택에 push합니다 → [${stack.join(", ")}]` })
    } else if (closers.includes(ch)) {
      pushStep({ index: i, codeLines: [lineIdx.CHECK_OPEN], caption: `'${ch}'는 여는 괄호가 아닙니다.` })
      pushStep({ index: i, codeLines: [lineIdx.CHECK_CLOSE], caption: `'${ch}'는 닫는 괄호입니다.` })

      const mismatch = stack.length === 0 || stack[stack.length - 1] !== match[ch]
      pushStep({
        index: i, codeLines: [lineIdx.CHECK_MISMATCH],
        caption: mismatch
          ? (stack.length === 0 ? `스택이 비어있는데 '${ch}'가 나와 짝이 맞지 않습니다.` : `스택 맨 위 '${stack[stack.length - 1]}'가 '${ch}'와 짝이 맞지 않습니다.`)
          : `스택 맨 위 '${stack[stack.length - 1]}'가 '${ch}'와 짝이 맞습니다.`,
      })

      if (mismatch) {
        pushStep({ index: i, result: false, codeLines: [lineIdx.RETURN_FALSE], caption: "짝이 맞지 않아 False를 반환합니다." })
        return steps
      }
      stack.pop()
      pushStep({ index: i, codeLines: [lineIdx.POP], caption: `짝이 맞아 스택에서 꺼냅니다 → [${stack.join(", ")}]` })
    } else {
      pushStep({ index: i, codeLines: [lineIdx.CHECK_OPEN], caption: `'${ch}'는 여는 괄호가 아닙니다.` })
      pushStep({ index: i, codeLines: [lineIdx.CHECK_CLOSE], caption: `'${ch}'는 괄호가 아니므로 건너뜁니다.` })
    }
  }

  const result = stack.length === 0
  pushStep({
    result, codeLines: [lineIdx.RETURN_RESULT],
    caption: result ? "모든 괄호가 짝이 맞아 True를 반환합니다." : `스택에 짝이 안 맞은 괄호(${stack.join(", ")})가 남아 False를 반환합니다.`,
  })
  return steps
}

export type StackParensVizResult =
  | { ok: true;  spec: StackParensSpec; steps: StackParensStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildStackParensVisualization(raw: string): StackParensVizResult {
  const parsed = parseStackParensSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildStackParensPseudocode(parsed.spec)
    const steps = computeStackParensSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `괄호 검사 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 단조 스택 — 오큰수 찾기 (```monotonic-stack) ──

export type MonotonicStackSpec = { title?: string; array: number[] }

const ARRAY_LEN_MIN = 1
const ARRAY_LEN_MAX = 10

export type MonotonicStackValidationResult =
  | { ok: true;  spec: MonotonicStackSpec }
  | { ok: false; error: string }

export function parseMonotonicStackSpec(raw: string): MonotonicStackValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "단조 스택 데이터 형식이 올바르지 않습니다." }
  }

  const { array, title } = parsed

  if (!Array.isArray(array) || array.length < ARRAY_LEN_MIN || array.length > ARRAY_LEN_MAX || !array.every((v: any) => Number.isInteger(v))) {
    return { ok: false, error: `array는 길이 ${ARRAY_LEN_MIN}~${ARRAY_LEN_MAX}의 정수 배열이어야 합니다.` }
  }

  return { ok: true, spec: { title, array } }
}

function buildMonotonicStackPseudocode(spec: MonotonicStackSpec) {
  const contextLines = [`nums = [${spec.array.join(", ")}]`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    "def func(nums):",
    "    n = len(nums)",
    "    result = [-1] * n",
    "    stack = []",
    "",
    "    for i in range(n):",
    "        while stack and nums[stack[-1]] < nums[i]:",
    "            idx = stack.pop()",
    "            result[idx] = nums[i]",
    "        stack.append(i)",
    "",
    "    return result",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    INIT_N:      offset + 1,
    INIT_RESULT: offset + 2,
    INIT_STACK:  offset + 3,
    FOR:         offset + 5,
    WHILE_CHECK: offset + 6,
    POP:         offset + 7,
    SET_RESULT:  offset + 8,
    PUSH:        offset + 9,
    RETURN:      offset + 11,
  }
  return { lines, lineIdx, collapseBefore }
}

export type MonotonicStackStep = {
  i:      number | null   // 바깥 for문 인덱스
  stack:  number[]        // 스택 스냅샷(인덱스 저장)
  result: number[]        // result 배열 스냅샷 (-1은 아직 미정)
  codeLines: number[]
  caption: string
}

function computeMonotonicStackSteps(spec: MonotonicStackSpec, lineIdx: ReturnType<typeof buildMonotonicStackPseudocode>["lineIdx"]): MonotonicStackStep[] {
  const { array } = spec
  const n = array.length
  const steps: MonotonicStackStep[] = []
  const result: number[] = new Array(n).fill(-1)
  const stack: number[] = []

  function pushStep(partial: Pick<MonotonicStackStep, "codeLines" | "caption"> & Partial<Pick<MonotonicStackStep, "i">>) {
    steps.push({ i: partial.i ?? null, stack: [...stack], result: [...result], codeLines: partial.codeLines, caption: partial.caption })
  }

  pushStep({ codeLines: [lineIdx.INIT_N], caption: `n = ${n}` })
  pushStep({ codeLines: [lineIdx.INIT_RESULT], caption: "result를 전부 -1로 초기화합니다." })
  pushStep({ codeLines: [lineIdx.INIT_STACK], caption: "stack = []로 초기화합니다." })

  for (let i = 0; i < n; i++) {
    pushStep({ i, codeLines: [lineIdx.FOR], caption: `nums[${i}]=${array[i]}를 확인합니다.` })

    while (stack.length > 0 && array[stack[stack.length - 1]] < array[i]) {
      pushStep({
        i, codeLines: [lineIdx.WHILE_CHECK],
        caption: `스택 top(인덱스${stack[stack.length - 1]}, 값${array[stack[stack.length - 1]]}) < nums[${i}](${array[i]})? 참`,
      })
      const idx = stack.pop()!
      pushStep({ i, codeLines: [lineIdx.POP], caption: `인덱스 ${idx}를 스택에서 꺼냅니다.` })
      result[idx] = array[i]
      pushStep({ i, codeLines: [lineIdx.SET_RESULT], caption: `result[${idx}] = ${array[i]}로 확정합니다.` })
    }
    pushStep({
      i, codeLines: [lineIdx.WHILE_CHECK],
      caption: stack.length === 0
        ? "스택이 비어 반복을 종료합니다."
        : `스택 top(인덱스${stack[stack.length - 1]}, 값${array[stack[stack.length - 1]]})이 nums[${i}](${array[i]})보다 크거나 같아 반복을 종료합니다.`,
    })

    stack.push(i)
    pushStep({ i, codeLines: [lineIdx.PUSH], caption: `인덱스 ${i}를 스택에 push합니다.` })
  }

  pushStep({ codeLines: [lineIdx.RETURN], caption: `모든 값을 확인했습니다. result = [${result.join(", ")}]를 반환합니다.` })
  return steps
}

export type MonotonicStackVizResult =
  | { ok: true;  spec: MonotonicStackSpec; steps: MonotonicStackStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildMonotonicStackVisualization(raw: string): MonotonicStackVizResult {
  const parsed = parseMonotonicStackSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildMonotonicStackPseudocode(parsed.spec)
    const steps = computeMonotonicStackSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `단조 스택 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
