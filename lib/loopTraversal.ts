// 파이썬가이드 "7장. 반복문" 챕터 본문의 ```for-loop-trace / ```while-loop-trace /
// ```break-continue-compare / ```for-else-flow / ```nested-loop-trace 코드펜스에
// 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리 계산해둔다.
// React에 의존하지 않는 순수 함수 모음.
//
// 조건은 임의의 파이썬 표현식을 eval()하지 않는다. "변수 하나를 비교 연산자+숫자로
// 비교"하거나 "짝수/홀수 판별" 같은 구조화된 스키마로만 표현하고, 실제 판정은 TS로
// 직접 계산한 뒤 파이썬 소스처럼 보이는 텍스트를 만들어 보여준다.

import { IDENTIFIER_RE, PY_KEYWORDS } from "@/lib/basicsTraversal"

function isValidName(name: unknown): name is string {
  return typeof name === "string" && IDENTIFIER_RE.test(name) && !PY_KEYWORDS.has(name)
}

function pyStr(s: string): string {
  return `'${s.replace(/'/g, "\\'")}'`
}

function pyLit(v: string | number): string {
  return typeof v === "string" ? pyStr(v) : String(v)
}

export type CompareOp = ">=" | ">" | "<=" | "<" | "==" | "!="
const COMPARE_OPS = new Set<CompareOp>([">=", ">", "<=", "<", "==", "!="])

function evalCompare(value: number, op: CompareOp, threshold: number): boolean {
  if (op === ">=") return value >= threshold
  if (op === ">")  return value >  threshold
  if (op === "<=") return value <= threshold
  if (op === "<")  return value <  threshold
  if (op === "==") return value === threshold
  return value !== threshold
}

// ── for 반복 실행 흐름 (```for-loop-trace) ──

export type ForLoopAction =
  | { kind: "print" }
  | { kind: "accumulate"; accName: string; accInitial: number; op: "+=" | "-=" }
export type ForLoopSource =
  | { kind: "list"; sourceName: string; items: (string | number)[] }
  | { kind: "range"; start: number; stop: number; step: number }
export type ForLoopTraceSpec = { title?: string; varName: string; source: ForLoopSource; action: ForLoopAction }

const FOR_ITEMS_LEN_MIN = 1
const FOR_ITEMS_LEN_MAX = 12
const FOR_STR_LEN_MAX = 10
const FOR_NUM_MIN = -1000
const FOR_NUM_MAX = 1000

function pyRange(start: number, stop: number, step: number): number[] {
  const out: number[] = []
  if (step > 0) { for (let v = start; v < stop; v += step) out.push(v) }
  else if (step < 0) { for (let v = start; v > stop; v += step) out.push(v) }
  return out
}

function resolveForItems(source: ForLoopSource): (string | number)[] | { error: string } {
  if (source.kind === "list") return source.items
  const { start, stop, step } = source
  if (!Number.isInteger(start) || !Number.isInteger(stop) || !Number.isInteger(step)) {
    return { error: "range의 start/stop/step은 정수여야 합니다." }
  }
  if (step === 0) return { error: "range의 step은 0일 수 없습니다." }
  const items = pyRange(start, stop, step)
  if (items.length < FOR_ITEMS_LEN_MIN || items.length > FOR_ITEMS_LEN_MAX) {
    return { error: `range 결과 길이는 ${FOR_ITEMS_LEN_MIN}~${FOR_ITEMS_LEN_MAX}이어야 합니다. (현재 ${items.length}개)` }
  }
  return items
}

export type ForLoopTraceValidationResult =
  | { ok: true;  spec: ForLoopTraceSpec }
  | { ok: false; error: string }

export function parseForLoopTraceSpec(raw: string): ForLoopTraceValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "for 반복 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, source, action } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (!source || (source.kind !== "list" && source.kind !== "range")) {
    return { ok: false, error: 'source.kind는 "list" 또는 "range"여야 합니다.' }
  }
  if (source.kind === "list") {
    if (!isValidName(source.sourceName)) {
      return { ok: false, error: `"${source.sourceName}"은(는) 올바른 변수 이름이 아닙니다.` }
    }
    if (source.sourceName === varName) {
      return { ok: false, error: "sourceName은 varName과 달라야 합니다." }
    }
    if (!Array.isArray(source.items) || source.items.length < FOR_ITEMS_LEN_MIN || source.items.length > FOR_ITEMS_LEN_MAX) {
      return { ok: false, error: `items는 길이 ${FOR_ITEMS_LEN_MIN}~${FOR_ITEMS_LEN_MAX}의 배열이어야 합니다.` }
    }
    for (const it of source.items) {
      if (typeof it === "string") {
        if (it.length < 1 || it.length > FOR_STR_LEN_MAX) return { ok: false, error: `문자열 항목은 길이 1~${FOR_STR_LEN_MAX}여야 합니다.` }
      } else if (typeof it === "number") {
        if (!Number.isInteger(it) || it < FOR_NUM_MIN || it > FOR_NUM_MAX) return { ok: false, error: `숫자 항목은 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
      } else {
        return { ok: false, error: "items 항목은 문자열 또는 숫자여야 합니다." }
      }
    }
  }

  const resolved = resolveForItems(source)
  if ("error" in resolved) return { ok: false, error: resolved.error }

  if (!action || (action.kind !== "print" && action.kind !== "accumulate")) {
    return { ok: false, error: 'action.kind는 "print" 또는 "accumulate"여야 합니다.' }
  }
  if (action.kind === "accumulate") {
    if (!isValidName(action.accName)) {
      return { ok: false, error: `"${action.accName}"은(는) 올바른 변수 이름이 아닙니다.` }
    }
    if (action.accName === varName) {
      return { ok: false, error: "accName은 varName과 달라야 합니다." }
    }
    if (source.kind === "list" && action.accName === source.sourceName) {
      return { ok: false, error: "accName은 sourceName과 달라야 합니다." }
    }
    if (!Number.isInteger(action.accInitial) || action.accInitial < FOR_NUM_MIN || action.accInitial > FOR_NUM_MAX) {
      return { ok: false, error: `accInitial은 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
    }
    if (action.op !== "+=" && action.op !== "-=") {
      return { ok: false, error: 'op는 "+=" 또는 "-="여야 합니다.' }
    }
    if (resolved.some(it => typeof it !== "number")) {
      return { ok: false, error: "accumulate 액션은 숫자만으로 이루어진 시퀀스에서만 사용할 수 있습니다." }
    }
  }

  return { ok: true, spec: { title, varName, source, action } }
}

function sourceExprText(source: ForLoopSource): string {
  if (source.kind === "list") return source.sourceName
  const { start, stop, step } = source
  if (step === 1) {
    if (start === 0) return `range(${stop})`
    return `range(${start}, ${stop})`
  }
  return `range(${start}, ${stop}, ${step})`
}

function buildForLoopTracePseudocode(spec: ForLoopTraceSpec) {
  const contextLines: string[] = []
  if (spec.action.kind === "accumulate") contextLines.push(`${spec.action.accName} = ${spec.action.accInitial}`)
  if (spec.source.kind === "list") contextLines.push(`${spec.source.sourceName} = [${spec.source.items.map(pyLit).join(", ")}]`)
  const collapseBefore = contextLines.length
  const offset = contextLines.length + 1

  const forLineIdx = offset
  const forLine = `for ${spec.varName} in ${sourceExprText(spec.source)}:`
  const actionLineIdx = offset + 1
  const actionLine = spec.action.kind === "print"
    ? `    print(${spec.varName})`
    : `    ${spec.action.accName} ${spec.action.op} ${spec.varName}`

  const bodyLines = [forLine, actionLine]
  let finalLineIdx = -1
  const lines = [...contextLines, "", ...bodyLines]
  if (spec.action.kind === "accumulate") {
    finalLineIdx = lines.length + 1
    lines.push("", `print(${spec.action.accName})`)
  }

  return { lines, forLineIdx, actionLineIdx, finalLineIdx, collapseBefore }
}

export type ForLoopTraceStep = {
  currentValue: string | number | null
  accValue:     number | null
  printed:      string | null
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

type ForLoopLineIdx = ReturnType<typeof buildForLoopTracePseudocode>

function computeForLoopTraceSteps(spec: ForLoopTraceSpec, li: ForLoopLineIdx, items: (string | number)[]): ForLoopTraceStep[] {
  const steps: ForLoopTraceStep[] = []
  let acc = spec.action.kind === "accumulate" ? spec.action.accInitial : null

  if (spec.action.kind === "accumulate") {
    steps.push({ currentValue: null, accValue: acc, printed: null, finished: false, codeLines: [0],
      caption: `${spec.action.accName}을 ${spec.action.accInitial}로 초기화합니다.` })
  }

  items.forEach(item => {
    steps.push({ currentValue: item, accValue: acc, printed: null, finished: false, codeLines: [li.forLineIdx],
      caption: `${spec.varName}에 ${pyLit(item)}을(를) 담습니다.` })

    if (spec.action.kind === "print") {
      steps.push({ currentValue: item, accValue: null, printed: String(item), finished: false, codeLines: [li.actionLineIdx],
        caption: `print(${spec.varName}) → ${item}` })
    } else {
      const op = spec.action.op
      acc = op === "+=" ? acc! + Number(item) : acc! - Number(item)
      steps.push({ currentValue: item, accValue: acc, printed: null, finished: false, codeLines: [li.actionLineIdx],
        caption: `${spec.action.accName} ${op} ${spec.varName} → ${spec.action.accName} = ${acc}` })
    }
  })

  if (spec.action.kind === "accumulate") {
    steps.push({ currentValue: null, accValue: acc, printed: String(acc), finished: true, codeLines: [li.finalLineIdx],
      caption: `반복이 끝나고 ${spec.action.accName}을 출력합니다 → ${acc}` })
  } else {
    steps.push({ currentValue: null, accValue: null, printed: null, finished: true, codeLines: [li.actionLineIdx],
      caption: "모든 요소를 순회했습니다." })
  }

  return steps
}

export type ForLoopTraceVizResult =
  | { ok: true;  spec: ForLoopTraceSpec; steps: ForLoopTraceStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildForLoopTraceVisualization(raw: string): ForLoopTraceVizResult {
  const parsed = parseForLoopTraceSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const items = resolveForItems(parsed.spec.source) as (string | number)[]
    const li = buildForLoopTracePseudocode(parsed.spec)
    const steps = computeForLoopTraceSteps(parsed.spec, li, items)
    return { ok: true, spec: parsed.spec, steps, pseudocode: li.lines, codeCollapseBefore: li.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `for 반복 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── while 반복 실행 흐름 (```while-loop-trace) ──

export type WhileLoopTraceSpec = { title?: string; varName: string; initial: number; op: CompareOp; threshold: number; step: number }

const WHILE_NUM_MIN = -1000
const WHILE_NUM_MAX = 1000
const WHILE_MAX_ITERATIONS = 30

export type WhileLoopTraceValidationResult =
  | { ok: true;  spec: WhileLoopTraceSpec }
  | { ok: false; error: string }

export function parseWhileLoopTraceSpec(raw: string): WhileLoopTraceValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "while 반복 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, initial, op, threshold, step } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (!COMPARE_OPS.has(op)) {
    return { ok: false, error: `"${op}"는 올바른 비교 연산자가 아닙니다. (>=, >, <=, <, ==, != 중 하나)` }
  }
  for (const [label, v] of [["initial", initial], ["threshold", threshold], ["step", step]] as const) {
    if (!Number.isInteger(v) || v < WHILE_NUM_MIN || v > WHILE_NUM_MAX) {
      return { ok: false, error: `${label}은(는) ${WHILE_NUM_MIN}~${WHILE_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (step === 0) {
    return { ok: false, error: "step은 0일 수 없습니다. (0이면 조건이 절대 바뀌지 않아 무한 루프가 됩니다)" }
  }

  let value = initial
  let iterations = 0
  while (evalCompare(value, op, threshold)) {
    value += step
    iterations++
    if (iterations > WHILE_MAX_ITERATIONS) {
      return { ok: false, error: `이 조건과 step으로는 ${WHILE_MAX_ITERATIONS}번 안에 반복이 끝나지 않습니다. 무한 루프일 수 있으니 op/threshold/step을 확인하세요.` }
    }
  }

  return { ok: true, spec: { title, varName, initial, op, threshold, step } }
}

function buildWhileLoopTracePseudocode(spec: WhileLoopTraceSpec) {
  const contextLines = [`${spec.varName} = ${spec.initial}`]
  const collapseBefore = contextLines.length
  const offset = contextLines.length + 1
  const bodyLines = [
    `while ${spec.varName} ${spec.op} ${spec.threshold}:`,
    `    print(${spec.varName}, end=' ')`,
    `    ${spec.varName} ${spec.step > 0 ? "+=" : "-="} ${Math.abs(spec.step)}`,
  ]
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = { INIT: 0, WHILE: offset, PRINT: offset + 1, STEP: offset + 2 }
  return { lines, lineIdx, collapseBefore }
}

export type WhileLoopTraceStep = {
  value:           number
  conditionResult: boolean | null
  printed:         number | null
  finished:        boolean
  codeLines:       number[]
  caption:         string
}

function computeWhileLoopTraceSteps(spec: WhileLoopTraceSpec, lineIdx: ReturnType<typeof buildWhileLoopTracePseudocode>["lineIdx"]): WhileLoopTraceStep[] {
  const steps: WhileLoopTraceStep[] = []
  steps.push({ value: spec.initial, conditionResult: null, printed: null, finished: false, codeLines: [lineIdx.INIT],
    caption: `${spec.varName}을 ${spec.initial}로 초기화합니다.` })

  let value = spec.initial
  while (evalCompare(value, spec.op, spec.threshold)) {
    steps.push({ value, conditionResult: true, printed: null, finished: false, codeLines: [lineIdx.WHILE],
      caption: `${spec.varName}(${value}) ${spec.op} ${spec.threshold} → 참, 반복을 계속합니다.` })
    steps.push({ value, conditionResult: true, printed: value, finished: false, codeLines: [lineIdx.PRINT],
      caption: `print(${spec.varName}) → ${value}` })
    value += spec.step
    steps.push({ value, conditionResult: true, printed: null, finished: false, codeLines: [lineIdx.STEP],
      caption: `${spec.varName} ${spec.step > 0 ? "+=" : "-="} ${Math.abs(spec.step)} → ${spec.varName} = ${value}` })
  }

  steps.push({ value, conditionResult: false, printed: null, finished: true, codeLines: [lineIdx.WHILE],
    caption: `${spec.varName}(${value}) ${spec.op} ${spec.threshold} → 거짓, 반복을 종료합니다.` })

  return steps
}

export type WhileLoopTraceVizResult =
  | { ok: true;  spec: WhileLoopTraceSpec; steps: WhileLoopTraceStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildWhileLoopTraceVisualization(raw: string): WhileLoopTraceVizResult {
  const parsed = parseWhileLoopTraceSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildWhileLoopTracePseudocode(parsed.spec)
    const steps = computeWhileLoopTraceSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `while 반복 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── break vs continue 대조 (```break-continue-compare) ──

export type TriggerCond = { kind: "compare"; op: CompareOp; threshold: number } | { kind: "even" } | { kind: "odd" }
export type BreakContinueMode = "break" | "continue"
export type BreakContinueSpec = { title?: string; varName: string; items: number[]; trigger: TriggerCond; mode: BreakContinueMode }

const BC_ITEMS_LEN_MIN = 1
const BC_ITEMS_LEN_MAX = 12

export type BreakContinueValidationResult =
  | { ok: true;  spec: BreakContinueSpec }
  | { ok: false; error: string }

export function parseBreakContinueSpec(raw: string): BreakContinueValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "break/continue 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, items, trigger, mode } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (!Array.isArray(items) || items.length < BC_ITEMS_LEN_MIN || items.length > BC_ITEMS_LEN_MAX) {
    return { ok: false, error: `items는 길이 ${BC_ITEMS_LEN_MIN}~${BC_ITEMS_LEN_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (!Number.isInteger(it) || it < FOR_NUM_MIN || it > FOR_NUM_MAX) {
      return { ok: false, error: `items 항목은 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (!trigger || (trigger.kind !== "compare" && trigger.kind !== "even" && trigger.kind !== "odd")) {
    return { ok: false, error: 'trigger.kind는 "compare"/"even"/"odd" 중 하나여야 합니다.' }
  }
  if (trigger.kind === "compare") {
    if (!COMPARE_OPS.has(trigger.op)) {
      return { ok: false, error: `"${trigger.op}"는 올바른 비교 연산자가 아닙니다.` }
    }
    if (!Number.isInteger(trigger.threshold) || trigger.threshold < FOR_NUM_MIN || trigger.threshold > FOR_NUM_MAX) {
      return { ok: false, error: `threshold는 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (mode !== "break" && mode !== "continue") {
    return { ok: false, error: 'mode는 "break" 또는 "continue"여야 합니다.' }
  }

  return { ok: true, spec: { title, varName, items, trigger, mode } }
}

function triggerCondText(varName: string, trigger: TriggerCond): string {
  if (trigger.kind === "compare") return `${varName} ${trigger.op} ${trigger.threshold}`
  if (trigger.kind === "even") return `${varName} % 2 == 0`
  return `${varName} % 2 == 1`
}

function evalTrigger(value: number, trigger: TriggerCond): boolean {
  if (trigger.kind === "compare") return evalCompare(value, trigger.op, trigger.threshold)
  if (trigger.kind === "even") return value % 2 === 0
  return Math.abs(value % 2) === 1
}

function buildBreakContinuePseudocode(spec: BreakContinueSpec) {
  const contextLines = [`values = [${spec.items.join(", ")}]`]
  const collapseBefore = contextLines.length
  const offset = contextLines.length + 1
  const bodyLines = [
    `for ${spec.varName} in values:`,
    `    if ${triggerCondText(spec.varName, spec.trigger)}:`,
    `        ${spec.mode}`,
    `    print(${spec.varName}, end=' ')`,
  ]
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = { FOR: offset, IF: offset + 1, ACTION: offset + 2, PRINT: offset + 3 }
  return { lines, lineIdx, collapseBefore }
}

export type BreakContinueItemState = "pending" | "current" | "printed" | "skipped" | "unreached"
export type BreakContinueStep = {
  currentIndex: number | null
  currentValue: number | null
  triggered:    boolean | null
  itemStates:   BreakContinueItemState[]
  printedSoFar: number[]
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

function computeBreakContinueSteps(spec: BreakContinueSpec, lineIdx: ReturnType<typeof buildBreakContinuePseudocode>["lineIdx"]): BreakContinueStep[] {
  const steps: BreakContinueStep[] = []
  const printed: number[] = []
  const itemStates: BreakContinueItemState[] = spec.items.map(() => "pending")

  const snapshot = (i: number | null, value: number | null, triggered: boolean | null, finished: boolean, codeLines: number[], caption: string): BreakContinueStep => ({
    currentIndex: i, currentValue: value, triggered, itemStates: [...itemStates], printedSoFar: [...printed], finished, codeLines, caption,
  })

  for (let i = 0; i < spec.items.length; i++) {
    const value = spec.items[i]
    itemStates[i] = "current"
    steps.push(snapshot(i, value, null, false, [lineIdx.FOR], `${spec.varName}에 ${value}을(를) 담습니다.`))

    const triggered = evalTrigger(value, spec.trigger)
    steps.push(snapshot(i, value, triggered, false, [lineIdx.IF], `조건(${triggerCondText(spec.varName, spec.trigger)}) → ${triggered ? "참" : "거짓"}`))

    if (triggered) {
      if (spec.mode === "break") {
        for (let j = i; j < itemStates.length; j++) itemStates[j] = "unreached"
        steps.push(snapshot(i, value, triggered, true, [lineIdx.ACTION], "break! 반복문을 즉시 종료합니다. 남은 값들은 검사조차 되지 않습니다."))
        return steps
      }
      itemStates[i] = "skipped"
      steps.push(snapshot(i, value, triggered, false, [lineIdx.ACTION], "continue! 이번 회차는 여기서 건너뛰고 다음 값으로 넘어갑니다."))
      continue
    }

    printed.push(value)
    itemStates[i] = "printed"
    steps.push(snapshot(i, value, triggered, false, [lineIdx.PRINT], `print(${value}) → 출력 목록에 추가됩니다.`))
  }

  steps.push(snapshot(null, null, null, true, [lineIdx.PRINT], "반복이 모두 끝났습니다."))
  return steps
}

export type BreakContinueVizResult =
  | { ok: true;  spec: BreakContinueSpec; steps: BreakContinueStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildBreakContinueVisualization(raw: string): BreakContinueVizResult {
  const parsed = parseBreakContinueSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildBreakContinuePseudocode(parsed.spec)
    const steps = computeBreakContinueSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `break/continue 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── for-else 성공/실패 대조 (```for-else-flow) ──

export type ForElseFlowSpec = { title?: string; items: number[]; target: number }

const FE_ITEMS_LEN_MIN = 1
const FE_ITEMS_LEN_MAX = 10

export type ForElseFlowValidationResult =
  | { ok: true;  spec: ForElseFlowSpec }
  | { ok: false; error: string }

export function parseForElseFlowSpec(raw: string): ForElseFlowValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "for-else 데이터 형식이 올바르지 않습니다." }
  }

  const { title, items, target } = parsed

  if (!Array.isArray(items) || items.length < FE_ITEMS_LEN_MIN || items.length > FE_ITEMS_LEN_MAX) {
    return { ok: false, error: `items는 길이 ${FE_ITEMS_LEN_MIN}~${FE_ITEMS_LEN_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (!Number.isInteger(it) || it < FOR_NUM_MIN || it > FOR_NUM_MAX) {
      return { ok: false, error: `items 항목은 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (!Number.isInteger(target) || target < FOR_NUM_MIN || target > FOR_NUM_MAX) {
    return { ok: false, error: `target은 ${FOR_NUM_MIN}~${FOR_NUM_MAX} 사이의 정수여야 합니다.` }
  }

  return { ok: true, spec: { title, items, target } }
}

function buildForElseFlowPseudocode(spec: ForElseFlowSpec) {
  const contextLines = [`num = [${spec.items.join(", ")}]`, `t = ${spec.target}`]
  const collapseBefore = contextLines.length
  const offset = contextLines.length + 1
  const bodyLines = [
    "for i in num:",
    "    if i == t:",
    `        print(f"{t}을 찾았습니다.")`,
    "        break",
    "else:",
    `    print(f"{t}은 리스트에 없습니다.")`,
  ]
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    FOR: offset, IF: offset + 1, FOUND_PRINT: offset + 2, BREAK: offset + 3,
    ELSE: offset + 4, ELSE_PRINT: offset + 5,
  }
  return { lines, lineIdx, collapseBefore }
}

export type ForElseItemState = "pending" | "current" | "checked" | "unreached"
export type ForElseFlowStep = {
  currentIndex: number | null
  itemStates:   ForElseItemState[]
  found:        boolean
  elseState:    "pending" | "active" | "skipped"
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

function computeForElseFlowSteps(spec: ForElseFlowSpec, lineIdx: ReturnType<typeof buildForElseFlowPseudocode>["lineIdx"]): ForElseFlowStep[] {
  const steps: ForElseFlowStep[] = []
  const itemStates: ForElseItemState[] = spec.items.map(() => "pending")

  const snapshot = (i: number | null, found: boolean, elseState: ForElseFlowStep["elseState"], finished: boolean, codeLines: number[], caption: string): ForElseFlowStep => ({
    currentIndex: i, itemStates: [...itemStates], found, elseState, finished, codeLines, caption,
  })

  for (let i = 0; i < spec.items.length; i++) {
    const value = spec.items[i]
    itemStates[i] = "current"
    steps.push(snapshot(i, false, "pending", false, [lineIdx.FOR], `i에 ${value}을(를) 담습니다.`))

    const match = value === spec.target
    steps.push(snapshot(i, false, "pending", false, [lineIdx.IF], `i(${value}) == t(${spec.target}) → ${match ? "참" : "거짓"}`))

    if (match) {
      itemStates[i] = "checked"
      for (let j = i + 1; j < itemStates.length; j++) itemStates[j] = "unreached"
      steps.push(snapshot(i, true, "skipped", false, [lineIdx.FOUND_PRINT], `${spec.target}을 찾았습니다.`))
      steps.push(snapshot(i, true, "skipped", true, [lineIdx.BREAK], "break로 반복문을 벗어나므로 else 블록은 실행되지 않습니다."))
      return steps
    }
    itemStates[i] = "checked"
  }

  steps.push(snapshot(null, false, "active", false, [lineIdx.ELSE], "break 없이 반복이 끝까지 완료되어 else 블록이 실행됩니다."))
  steps.push(snapshot(null, false, "active", true, [lineIdx.ELSE_PRINT], `${spec.target}은(는) 리스트에 없습니다.`))

  return steps
}

export type ForElseFlowVizResult =
  | { ok: true;  spec: ForElseFlowSpec; steps: ForElseFlowStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildForElseFlowVisualization(raw: string): ForElseFlowVizResult {
  const parsed = parseForElseFlowSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildForElseFlowPseudocode(parsed.spec)
    const steps = computeForElseFlowSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `for-else 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 이중 반복문 실행 순서 (```nested-loop-trace) ──

export type NestedLoopSpec = {
  title?: string
  outerCount: number
  innerCount: number
  breakAt?: { outer: number; inner: number }
  useFlag?: boolean
}

const NL_COUNT_MIN = 1
const NL_COUNT_MAX = 6

export type NestedLoopValidationResult =
  | { ok: true;  spec: NestedLoopSpec }
  | { ok: false; error: string }

export function parseNestedLoopSpec(raw: string): NestedLoopValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "이중 반복문 데이터 형식이 올바르지 않습니다." }
  }

  const { title, outerCount, innerCount, breakAt, useFlag } = parsed

  if (!Number.isInteger(outerCount) || outerCount < NL_COUNT_MIN || outerCount > NL_COUNT_MAX) {
    return { ok: false, error: `outerCount는 ${NL_COUNT_MIN}~${NL_COUNT_MAX} 사이의 정수여야 합니다.` }
  }
  if (!Number.isInteger(innerCount) || innerCount < NL_COUNT_MIN || innerCount > NL_COUNT_MAX) {
    return { ok: false, error: `innerCount는 ${NL_COUNT_MIN}~${NL_COUNT_MAX} 사이의 정수여야 합니다.` }
  }
  if (breakAt !== undefined) {
    if (!Number.isInteger(breakAt.outer) || breakAt.outer < 0 || breakAt.outer >= outerCount) {
      return { ok: false, error: `breakAt.outer는 0~${outerCount - 1} 사이의 정수여야 합니다.` }
    }
    if (!Number.isInteger(breakAt.inner) || breakAt.inner < 0 || breakAt.inner >= innerCount) {
      return { ok: false, error: `breakAt.inner는 0~${innerCount - 1} 사이의 정수여야 합니다.` }
    }
  }
  if (useFlag !== undefined) {
    if (typeof useFlag !== "boolean") return { ok: false, error: "useFlag는 불(boolean)이어야 합니다." }
    if (useFlag && breakAt === undefined) return { ok: false, error: "useFlag는 breakAt이 있을 때만 사용할 수 있습니다." }
  }

  return { ok: true, spec: { title, outerCount, innerCount, breakAt, useFlag } }
}

function buildNestedLoopPseudocode(spec: NestedLoopSpec) {
  if (!spec.breakAt) {
    const lines = [
      `for i in range(${spec.outerCount}):`,
      `    for j in range(${spec.innerCount}):`,
      `        print(f"i={i}, j={j}")`,
    ]
    return { lines, lineIdx: { OUTER: 0, INNER: 1, IF: -1, PRINT: 2, SET_FLAG: -1, BREAK_INNER: -1, CHECK_FLAG: -1, BREAK_OUTER: -1, FLAG_INIT: -1 }, collapseBefore: 0 }
  }

  const { outer: bo, inner: bi } = spec.breakAt
  if (!spec.useFlag) {
    const lines = [
      `for i in range(${spec.outerCount}):`,
      `    for j in range(${spec.innerCount}):`,
      `        if i == ${bo} and j == ${bi}:`,
      "            break",
      `        print(f"i={i}, j={j}")`,
    ]
    return { lines, lineIdx: { OUTER: 0, INNER: 1, IF: 2, BREAK_INNER: 3, PRINT: 4, SET_FLAG: -1, CHECK_FLAG: -1, BREAK_OUTER: -1, FLAG_INIT: -1 }, collapseBefore: 0 }
  }

  const lines = [
    "found = False",
    "",
    `for i in range(${spec.outerCount}):`,
    `    for j in range(${spec.innerCount}):`,
    `        if i == ${bo} and j == ${bi}:`,
    "            found = True",
    "            break",
    "    if found:",
    "        break",
  ]
  return { lines, lineIdx: { FLAG_INIT: 0, OUTER: 2, INNER: 3, IF: 4, SET_FLAG: 5, BREAK_INNER: 6, CHECK_FLAG: 7, BREAK_OUTER: 8, PRINT: -1 }, collapseBefore: 1 }
}

export type NestedLoopCellState = "empty" | "current" | "visited" | "blocked"
export type NestedLoopStep = {
  grid:      NestedLoopCellState[][]
  currentI:  number | null
  currentJ:  number | null
  flagValue: boolean | null
  finished:  boolean
  codeLines: number[]
  caption:   string
}

type NestedLoopLineIdx = ReturnType<typeof buildNestedLoopPseudocode>["lineIdx"]

function computeNestedLoopSteps(spec: NestedLoopSpec, li: NestedLoopLineIdx): NestedLoopStep[] {
  const steps: NestedLoopStep[] = []
  const grid: NestedLoopCellState[][] = Array.from({ length: spec.outerCount }, () => Array(spec.innerCount).fill("empty"))
  let flagValue: boolean | null = spec.useFlag ? false : null

  const snapshot = (i: number | null, j: number | null, finished: boolean, codeLines: number[], caption: string): NestedLoopStep => ({
    grid: grid.map(row => [...row]), currentI: i, currentJ: j, flagValue, finished, codeLines, caption,
  })

  if (spec.useFlag) {
    steps.push(snapshot(null, null, false, [li.FLAG_INIT], "found를 False로 초기화합니다."))
  }

  outer: for (let i = 0; i < spec.outerCount; i++) {
    steps.push(snapshot(i, null, false, [li.OUTER], `바깥 반복문: i = ${i}`))

    for (let j = 0; j < spec.innerCount; j++) {
      grid[i][j] = "current"
      steps.push(snapshot(i, j, false, [li.INNER], `안쪽 반복문: j = ${j}`))

      const isBreakPoint = spec.breakAt && spec.breakAt.outer === i && spec.breakAt.inner === j
      if (isBreakPoint) {
        steps.push(snapshot(i, j, false, [li.IF], `i == ${spec.breakAt!.outer} and j == ${spec.breakAt!.inner} → 참`))
        grid[i][j] = "blocked"

        if (spec.useFlag) {
          flagValue = true
          steps.push(snapshot(i, j, false, [li.SET_FLAG], "found = True"))
          steps.push(snapshot(i, j, false, [li.BREAK_INNER], "안쪽 반복문을 종료합니다."))
          break
        } else {
          steps.push(snapshot(i, j, false, [li.BREAK_INNER], "안쪽 반복문만 종료합니다. 바깥 반복문은 다음 i로 계속됩니다."))
          break
        }
      }

      if (spec.breakAt) {
        steps.push(snapshot(i, j, false, [li.IF], `i == ${spec.breakAt.outer} and j == ${spec.breakAt.inner} → 거짓`))
      }
      grid[i][j] = "visited"
      steps.push(snapshot(i, j, false, [li.PRINT], `실행 → i=${i}, j=${j}`))
    }

    if (spec.useFlag) {
      steps.push(snapshot(i, null, false, [li.CHECK_FLAG], flagValue ? "found가 참이므로 바깥 반복문도 종료합니다." : "found가 거짓이므로 바깥 반복문을 계속합니다."))
      if (flagValue) {
        for (let oi = i + 1; oi < spec.outerCount; oi++) {
          for (let oj = 0; oj < spec.innerCount; oj++) grid[oi][oj] = "blocked"
        }
        steps.push(snapshot(i, null, true, [li.BREAK_OUTER], "바깥 반복문을 종료합니다."))
        break outer
      }
    }
  }

  if (steps.length === 0 || !steps[steps.length - 1].finished) {
    steps.push(snapshot(null, null, true, [spec.breakAt ? li.BREAK_INNER : li.PRINT], "모든 반복이 끝났습니다."))
  }

  return steps
}

export type NestedLoopVizResult =
  | { ok: true;  spec: NestedLoopSpec; steps: NestedLoopStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildNestedLoopVisualization(raw: string): NestedLoopVizResult {
  const parsed = parseNestedLoopSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildNestedLoopPseudocode(parsed.spec)
    const steps = computeNestedLoopSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `이중 반복문 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
