// 파이썬가이드 "4장. 문자열 포맷팅" 챕터 본문의 ```format-align / ```format-thousands /
// ```format-base 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로
// 스텝을 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.

// ── 정렬/채우기 비교 (```format-align) ──
// 알고리즘이 아니라 "여러 포맷 스펙을 하나씩 넘겨보는 비교 슬라이드"다.

export type FormatAlignSpec = { title?: string; value: string | number; specs: string[] }

const VALUE_STR_LEN_MIN = 1
const VALUE_STR_LEN_MAX = 15
const SPECS_LEN_MIN = 1
const SPECS_LEN_MAX = 6
const SPEC_WIDTH_MIN = 1
const SPEC_WIDTH_MAX = 20
const SPEC_RE = /^(.)?([<>^])(\d{1,2})$/
const ALIGN_NAME: Record<string, string> = { "<": "왼쪽", ">": "오른쪽", "^": "가운데" }

export type FormatAlignValidationResult =
  | { ok: true;  spec: FormatAlignSpec }
  | { ok: false; error: string }

export function parseFormatAlignSpec(raw: string): FormatAlignValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "정렬/채우기 데이터 형식이 올바르지 않습니다." }
  }

  const { value, specs, title } = parsed
  const isStr = typeof value === "string"

  if (!isStr && typeof value !== "number") {
    return { ok: false, error: "value는 문자열 또는 숫자여야 합니다." }
  }
  if (isStr && (value.length < VALUE_STR_LEN_MIN || value.length > VALUE_STR_LEN_MAX)) {
    return { ok: false, error: `value 문자열은 길이 ${VALUE_STR_LEN_MIN}~${VALUE_STR_LEN_MAX}여야 합니다.` }
  }
  if (!isStr && !Number.isInteger(value)) {
    return { ok: false, error: "value가 숫자면 정수여야 합니다." }
  }
  if (!Array.isArray(specs) || specs.length < SPECS_LEN_MIN || specs.length > SPECS_LEN_MAX) {
    return { ok: false, error: `specs는 길이 ${SPECS_LEN_MIN}~${SPECS_LEN_MAX}의 배열이어야 합니다.` }
  }
  for (const s of specs) {
    const m = typeof s === "string" ? SPEC_RE.exec(s) : null
    if (!m) {
      return { ok: false, error: `"${s}"는 올바른 포맷 스펙이 아닙니다. (예: "<10", ">10", "^10", "0>10")` }
    }
    const width = parseInt(m[3], 10)
    if (width < SPEC_WIDTH_MIN || width > SPEC_WIDTH_MAX) {
      return { ok: false, error: `너비는 ${SPEC_WIDTH_MIN}~${SPEC_WIDTH_MAX} 사이여야 합니다.` }
    }
  }

  return { ok: true, spec: { title, value, specs } }
}

function buildFormatAlignPseudocode(spec: FormatAlignSpec) {
  const isStr = typeof spec.value === "string"
  const varName = isStr ? "txt" : "num"
  const literal = isStr ? `"${spec.value}"` : String(spec.value)
  const contextLines = [`${varName} = ${literal}`]
  const collapseBefore = contextLines.length
  const bodyLines = spec.specs.map(s => `print(f"'{${varName}:${s}}'")`)
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const printLineIdx = spec.specs.map((_, i) => offset + i)
  return { lines, printLineIdx, collapseBefore }
}

function pyFormatAlign(value: string, fill: string, align: "<" | ">" | "^", width: number): string {
  const len = value.length
  if (len >= width) return value
  const padTotal = width - len
  if (align === "<") return value + fill.repeat(padTotal)
  if (align === ">") return fill.repeat(padTotal) + value
  const left = Math.floor(padTotal / 2)
  const right = padTotal - left
  return fill.repeat(left) + value + fill.repeat(right)
}

export type FormatAlignStep = {
  fill:   string
  align:  "<" | ">" | "^"
  width:  number
  result: string
  codeLines: number[]
  caption: string
}

function computeFormatAlignSteps(spec: FormatAlignSpec, printLineIdx: number[]): FormatAlignStep[] {
  const rawValue = typeof spec.value === "string" ? spec.value : String(spec.value)
  return spec.specs.map((s, i) => {
    const m = SPEC_RE.exec(s)!
    const fill = m[1] ?? " "
    const align = m[2] as "<" | ">" | "^"
    const width = parseInt(m[3], 10)
    const result = pyFormatAlign(rawValue, fill, align, width)
    return {
      fill, align, width, result,
      codeLines: [printLineIdx[i]],
      caption: `채움문자='${fill}', 정렬=${ALIGN_NAME[align]}, 너비=${width} → '${result}'`,
    }
  })
}

export type FormatAlignVizResult =
  | { ok: true;  spec: FormatAlignSpec; steps: FormatAlignStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildFormatAlignVisualization(raw: string): FormatAlignVizResult {
  const parsed = parseFormatAlignSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, printLineIdx, collapseBefore } = buildFormatAlignPseudocode(parsed.spec)
    const steps = computeFormatAlignSteps(parsed.spec, printLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `정렬/채우기 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 천 단위 구분 기호 (```format-thousands) ──

export type FormatThousandsSpec = { title?: string; number: number }

export type FormatThousandsValidationResult =
  | { ok: true;  spec: FormatThousandsSpec }
  | { ok: false; error: string }

export function parseFormatThousandsSpec(raw: string): FormatThousandsValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "천 단위 구분 데이터 형식이 올바르지 않습니다." }
  }

  const { number, title } = parsed

  if (!Number.isInteger(number) || number < 0 || !Number.isSafeInteger(number) || String(number).length > 12) {
    return { ok: false, error: "number는 0 이상, 12자리 이하의 정수여야 합니다." }
  }

  return { ok: true, spec: { title, number } }
}

function buildFormatThousandsPseudocode(spec: FormatThousandsSpec) {
  const contextLines = [`s = ${spec.number}`]
  const collapseBefore = contextLines.length
  const bodyLines = [`print(f"{s:,}")`]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = { PRINT: offset }
  return { lines, lineIdx, collapseBefore }
}

function groupDigits(digits: string): string[] {
  const chunks: string[] = []
  let end = digits.length
  while (end > 0) {
    const start = Math.max(0, end - 3)
    chunks.unshift(digits.slice(start, end))
    end = start
  }
  return chunks
}

export type FormatThousandsStep = {
  groupsTaken: number   // 오른쪽부터 지금까지 가져온 3자리 그룹 수
  partial:     string   // 지금까지 조립된 결과 문자열 (오른쪽 → 왼쪽으로 자라남)
  codeLines:   number[]
  caption:     string
}

function computeFormatThousandsSteps(spec: FormatThousandsSpec, lineIdx: ReturnType<typeof buildFormatThousandsPseudocode>["lineIdx"]): FormatThousandsStep[] {
  const digits = String(spec.number)
  const chunks = groupDigits(digits)
  const steps: FormatThousandsStep[] = []

  steps.push({ groupsTaken: 0, partial: "", codeLines: [lineIdx.PRINT], caption: `숫자 ${digits}를 오른쪽부터 3자리씩 끊어봅니다.` })

  let partial = ""
  for (let idx = chunks.length - 1; idx >= 0; idx--) {
    const chunk = chunks[idx]
    partial = idx === chunks.length - 1 ? chunk : `${chunk},${partial}`
    const groupsTaken = chunks.length - idx
    steps.push({
      groupsTaken, partial, codeLines: [lineIdx.PRINT],
      caption: `오른쪽에서 ${groupsTaken}번째 그룹 '${chunk}'을 가져와 왼쪽에 붙입니다 → '${partial}'`,
    })
  }

  steps.push({ groupsTaken: chunks.length, partial, codeLines: [lineIdx.PRINT], caption: `f"{s:,}" 결과 → '${partial}'` })
  return steps
}

export type FormatThousandsVizResult =
  | { ok: true;  spec: FormatThousandsSpec; steps: FormatThousandsStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildFormatThousandsVisualization(raw: string): FormatThousandsVizResult {
  const parsed = parseFormatThousandsSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildFormatThousandsPseudocode(parsed.spec)
    const steps = computeFormatThousandsSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `천 단위 구분 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 진법 변환 (```format-base) ──
// f"{num:b}" 등은 문서에 실제 소스가 없는 내장 동작이라, find/bisect_left 때와
// 동일하게 "개념적 구현"이라고 명시적으로 라벨링한 코드를 보여준다.

export type FormatBaseSpec = { title?: string; number: number; base: 2 | 8 | 16 }

const BASE_NUMBER_MAX = 1023

export type FormatBaseValidationResult =
  | { ok: true;  spec: FormatBaseSpec }
  | { ok: false; error: string }

export function parseFormatBaseSpec(raw: string): FormatBaseValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "진법 변환 데이터 형식이 올바르지 않습니다." }
  }

  const { number, base, title } = parsed

  if (!Number.isInteger(number) || number < 0 || number > BASE_NUMBER_MAX) {
    return { ok: false, error: `number는 0~${BASE_NUMBER_MAX} 사이의 정수여야 합니다.` }
  }
  if (base !== 2 && base !== 8 && base !== 16) {
    return { ok: false, error: "base는 2, 8, 16 중 하나여야 합니다." }
  }

  return { ok: true, spec: { title, number, base } }
}

function buildFormatBasePseudocode(spec: FormatBaseSpec) {
  const fmtChar = spec.base === 2 ? "b" : spec.base === 8 ? "o" : "x"
  const contextLines = [`num = ${spec.number}`, `base = ${spec.base}`]
  const collapseBefore = contextLines.length
  const bodyLines = [
    `# f"{num:${fmtChar}}"가 내부적으로 하는 일 (개념적 구현)`,
    "def to_base(num, base):",
    "    if num == 0:",
    '        return "0"',
    "    digits = []",
    "    while num > 0:",
    "        digits.append(str(num % base))",
    "        num = num // base",
    '    return "".join(reversed(digits))',
  ]
  const offset = contextLines.length + 1
  const lines = [...contextLines, "", ...bodyLines]
  const lineIdx = {
    ZERO_CHECK:  offset + 2,
    ZERO_RETURN: offset + 3,
    INIT_DIGITS: offset + 4,
    WHILE:       offset + 5,
    MOD:         offset + 6,
    DIV:         offset + 7,
    RETURN:      offset + 8,
  }
  return { lines, lineIdx, collapseBefore }
}

const HEX_DIGITS = "0123456789abcdef"

function digitChar(rem: number, base: number): string {
  return base === 16 ? HEX_DIGITS[rem] : String(rem)
}

export type FormatBaseStep = {
  current:    number         // 지금 나누기 대상(몫)
  remainders: string[]       // 지금까지 모은 나머지 (수집 순서, 진법에 맞게 변환된 문자)
  result:     string | null  // 종료 스텝에서만 값 설정
  codeLines:  number[]
  caption:    string
}

function computeFormatBaseSteps(spec: FormatBaseSpec, lineIdx: ReturnType<typeof buildFormatBasePseudocode>["lineIdx"]): FormatBaseStep[] {
  const { number, base } = spec
  const steps: FormatBaseStep[] = []

  if (number === 0) {
    steps.push({ current: 0, remainders: [], result: null, codeLines: [lineIdx.ZERO_CHECK], caption: "num이 0이므로 기저 조건에 해당합니다." })
    steps.push({ current: 0, remainders: [], result: "0", codeLines: [lineIdx.ZERO_RETURN], caption: `"0"을 반환합니다.` })
    return steps
  }

  steps.push({ current: number, remainders: [], result: null, codeLines: [lineIdx.ZERO_CHECK], caption: `num(${number})이 0이 아니므로 계속 진행합니다.` })
  steps.push({ current: number, remainders: [], result: null, codeLines: [lineIdx.INIT_DIGITS], caption: "나머지를 모을 빈 리스트를 준비합니다." })

  let current = number
  const remainders: string[] = []
  while (current > 0) {
    steps.push({ current, remainders: [...remainders], result: null, codeLines: [lineIdx.WHILE], caption: `num(${current}) > 0인 동안 반복합니다.` })
    const prev = current
    const rem = prev % base
    remainders.push(digitChar(rem, base))
    steps.push({
      current: prev, remainders: [...remainders], result: null, codeLines: [lineIdx.MOD],
      caption: `${prev} % ${base} = ${rem} → 나머지 '${digitChar(rem, base)}'를 추가합니다.`,
    })
    current = Math.floor(prev / base)
    steps.push({
      current, remainders: [...remainders], result: null, codeLines: [lineIdx.DIV],
      caption: `${prev} // ${base} = ${current} → num을 갱신합니다.`,
    })
  }

  steps.push({ current, remainders: [...remainders], result: null, codeLines: [lineIdx.WHILE], caption: "num이 0이 되어 반복을 마칩니다." })
  const result = [...remainders].reverse().join("")
  steps.push({ current, remainders: [...remainders], result, codeLines: [lineIdx.RETURN], caption: `나머지를 뒤집어 합치면 '${result}'가 됩니다.` })

  return steps
}

export type FormatBaseVizResult =
  | { ok: true;  spec: FormatBaseSpec; steps: FormatBaseStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildFormatBaseVisualization(raw: string): FormatBaseVizResult {
  const parsed = parseFormatBaseSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildFormatBasePseudocode(parsed.spec)
    const steps = computeFormatBaseSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `진법 변환 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
