// 파이썬가이드 "2장. 변수와 입출력" 챕터 본문의 ```var-assign / ```input-parse-pipeline
// 코드펜스에 들어가는 JSON을 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리
// 계산해둔다. React에 의존하지 않는 순수 함수 모음.

// ── 변수 할당 (```var-assign) ──

export type VarAssignOp = { name: string; value: string | number | boolean }
export type VarAssignSpec = { title?: string; operations: VarAssignOp[] }

const VAR_OPS_MIN = 1
const VAR_OPS_MAX = 10
export const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/
export const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
])

export type VarAssignValidationResult =
  | { ok: true;  spec: VarAssignSpec }
  | { ok: false; error: string }

export function parseVarAssignSpec(raw: string): VarAssignValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "변수 할당 데이터 형식이 올바르지 않습니다." }
  }

  const { operations, title } = parsed

  if (!Array.isArray(operations) || operations.length < VAR_OPS_MIN || operations.length > VAR_OPS_MAX) {
    return { ok: false, error: `operations는 길이 ${VAR_OPS_MIN}~${VAR_OPS_MAX}의 배열이어야 합니다.` }
  }

  for (const op of operations) {
    if (typeof op?.name !== "string" || !IDENTIFIER_RE.test(op.name)) {
      return { ok: false, error: `"${op?.name}"은(는) 올바른 변수 이름이 아닙니다.` }
    }
    if (PY_KEYWORDS.has(op.name)) {
      return { ok: false, error: `"${op.name}"은(는) 파이썬 예약어라 변수 이름으로 쓸 수 없습니다.` }
    }
    const t = typeof op.value
    if (t !== "string" && t !== "number" && t !== "boolean") {
      return { ok: false, error: "value는 문자열, 숫자, 불(boolean)만 가능합니다." }
    }
  }

  return { ok: true, spec: { title, operations } }
}

function pyLiteral(value: string | number | boolean): string {
  if (typeof value === "string") return `'${value.replace(/'/g, "\\'")}'`
  if (typeof value === "boolean") return value ? "True" : "False"
  return String(value)
}

function pyPrintFormat(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "True" : "False"
  return String(value)
}

function buildVarAssignPseudocode(spec: VarAssignSpec) {
  const lines: string[] = []
  const opLineIdx: number[] = []

  for (const op of spec.operations) {
    opLineIdx.push(lines.length)
    lines.push(`${op.name} = ${pyLiteral(op.value)}`)
  }

  lines.push("")
  const printLineIdx = lines.length
  const names = [...new Set(spec.operations.map(o => o.name))]
  lines.push(`print(${names.join(", ")})`)

  return { lines, opLineIdx, printLineIdx, collapseBefore: 0 }
}

export type VarAssignStep = {
  boxes:       { name: string; value: string | number | boolean }[]   // 첫 등장 순서 유지, 재대입 시 값만 갱신
  activeName:  string | null   // 이번 스텝에서 생성/갱신된 변수 (print 스텝에서는 null)
  printedLine: string | null   // 마지막 print 스텝에서만 값 설정
  codeLines:   number[]
  caption:     string
}

function computeVarAssignSteps(spec: VarAssignSpec, opLineIdx: number[], printLineIdx: number): VarAssignStep[] {
  const steps: VarAssignStep[] = []
  const boxes: { name: string; value: string | number | boolean }[] = []

  spec.operations.forEach((op, i) => {
    const existing = boxes.find(b => b.name === op.name)
    if (existing) {
      existing.value = op.value
      steps.push({
        boxes: boxes.map(b => ({ ...b })), activeName: op.name, printedLine: null,
        codeLines: [opLineIdx[i]], caption: `${op.name}의 값을 ${pyLiteral(op.value)}로 바꿉니다.`,
      })
    } else {
      boxes.push({ name: op.name, value: op.value })
      steps.push({
        boxes: boxes.map(b => ({ ...b })), activeName: op.name, printedLine: null,
        codeLines: [opLineIdx[i]], caption: `${op.name} 상자를 만들고 ${pyLiteral(op.value)}를 저장합니다.`,
      })
    }
  })

  const printedLine = boxes.map(b => pyPrintFormat(b.value)).join(" ")
  steps.push({
    boxes: boxes.map(b => ({ ...b })), activeName: null, printedLine,
    codeLines: [printLineIdx], caption: `모든 변수를 출력합니다 → ${printedLine}`,
  })

  return steps
}

export type VarAssignVizResult =
  | { ok: true;  spec: VarAssignSpec; steps: VarAssignStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildVarAssignVisualization(raw: string): VarAssignVizResult {
  const parsed = parseVarAssignSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, opLineIdx, printLineIdx, collapseBefore } = buildVarAssignPseudocode(parsed.spec)
    const steps = computeVarAssignSteps(parsed.spec, opLineIdx, printLineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `변수 할당 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 입력 파싱 파이프라인 (```input-parse-pipeline) ──

export type InputParsePipelineSpec = { title?: string; input: string }

const INPUT_LEN_MIN = 1
const INPUT_LEN_MAX = 40

export type InputParsePipelineValidationResult =
  | { ok: true;  spec: InputParsePipelineSpec }
  | { ok: false; error: string }

export function parseInputParsePipelineSpec(raw: string): InputParsePipelineValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "입력 파싱 데이터 형식이 올바르지 않습니다." }
  }

  const { input, title } = parsed

  if (typeof input !== "string" || input.length < INPUT_LEN_MIN || input.length > INPUT_LEN_MAX) {
    return { ok: false, error: `input은 길이 ${INPUT_LEN_MIN}~${INPUT_LEN_MAX}의 문자열이어야 합니다.` }
  }
  const tokens = input.trim().split(/\s+/)
  if (tokens.length === 0 || tokens.some(t => !/^-?\d+$/.test(t))) {
    return { ok: false, error: "input은 공백으로 구분된 정수들이어야 합니다 (int() 변환이 가능해야 합니다)." }
  }

  return { ok: true, spec: { title, input } }
}

function buildInputParsePipelinePseudocode(spec: InputParsePipelineSpec) {
  const lines = [
    `line = input()          # 사용자가 "${spec.input}"을 입력했다고 가정`,
    "parts = line.split()",
    "mapped = map(int, parts)",
    "numbers = list(mapped)",
    "print(numbers)",
  ]
  const lineIdx = { LINE: 0, SPLIT: 1, MAP: 2, LIST: 3, PRINT: 4 }
  return { lines, lineIdx, collapseBefore: 0 }
}

export type InputParsePipelineStep = {
  tokens:  string[] | null   // .split() 이후
  numbers: number[] | null   // list(map(...)) 이후
  codeLines: number[]
  caption: string
}

function computeInputParsePipelineSteps(spec: InputParsePipelineSpec, lineIdx: ReturnType<typeof buildInputParsePipelinePseudocode>["lineIdx"]): InputParsePipelineStep[] {
  const steps: InputParsePipelineStep[] = []

  steps.push({ tokens: null, numbers: null, codeLines: [lineIdx.LINE], caption: `사용자가 입력한 문자열 "${spec.input}"을 읽습니다.` })

  const tokens = spec.input.trim().split(/\s+/)
  steps.push({
    tokens, numbers: null, codeLines: [lineIdx.SPLIT],
    caption: `공백을 기준으로 나눠 [${tokens.map(t => `'${t}'`).join(", ")}] 리스트를 만듭니다.`,
  })

  steps.push({
    tokens, numbers: null, codeLines: [lineIdx.MAP],
    caption: "각 문자열에 int()를 적용할 준비만 해둡니다. 아직 실제로 숫자로 바뀐 건 아니고, 다음 줄에서 list()로 꺼낼 때 진짜로 변환됩니다.",
  })

  const numbers = tokens.map(Number)
  steps.push({
    tokens, numbers, codeLines: [lineIdx.LIST],
    caption: `list()로 감싸서 실제 정수 리스트 [${numbers.join(", ")}]를 만듭니다.`,
  })

  steps.push({ tokens, numbers, codeLines: [lineIdx.PRINT], caption: `numbers = [${numbers.join(", ")}]를 출력합니다.` })

  return steps
}

export type InputParsePipelineVizResult =
  | { ok: true;  spec: InputParsePipelineSpec; steps: InputParsePipelineStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildInputParsePipelineVisualization(raw: string): InputParsePipelineVizResult {
  const parsed = parseInputParsePipelineSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildInputParsePipelinePseudocode(parsed.spec)
    const steps = computeInputParsePipelineSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `입력 파싱 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
