// 파이썬가이드 "3장. 문자열 함수" 챕터 본문의 ```string-find / ```string-split /
// ```string-join 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로
// 스텝을 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.

import { IDENTIFIER_RE, PY_KEYWORDS } from "@/lib/basicsTraversal"

// ── find()/index() 동작 원리 (```string-find) ──
// find/index는 문서에 실제 소스가 없는 내장 함수라, bisect_left 때와 동일하게
// "개념적 구현"이라고 명시적으로 라벨링한 코드를 보여준다.

export type StringFindSpec = { title?: string; text: string; target: string; mode: "find" | "index" }

const TEXT_LEN_MIN = 1
const TEXT_LEN_MAX = 30
const TARGET_LEN_MIN = 1
const TARGET_LEN_MAX = 10

export type StringFindValidationResult =
  | { ok: true;  spec: StringFindSpec }
  | { ok: false; error: string }

export function parseStringFindSpec(raw: string): StringFindValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "문자열 탐색 데이터 형식이 올바르지 않습니다." }
  }

  const { text, target, mode, title } = parsed

  if (typeof text !== "string" || text.length < TEXT_LEN_MIN || text.length > TEXT_LEN_MAX) {
    return { ok: false, error: `text는 길이 ${TEXT_LEN_MIN}~${TEXT_LEN_MAX}의 문자열이어야 합니다.` }
  }
  if (typeof target !== "string" || target.length < TARGET_LEN_MIN || target.length > TARGET_LEN_MAX) {
    return { ok: false, error: `target은 길이 ${TARGET_LEN_MIN}~${TARGET_LEN_MAX}의 문자열이어야 합니다.` }
  }
  if (mode !== "find" && mode !== "index") {
    return { ok: false, error: `mode는 "find" 또는 "index"여야 합니다.` }
  }

  return { ok: true, spec: { title, text, target, mode } }
}

function buildStringFindPseudocode(spec: StringFindSpec) {
  const funcName = spec.mode
  const contextLines = [`txt = "${spec.text}"`, `target = "${spec.target}"`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    `# txt.${funcName}(target)가 내부적으로 하는 일 (개념적 구현)`,
    `def ${funcName}(txt, target):`,
    "    for i in range(len(txt) - len(target) + 1):",
    "        if txt[i:i + len(target)] == target:",
    "            return i",
    spec.mode === "find" ? "    return -1" : '    raise ValueError("substring not found")',
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    FOR:           offset + 2,
    CHECK:         offset + 3,
    RETURN_FOUND:  offset + 4,
    FAIL:          offset + 5,
  }
  return { lines, lineIdx, collapseBefore }
}

export type StringFindStep = {
  i:           number | null   // 지금 확인 중(또는 찾아낸) 시작 위치
  resultIndex: number | null   // 찾았을 때 위치 (종료 스텝에서만)
  raised:      boolean         // index 모드에서 못 찾아 오류 발생 시 true (종료 스텝에서만)
  codeLines:   number[]
  caption:     string
}

function computeStringFindSteps(spec: StringFindSpec, lineIdx: ReturnType<typeof buildStringFindPseudocode>["lineIdx"]): StringFindStep[] {
  const { text, target, mode } = spec
  const steps: StringFindStep[] = []
  const maxStart = text.length - target.length

  function pushStep(partial: Pick<StringFindStep, "codeLines" | "caption"> & Partial<Pick<StringFindStep, "i" | "resultIndex" | "raised">>) {
    steps.push({ i: partial.i ?? null, resultIndex: partial.resultIndex ?? null, raised: partial.raised ?? false, codeLines: partial.codeLines, caption: partial.caption })
  }

  for (let i = 0; i <= maxStart; i++) {
    pushStep({ i, codeLines: [lineIdx.FOR], caption: `i=${i}에서 시작하는 부분을 확인합니다.` })
    const slice = text.slice(i, i + target.length)
    const match = slice === target
    pushStep({ i, codeLines: [lineIdx.CHECK], caption: `"${slice}"가 "${target}"과 같은가요? ${match ? "참" : "거짓"}` })
    if (match) {
      pushStep({ i, resultIndex: i, codeLines: [lineIdx.RETURN_FOUND], caption: `"${target}"을 인덱스 ${i}에서 찾았습니다.` })
      return steps
    }
  }

  if (mode === "find") {
    pushStep({ resultIndex: -1, codeLines: [lineIdx.FAIL], caption: "끝까지 찾지 못해 -1을 반환합니다." })
  } else {
    pushStep({ raised: true, codeLines: [lineIdx.FAIL], caption: "끝까지 찾지 못해 ValueError가 발생합니다!" })
  }
  return steps
}

export type StringFindVizResult =
  | { ok: true;  spec: StringFindSpec; steps: StringFindStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildStringFindVisualization(raw: string): StringFindVizResult {
  const parsed = parseStringFindSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildStringFindPseudocode(parsed.spec)
    const steps = computeStringFindSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `문자열 탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── split() (```string-split) ──

export type StringSplitSpec = { title?: string; text: string; delimiter?: string; varNames?: string[] }

export type StringSplitValidationResult =
  | { ok: true;  spec: StringSplitSpec }
  | { ok: false; error: string }

function splitTokens(text: string, delimiter?: string): string[] {
  return delimiter !== undefined ? text.split(delimiter) : text.trim().split(/\s+/)
}

export function parseStringSplitSpec(raw: string): StringSplitValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "문자열 분리 데이터 형식이 올바르지 않습니다." }
  }

  const { text, delimiter, varNames, title } = parsed

  if (typeof text !== "string" || text.length < TEXT_LEN_MIN || text.length > TEXT_LEN_MAX) {
    return { ok: false, error: `text는 길이 ${TEXT_LEN_MIN}~${TEXT_LEN_MAX}의 문자열이어야 합니다.` }
  }
  if (delimiter !== undefined && (typeof delimiter !== "string" || delimiter.length !== 1)) {
    return { ok: false, error: "delimiter는 길이 1의 문자여야 합니다." }
  }

  const tokens = splitTokens(text, delimiter)

  if (varNames !== undefined) {
    if (!Array.isArray(varNames) || varNames.length === 0) {
      return { ok: false, error: "varNames는 비어 있지 않은 배열이어야 합니다." }
    }
    for (const name of varNames) {
      if (typeof name !== "string" || !IDENTIFIER_RE.test(name)) {
        return { ok: false, error: `"${name}"은(는) 올바른 변수 이름이 아닙니다.` }
      }
      if (PY_KEYWORDS.has(name)) {
        return { ok: false, error: `"${name}"은(는) 파이썬 예약어라 변수 이름으로 쓸 수 없습니다.` }
      }
    }
    if (varNames.length !== tokens.length) {
      return { ok: false, error: `varNames 개수(${varNames.length})가 분리된 값 개수(${tokens.length})와 일치해야 합니다.` }
    }
  }

  return { ok: true, spec: { title, text, delimiter, varNames } }
}

function buildStringSplitPseudocode(spec: StringSplitSpec) {
  const delimArg = spec.delimiter !== undefined ? `'${spec.delimiter}'` : ""
  const contextLines = [`d = "${spec.text}"`]
  const collapseBefore = contextLines.length
  const lines = [...contextLines, ""]

  let splitLineIdx: number
  const printLineIdx: number[] = []

  if (spec.varNames && spec.varNames.length > 0) {
    splitLineIdx = lines.length
    lines.push(`${spec.varNames.join(", ")} = d.split(${delimArg})`)
    for (const name of spec.varNames) {
      printLineIdx.push(lines.length)
      lines.push(`print(${name})`)
    }
  } else {
    splitLineIdx = lines.length
    lines.push(`parts = d.split(${delimArg})`)
    printLineIdx.push(lines.length)
    lines.push("print(parts)")
  }

  return { lines, splitLineIdx, printLineIdx, collapseBefore }
}

export type StringSplitStep = {
  tokens:       string[]
  boxes:        { name: string; value: string }[] | null   // varNames 언패킹 완료 후에만 값 설정
  printedIndex: number | null   // 지금 출력 중인 print문 인덱스 (칩/상자 강조용)
  codeLines:    number[]
  caption:      string
}

function computeStringSplitSteps(spec: StringSplitSpec, lineIdxInfo: ReturnType<typeof buildStringSplitPseudocode>): StringSplitStep[] {
  const { splitLineIdx, printLineIdx } = lineIdxInfo
  const tokens = splitTokens(spec.text, spec.delimiter)
  const steps: StringSplitStep[] = []

  steps.push({
    tokens, boxes: null, printedIndex: null, codeLines: [splitLineIdx],
    caption: `"${spec.text}"를 ${spec.delimiter ? `'${spec.delimiter}'` : "공백"} 기준으로 나눕니다 → [${tokens.map(t => `'${t}'`).join(", ")}]`,
  })

  if (spec.varNames && spec.varNames.length > 0) {
    const boxes = spec.varNames.map((name, i) => ({ name, value: tokens[i] }))
    steps.push({
      tokens, boxes, printedIndex: null, codeLines: [splitLineIdx],
      caption: `나뉜 값들을 ${spec.varNames.join(", ")}에 순서대로 담습니다.`,
    })
    spec.varNames.forEach((name, i) => {
      steps.push({
        tokens, boxes, printedIndex: i, codeLines: [printLineIdx[i]],
        caption: `print(${name}) → ${tokens[i]}`,
      })
    })
  } else {
    steps.push({
      tokens, boxes: null, printedIndex: 0, codeLines: [printLineIdx[0]],
      caption: `parts 리스트를 출력합니다 → [${tokens.map(t => `'${t}'`).join(", ")}]`,
    })
  }

  return steps
}

export type StringSplitVizResult =
  | { ok: true;  spec: StringSplitSpec; steps: StringSplitStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildStringSplitVisualization(raw: string): StringSplitVizResult {
  const parsed = parseStringSplitSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const pseudo = buildStringSplitPseudocode(parsed.spec)
    const steps = computeStringSplitSteps(parsed.spec, pseudo)
    return { ok: true, spec: parsed.spec, steps, pseudocode: pseudo.lines, codeCollapseBefore: pseudo.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `문자열 분리 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── join() (```string-join) ──

export type StringJoinSpec = { title?: string; items: string[]; delimiter: string }

const ITEMS_LEN_MIN = 1
const ITEMS_LEN_MAX = 8

export type StringJoinValidationResult =
  | { ok: true;  spec: StringJoinSpec }
  | { ok: false; error: string }

export function parseStringJoinSpec(raw: string): StringJoinValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "문자열 결합 데이터 형식이 올바르지 않습니다." }
  }

  const { items, delimiter, title } = parsed

  if (!Array.isArray(items) || items.length < ITEMS_LEN_MIN || items.length > ITEMS_LEN_MAX || !items.every((v: any) => typeof v === "string" && v.length > 0)) {
    return { ok: false, error: `items는 길이 ${ITEMS_LEN_MIN}~${ITEMS_LEN_MAX}의 비어 있지 않은 문자열 배열이어야 합니다.` }
  }
  if (typeof delimiter !== "string") {
    return { ok: false, error: "delimiter는 문자열이어야 합니다." }
  }

  return { ok: true, spec: { title, items, delimiter } }
}

function buildStringJoinPseudocode(spec: StringJoinSpec) {
  const itemsLiteral = spec.items.map(i => `"${i}"`).join(", ")
  const contextLines = [`words = [${itemsLiteral}]`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    `result = "${spec.delimiter}".join(words)`,
    "print(result)",
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = { JOIN: offset, PRINT: offset + 1 }
  return { lines, lineIdx, collapseBefore }
}

export type StringJoinStep = {
  mergedCount: number   // 지금까지 합쳐진 아이템 개수 (0 = 시작 전)
  partial:     string   // 지금까지 합쳐진 문자열 스냅샷
  codeLines:   number[]
  caption:     string
}

function computeStringJoinSteps(spec: StringJoinSpec, lineIdx: ReturnType<typeof buildStringJoinPseudocode>["lineIdx"]): StringJoinStep[] {
  const steps: StringJoinStep[] = []

  steps.push({ mergedCount: 0, partial: "", codeLines: [lineIdx.JOIN], caption: `구분자 "${spec.delimiter}"로 items를 합칠 준비를 합니다.` })

  for (let i = 1; i <= spec.items.length; i++) {
    const partial = spec.items.slice(0, i).join(spec.delimiter)
    steps.push({ mergedCount: i, partial, codeLines: [lineIdx.JOIN], caption: `'${spec.items[i - 1]}'을(를) 이어붙입니다 → '${partial}'` })
  }

  const final = spec.items.join(spec.delimiter)
  steps.push({ mergedCount: spec.items.length, partial: final, codeLines: [lineIdx.PRINT], caption: `최종 결과 '${final}'를 출력합니다.` })

  return steps
}

export type StringJoinVizResult =
  | { ok: true;  spec: StringJoinSpec; steps: StringJoinStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildStringJoinVisualization(raw: string): StringJoinVizResult {
  const parsed = parseStringJoinSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildStringJoinPseudocode(parsed.spec)
    const steps = computeStringJoinSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `문자열 결합 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
