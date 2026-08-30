// 파이썬가이드 "6장. 조건문" 챕터 본문의 ```if-elif-flow / ```or-trap / ```truthy-compare
// 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리
// 계산해둔다. React에 의존하지 않는 순수 함수 모음.
//
// 조건식은 임의의 파이썬 표현식을 eval()하지 않는다. "변수 하나를 비교 연산자+숫자로
// 비교"하는 구조화된 스키마로만 표현하고, 실제 비교는 TS로 직접 계산한 뒤 그 결과를
// 문자열(파이썬 소스처럼 보이는 텍스트)로 만들어 보여준다.

import { IDENTIFIER_RE, PY_KEYWORDS } from "@/lib/basicsTraversal"

function isValidName(name: unknown): name is string {
  return typeof name === "string" && IDENTIFIER_RE.test(name) && !PY_KEYWORDS.has(name)
}

function pyStr(s: string): string {
  return `'${s.replace(/'/g, "\\'")}'`
}

// ── if/elif/else 실행 흐름 (```if-elif-flow) ──

export type CompareOp = ">=" | ">" | "<=" | "<" | "==" | "!="
const COMPARE_OPS = new Set<CompareOp>([">=", ">", "<=", "<", "==", "!="])

export type IfElifBranch = { op: CompareOp; threshold: number; actionValue: string }
export type IfElifFlowMode = "elif" | "independent_ifs"
export type IfElifFlowSpec = {
  title?: string
  varName: string
  varValue: number
  actionName: string
  mode: IfElifFlowMode
  branches: IfElifBranch[]
  elseValue?: string
}

const IF_ELIF_VALUE_MIN = -1000
const IF_ELIF_VALUE_MAX = 1000
const IF_ELIF_BRANCHES_MIN = 1
const IF_ELIF_BRANCHES_MAX = 6
const IF_ELIF_ACTION_VALUE_LEN_MAX = 20

export type IfElifFlowValidationResult =
  | { ok: true;  spec: IfElifFlowSpec }
  | { ok: false; error: string }

export function parseIfElifFlowSpec(raw: string): IfElifFlowValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "조건문 흐름 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, varValue, actionName, mode, branches, elseValue } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (!isValidName(actionName)) {
    return { ok: false, error: `"${actionName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (!Number.isInteger(varValue) || varValue < IF_ELIF_VALUE_MIN || varValue > IF_ELIF_VALUE_MAX) {
    return { ok: false, error: `varValue는 ${IF_ELIF_VALUE_MIN}~${IF_ELIF_VALUE_MAX} 사이의 정수여야 합니다.` }
  }
  if (mode !== "elif" && mode !== "independent_ifs") {
    return { ok: false, error: 'mode는 "elif" 또는 "independent_ifs"여야 합니다.' }
  }
  if (!Array.isArray(branches) || branches.length < IF_ELIF_BRANCHES_MIN || branches.length > IF_ELIF_BRANCHES_MAX) {
    return { ok: false, error: `branches는 길이 ${IF_ELIF_BRANCHES_MIN}~${IF_ELIF_BRANCHES_MAX}의 배열이어야 합니다.` }
  }
  for (const b of branches) {
    if (!COMPARE_OPS.has(b?.op)) {
      return { ok: false, error: `"${b?.op}"는 올바른 비교 연산자가 아닙니다. (>=, >, <=, <, ==, != 중 하나)` }
    }
    if (!Number.isInteger(b.threshold) || b.threshold < IF_ELIF_VALUE_MIN || b.threshold > IF_ELIF_VALUE_MAX) {
      return { ok: false, error: `threshold는 ${IF_ELIF_VALUE_MIN}~${IF_ELIF_VALUE_MAX} 사이의 정수여야 합니다.` }
    }
    if (typeof b.actionValue !== "string" || b.actionValue.length < 1 || b.actionValue.length > IF_ELIF_ACTION_VALUE_LEN_MAX) {
      return { ok: false, error: `actionValue는 길이 1~${IF_ELIF_ACTION_VALUE_LEN_MAX}의 문자열이어야 합니다.` }
    }
  }
  if (elseValue !== undefined) {
    if (mode === "independent_ifs") {
      return { ok: false, error: 'mode가 "independent_ifs"일 때는 elseValue를 사용할 수 없습니다.' }
    }
    if (typeof elseValue !== "string" || elseValue.length < 1 || elseValue.length > IF_ELIF_ACTION_VALUE_LEN_MAX) {
      return { ok: false, error: `elseValue는 길이 1~${IF_ELIF_ACTION_VALUE_LEN_MAX}의 문자열이어야 합니다.` }
    }
  }

  return { ok: true, spec: { title, varName, varValue, actionName, mode, branches, elseValue } }
}

function buildIfElifFlowPseudocode(spec: IfElifFlowSpec) {
  const contextLines = [`${spec.varName} = ${spec.varValue}`]
  const collapseBefore = contextLines.length
  const bodyLines: string[] = []
  const condLineIdx: number[] = []
  const actionLineIdx: number[] = []
  const offset = contextLines.length + 1

  spec.branches.forEach((b, i) => {
    const keyword = spec.mode === "elif" && i > 0 ? "elif" : "if"
    condLineIdx.push(offset + bodyLines.length)
    bodyLines.push(`${keyword} ${spec.varName} ${b.op} ${b.threshold}:`)
    actionLineIdx.push(offset + bodyLines.length)
    bodyLines.push(`    ${spec.actionName} = ${pyStr(b.actionValue)}`)
  })

  let elseLineIdx = -1
  let elseActionLineIdx = -1
  if (spec.mode === "elif" && spec.elseValue !== undefined) {
    elseLineIdx = offset + bodyLines.length
    bodyLines.push("else:")
    elseActionLineIdx = offset + bodyLines.length
    bodyLines.push(`    ${spec.actionName} = ${pyStr(spec.elseValue)}`)
  }

  const lines = [...contextLines, "", ...bodyLines]
  return { lines, condLineIdx, actionLineIdx, elseLineIdx, elseActionLineIdx, collapseBefore }
}

function evalCompare(value: number, op: CompareOp, threshold: number): boolean {
  if (op === ">=") return value >= threshold
  if (op === ">")  return value >  threshold
  if (op === "<=") return value <= threshold
  if (op === "<")  return value <  threshold
  if (op === "==") return value === threshold
  return value !== threshold
}

export type BranchState = "pending" | "checking" | "true" | "false" | "skipped"
export type IfElifFlowStep = {
  branchStates: BranchState[]
  elseState:    "pending" | "active" | "skipped" | null
  currentValue: string | null
  overwritten:  boolean
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

type IfElifLineIdx = ReturnType<typeof buildIfElifFlowPseudocode>

function computeIfElifFlowSteps(spec: IfElifFlowSpec, li: IfElifLineIdx): IfElifFlowStep[] {
  const steps: IfElifFlowStep[] = []
  const branchStates: BranchState[] = spec.branches.map(() => "pending")
  let elseState: IfElifFlowStep["elseState"] = spec.elseValue !== undefined ? "pending" : null
  let currentValue: string | null = null

  const snapshot = (overwritten: boolean, finished: boolean, codeLines: number[], caption: string): IfElifFlowStep => ({
    branchStates: [...branchStates], elseState, currentValue, overwritten, finished, codeLines, caption,
  })

  if (spec.mode === "elif") {
    for (let i = 0; i < spec.branches.length; i++) {
      const b = spec.branches[i]
      branchStates[i] = "checking"
      steps.push(snapshot(false, false, [li.condLineIdx[i]],
        `${spec.varName}(${spec.varValue}) ${b.op} ${b.threshold} 를 검사합니다.`))

      const result = evalCompare(spec.varValue, b.op, b.threshold)
      if (result) {
        branchStates[i] = "true"
        for (let j = i + 1; j < branchStates.length; j++) branchStates[j] = "skipped"
        if (elseState !== null) elseState = "skipped"
        currentValue = b.actionValue
        steps.push(snapshot(false, true, [li.actionLineIdx[i]],
          `조건이 참이므로 ${spec.actionName} = ${pyStr(b.actionValue)}를 실행하고, 이후 조건들은 검사하지 않고 즉시 빠져나갑니다.`))
        return steps
      }
      branchStates[i] = "false"
    }

    if (elseState !== null) {
      elseState = "active"
      currentValue = spec.elseValue!
      steps.push(snapshot(false, true, [li.elseLineIdx],
        `모든 조건이 거짓이므로 else 블록을 실행합니다 → ${spec.actionName} = ${pyStr(spec.elseValue!)}`))
    } else {
      steps.push(snapshot(false, true, [li.condLineIdx[li.condLineIdx.length - 1]],
        "일치하는 조건이 없고 else도 없어 아무것도 실행되지 않습니다."))
    }
    return steps
  }

  // independent_ifs: 참인 조건을 찾아도 멈추지 않고 끝까지 모든 if를 따로 검사한다 (버그 재현).
  for (let i = 0; i < spec.branches.length; i++) {
    const b = spec.branches[i]
    branchStates[i] = "checking"
    steps.push(snapshot(false, false, [li.condLineIdx[i]],
      `${spec.varName}(${spec.varValue}) ${b.op} ${b.threshold} 를 검사합니다. (독립된 if라 앞선 결과와 무관하게 계속 검사)`))

    const result = evalCompare(spec.varValue, b.op, b.threshold)
    if (result) {
      branchStates[i] = "true"
      const overwritten = currentValue !== null
      currentValue = b.actionValue
      steps.push(snapshot(overwritten, false, [li.actionLineIdx[i]],
        overwritten
          ? `조건이 참이라 이전 값을 덮어쓰고 ${spec.actionName} = ${pyStr(b.actionValue)}가 됩니다!`
          : `조건이 참이므로 ${spec.actionName} = ${pyStr(b.actionValue)}를 실행합니다.`))
    } else {
      branchStates[i] = "false"
    }
  }

  steps.push(snapshot(false, true, [li.actionLineIdx[li.actionLineIdx.length - 1]],
    currentValue !== null
      ? `모든 if를 다 검사한 뒤, 최종적으로 ${spec.actionName} = ${pyStr(currentValue)} 입니다.`
      : `모든 if를 다 검사했지만 참인 조건이 없어 ${spec.actionName}은(는) 만들어지지 않았습니다.`))
  return steps
}

export type IfElifFlowVizResult =
  | { ok: true;  spec: IfElifFlowSpec; steps: IfElifFlowStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildIfElifFlowVisualization(raw: string): IfElifFlowVizResult {
  const parsed = parseIfElifFlowSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const li = buildIfElifFlowPseudocode(parsed.spec)
    const steps = computeIfElifFlowSteps(parsed.spec, li)
    return { ok: true, spec: parsed.spec, steps, pseudocode: li.lines, codeCollapseBefore: li.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `조건문 흐름 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── or의 함정 (```or-trap) ──
// "x == 1 or 2"가 "(x == 1) or (2)"로 해석되어, 숫자 2가 그 자체로 참(truthy)으로
// 취급되는 바람에 결과가 항상 참이 되는 흔한 실수를 보여준다.

export type OrTrapSpec = { title?: string; varName: string; varValue: number; compareValue: number; orValue: number }

const OR_TRAP_VALUE_MIN = -1000
const OR_TRAP_VALUE_MAX = 1000

export type OrTrapValidationResult =
  | { ok: true;  spec: OrTrapSpec }
  | { ok: false; error: string }

export function parseOrTrapSpec(raw: string): OrTrapValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "or의 함정 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, varValue, compareValue, orValue } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  for (const [label, v] of [["varValue", varValue], ["compareValue", compareValue], ["orValue", orValue]] as const) {
    if (!Number.isInteger(v) || v < OR_TRAP_VALUE_MIN || v > OR_TRAP_VALUE_MAX) {
      return { ok: false, error: `${label}는 ${OR_TRAP_VALUE_MIN}~${OR_TRAP_VALUE_MAX} 사이의 정수여야 합니다.` }
    }
  }

  return { ok: true, spec: { title, varName, varValue, compareValue, orValue } }
}

function buildOrTrapPseudocode(spec: OrTrapSpec) {
  const contextLines = [`${spec.varName} = ${spec.varValue}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    `if ${spec.varName} == ${spec.compareValue} or ${spec.orValue}:`,
    `    print("${spec.compareValue} 또는 ${spec.orValue}입니다.")`,
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = { INIT: 0, CHECK: offset, PRINT: offset + 1 }
  return { lines, lineIdx, collapseBefore }
}

export type OrTrapPhase = "init" | "check_left" | "check_right" | "combine" | "result"
export type OrTrapStep = {
  phase:       OrTrapPhase
  leftResult:  boolean | null
  rightTruthy: boolean | null
  combined:    boolean | null
  codeLines:   number[]
  caption:     string
}

function computeOrTrapSteps(spec: OrTrapSpec, lineIdx: ReturnType<typeof buildOrTrapPseudocode>["lineIdx"]): OrTrapStep[] {
  const steps: OrTrapStep[] = []

  steps.push({ phase: "init", leftResult: null, rightTruthy: null, combined: null, codeLines: [lineIdx.INIT],
    caption: `${spec.varName} = ${spec.varValue}로 초기화합니다.` })

  const leftResult = spec.varValue === spec.compareValue
  steps.push({ phase: "check_left", leftResult, rightTruthy: null, combined: null, codeLines: [lineIdx.CHECK],
    caption: `${spec.varName}(${spec.varValue}) == ${spec.compareValue} → ${leftResult ? "참" : "거짓"}` })

  const rightTruthy = spec.orValue !== 0
  steps.push({ phase: "check_right", leftResult, rightTruthy, combined: null, codeLines: [lineIdx.CHECK],
    caption: `파이썬은 "${spec.varName} == ${spec.compareValue} or ${spec.orValue}"를 "(${spec.varName} == ${spec.compareValue}) or (${spec.orValue})"로 해석합니다. 숫자 ${spec.orValue}는 ${spec.orValue === 0 ? "0이라 거짓" : "0이 아니므로 그 자체로 참"}으로 취급됩니다.` })

  const combined = leftResult || rightTruthy
  steps.push({ phase: "combine", leftResult, rightTruthy, combined, codeLines: [lineIdx.CHECK],
    caption: `${leftResult ? "참" : "거짓"} or ${rightTruthy ? "참" : "거짓"} → ${combined ? "참" : "거짓"}` })

  steps.push({ phase: "result", leftResult, rightTruthy, combined, codeLines: [combined ? lineIdx.PRINT : lineIdx.CHECK],
    caption: combined
      ? (rightTruthy
          ? `${spec.orValue}는 0이 아니므로 ${spec.varName} 값과 관계없이 조건이 항상 참이 되어 조건문 내부가 실행됩니다. 이것이 "or의 함정"입니다.`
          : `조건이 참이므로 조건문 내부가 실행됩니다.`)
      : `${spec.orValue}가 0이라 거짓으로 취급되고, ${spec.varName}(${spec.varValue})도 ${spec.compareValue}와 다르므로 전체 조건이 거짓이 되어 조건문 내부가 실행되지 않습니다.` })

  return steps
}

export type OrTrapVizResult =
  | { ok: true;  spec: OrTrapSpec; steps: OrTrapStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildOrTrapVisualization(raw: string): OrTrapVizResult {
  const parsed = parseOrTrapSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildOrTrapPseudocode(parsed.spec)
    const steps = computeOrTrapSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `or의 함정 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 참/거짓으로 판단되는 값 비교 (```truthy-compare) ──
// format-align과 동일한 "항목 1개 = 코드 1줄 = 스텝 1개" 비교 슬라이드 패턴.

export type TruthyItem =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "list";   length: number }
  | { type: "dict";   length: number }
  | { type: "none" }
  | { type: "bool";   value: boolean }

export type TruthyCompareSpec = { title?: string; items: TruthyItem[] }

const TRUTHY_ITEMS_MIN = 1
const TRUTHY_ITEMS_MAX = 8
const TRUTHY_STRING_LEN_MAX = 20
const TRUTHY_LENGTH_MAX = 5

export type TruthyCompareValidationResult =
  | { ok: true;  spec: TruthyCompareSpec }
  | { ok: false; error: string }

export function parseTruthyCompareSpec(raw: string): TruthyCompareValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "참/거짓 비교 데이터 형식이 올바르지 않습니다." }
  }

  const { title, items } = parsed
  if (!Array.isArray(items) || items.length < TRUTHY_ITEMS_MIN || items.length > TRUTHY_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${TRUTHY_ITEMS_MIN}~${TRUTHY_ITEMS_MAX}의 배열이어야 합니다.` }
  }

  for (const item of items) {
    if (item?.type === "number") {
      if (!Number.isInteger(item.value)) return { ok: false, error: "number 항목의 value는 정수여야 합니다." }
    } else if (item?.type === "string") {
      if (typeof item.value !== "string" || item.value.length > TRUTHY_STRING_LEN_MAX) {
        return { ok: false, error: `string 항목의 value는 길이 ${TRUTHY_STRING_LEN_MAX} 이하의 문자열이어야 합니다.` }
      }
    } else if (item?.type === "list" || item?.type === "dict") {
      if (!Number.isInteger(item.length) || item.length < 0 || item.length > TRUTHY_LENGTH_MAX) {
        return { ok: false, error: `${item.type} 항목의 length는 0~${TRUTHY_LENGTH_MAX} 사이의 정수여야 합니다.` }
      }
    } else if (item?.type === "none") {
      // 추가 필드 없음
    } else if (item?.type === "bool") {
      if (typeof item.value !== "boolean") return { ok: false, error: "bool 항목의 value는 불(boolean)이어야 합니다." }
    } else {
      return { ok: false, error: `"${item?.type}"은(는) 올바른 항목 타입이 아닙니다. (number/string/list/dict/none/bool)` }
    }
  }

  return { ok: true, spec: { title, items } }
}

function truthyLiteral(item: TruthyItem): string {
  if (item.type === "number") return String(item.value)
  if (item.type === "string") return pyStr(item.value)
  if (item.type === "list")   return `[${Array.from({ length: item.length }, (_, i) => i + 1).join(", ")}]`
  if (item.type === "dict")   return `{${Array.from({ length: item.length }, (_, i) => `'k${i + 1}': ${i + 1}`).join(", ")}}`
  if (item.type === "none")   return "None"
  return item.value ? "True" : "False"
}

function isTruthyItem(item: TruthyItem): boolean {
  if (item.type === "number") return item.value !== 0
  if (item.type === "string") return item.value.length > 0
  if (item.type === "list")   return item.length > 0
  if (item.type === "dict")   return item.length > 0
  if (item.type === "none")   return false
  return item.value
}

function buildTruthyComparePseudocode(spec: TruthyCompareSpec) {
  const lines = spec.items.map(item => `print(bool(${truthyLiteral(item)}))`)
  const lineIdx = spec.items.map((_, i) => i)
  return { lines, lineIdx, collapseBefore: 0 }
}

export type TruthyCompareStep = {
  literal:   string
  truthy:    boolean
  codeLines: number[]
  caption:   string
}

function computeTruthyCompareSteps(spec: TruthyCompareSpec, lineIdx: number[]): TruthyCompareStep[] {
  return spec.items.map((item, i) => {
    const literal = truthyLiteral(item)
    const truthy = isTruthyItem(item)
    return {
      literal, truthy, codeLines: [lineIdx[i]],
      caption: `bool(${literal}) → ${truthy ? "True" : "False"} → if문에서는 ${truthy ? "참" : "거짓"}으로 취급됩니다.`,
    }
  })
}

export type TruthyCompareVizResult =
  | { ok: true;  spec: TruthyCompareSpec; steps: TruthyCompareStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildTruthyCompareVisualization(raw: string): TruthyCompareVizResult {
  const parsed = parseTruthyCompareSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildTruthyComparePseudocode(parsed.spec)
    const steps = computeTruthyCompareSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `참/거짓 비교 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
