// 알고리즘학습 "1단계. 정렬과 리스트 심화" 챕터 본문의 ```key-sort-trace /
// ```dict-count-trace / ```list-vs-set-lookup / ```min-max-track /
// ```set-operations / ```sort-mutate-compare 코드펜스에 들어가는 JSON을
// 파싱/검증하고, 실제 코드와 동일한 순서로 스텝을 미리 계산해둔다. React에
// 의존하지 않는 순수 함수 모음.
//
// key 함수(len/abs/lambda 등)의 실제 동작은 해석하지 않는다. 관리자가 이미
// 계산해 둔 "이름표" 값을 JSON으로 직접 받아 비교·정렬만 TS로 수행한다 —
// 이 세션 전체에서 지켜온 "구조화된 데이터만 받고 해석은 고정 로직으로" 원칙.

import { IDENTIFIER_RE, PY_KEYWORDS } from "@/lib/basicsTraversal"

function isValidName(name: unknown): name is string {
  return typeof name === "string" && IDENTIFIER_RE.test(name) && !PY_KEYWORDS.has(name)
}

function pyStr(s: string): string {
  return `'${s.replace(/'/g, "\\'")}'`
}

// ── key 정렬 — 이름표 붙이기 (```key-sort-trace) ──

export type KeySortSpec = {
  title?: string
  varName: string
  keyExprText: string
  items: { display: string; keyParts: (number | string)[] }[]
  reverse?: boolean
}

const KS_ITEMS_MIN = 2
const KS_ITEMS_MAX = 8
const KS_KEYPARTS_MIN = 1
const KS_KEYPARTS_MAX = 3
const KS_DISPLAY_LEN_MAX = 24
const KS_NUM_MIN = -1000
const KS_NUM_MAX = 1000

export type KeySortValidationResult =
  | { ok: true;  spec: KeySortSpec }
  | { ok: false; error: string }

export function parseKeySortSpec(raw: string): KeySortValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "key 정렬 데이터 형식이 올바르지 않습니다." }
  }

  const { title, varName, keyExprText, items, reverse } = parsed

  if (!isValidName(varName)) {
    return { ok: false, error: `"${varName}"은(는) 올바른 변수 이름이 아닙니다.` }
  }
  if (typeof keyExprText !== "string" || keyExprText.length < 1 || keyExprText.length > 40) {
    return { ok: false, error: "keyExprText는 길이 1~40의 문자열이어야 합니다." }
  }
  if (!Array.isArray(items) || items.length < KS_ITEMS_MIN || items.length > KS_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${KS_ITEMS_MIN}~${KS_ITEMS_MAX}의 배열이어야 합니다.` }
  }
  if (reverse !== undefined && typeof reverse !== "boolean") {
    return { ok: false, error: "reverse는 불(boolean)이어야 합니다." }
  }

  let keyLen = -1
  for (const it of items) {
    if (typeof it?.display !== "string" || it.display.length < 1 || it.display.length > KS_DISPLAY_LEN_MAX) {
      return { ok: false, error: `display는 길이 1~${KS_DISPLAY_LEN_MAX}의 문자열이어야 합니다.` }
    }
    if (!Array.isArray(it.keyParts) || it.keyParts.length < KS_KEYPARTS_MIN || it.keyParts.length > KS_KEYPARTS_MAX) {
      return { ok: false, error: `keyParts는 길이 ${KS_KEYPARTS_MIN}~${KS_KEYPARTS_MAX}의 배열이어야 합니다.` }
    }
    if (keyLen === -1) keyLen = it.keyParts.length
    else if (it.keyParts.length !== keyLen) {
      return { ok: false, error: "모든 항목의 keyParts 길이는 같아야 합니다." }
    }
  }
  for (let p = 0; p < keyLen; p++) {
    const types = new Set(items.map((it: any) => typeof it.keyParts[p]))
    if (types.size > 1 || !(types.has("number") || types.has("string"))) {
      return { ok: false, error: `keyParts의 ${p}번째 자리는 모든 항목에서 같은 타입(숫자 또는 문자열)이어야 합니다.` }
    }
    for (const it of items) {
      const v = it.keyParts[p]
      if (typeof v === "number") {
        if (!Number.isInteger(v) || v < KS_NUM_MIN || v > KS_NUM_MAX) {
          return { ok: false, error: `keyParts의 숫자는 ${KS_NUM_MIN}~${KS_NUM_MAX} 사이의 정수여야 합니다.` }
        }
      } else if (typeof v === "string") {
        if (v.length > KS_DISPLAY_LEN_MAX) return { ok: false, error: `keyParts의 문자열은 길이 ${KS_DISPLAY_LEN_MAX} 이하여야 합니다.` }
      }
    }
  }

  return { ok: true, spec: { title, varName, keyExprText, items, reverse } }
}

function buildKeySortPseudocode(spec: KeySortSpec) {
  const contextLines = [`${spec.varName} = [${spec.items.map(it => it.display).join(", ")}]`]
  const collapseBefore = contextLines.length
  const offset = contextLines.length + 1
  const sortExpr = `sorted(${spec.varName}, key=${spec.keyExprText}${spec.reverse ? ", reverse=True" : ""})`
  const lines = [...contextLines, "", `print(${sortExpr})`]
  return { lines, lineIdx: { INIT: 0, SORT: offset }, collapseBefore }
}

export type KeySortStep = {
  labeledUpTo: number
  sortedOrder: number[] | null
  finished:    boolean
  codeLines:   number[]
  caption:     string
}

type KeySortLineIdx = ReturnType<typeof buildKeySortPseudocode>["lineIdx"]

function computeKeySortSteps(spec: KeySortSpec, li: KeySortLineIdx): KeySortStep[] {
  const steps: KeySortStep[] = []
  const n = spec.items.length

  for (let i = 0; i < n; i++) {
    const it = spec.items[i]
    steps.push({ labeledUpTo: i, sortedOrder: null, finished: false, codeLines: [li.INIT],
      caption: `"${it.display}" → 이름표 (${it.keyParts.join(", ")})` })
  }

  const dir = spec.reverse ? -1 : 1
  const indices = spec.items.map((_, i) => i)
  indices.sort((a, b) => {
    const ka = spec.items[a].keyParts, kb = spec.items[b].keyParts
    for (let p = 0; p < ka.length; p++) {
      if (ka[p] < kb[p]) return -1 * dir
      if (ka[p] > kb[p]) return 1 * dir
    }
    return a - b   // 동점은 항상 원래 순서 유지 (안정 정렬 — reverse와 무관하게 유지되는 것이 실제 파이썬 동작)
  })

  steps.push({ labeledUpTo: n - 1, sortedOrder: [...indices], finished: false, codeLines: [li.SORT],
    caption: "이름표를 기준으로 정렬합니다. 이름표가 같으면 원래 순서를 그대로 유지합니다(안정 정렬)." })

  const resultText = indices.map(i => spec.items[i].display).join(", ")
  steps.push({ labeledUpTo: n - 1, sortedOrder: [...indices], finished: true, codeLines: [li.SORT],
    caption: `결과 → [${resultText}]` })

  return steps
}

export type KeySortVizResult =
  | { ok: true;  spec: KeySortSpec; steps: KeySortStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildKeySortVisualization(raw: string): KeySortVizResult {
  const parsed = parseKeySortSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const li = buildKeySortPseudocode(parsed.spec)
    const steps = computeKeySortSteps(parsed.spec, li.lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: li.lines, codeCollapseBefore: li.collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `key 정렬 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 딕셔너리로 빈도수 세기 (```dict-count-trace) ──

export type DictCountSpec = { title?: string; items: string[] }

const DC_ITEMS_MIN = 3
const DC_ITEMS_MAX = 12
const DC_STR_LEN_MAX = 10

export type DictCountValidationResult =
  | { ok: true;  spec: DictCountSpec }
  | { ok: false; error: string }

export function parseDictCountSpec(raw: string): DictCountValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "빈도수 세기 데이터 형식이 올바르지 않습니다." }
  }
  const { title, items } = parsed
  if (!Array.isArray(items) || items.length < DC_ITEMS_MIN || items.length > DC_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${DC_ITEMS_MIN}~${DC_ITEMS_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (typeof it !== "string" || it.length < 1 || it.length > DC_STR_LEN_MAX) {
      return { ok: false, error: `items 항목은 길이 1~${DC_STR_LEN_MAX}의 문자열이어야 합니다.` }
    }
  }
  return { ok: true, spec: { title, items } }
}

function buildDictCountPseudocode(spec: DictCountSpec) {
  const lines = [
    `words = [${spec.items.map(pyStr).join(", ")}]`,
    "cnt = {}",
    "",
    "for w in words:",
    "    cnt[w] = cnt.get(w, 0) + 1",
    "",
    "print(cnt)",
  ]
  return { lines, lineIdx: { WORDS: 0, CNT_INIT: 1, FOR: 3, UPDATE: 4, PRINT: 6 }, collapseBefore: 2 }
}

export type DictCountStep = {
  currentWord:  string | null
  beforeValue:  number | null
  orderedKeys:  string[]
  counts:       Record<string, number>
  finished:     boolean
  codeLines:    number[]
  caption:      string
}

type DictCountLineIdx = ReturnType<typeof buildDictCountPseudocode>["lineIdx"]

function dictDisplay(orderedKeys: string[], counts: Record<string, number>): string {
  return `{${orderedKeys.map(k => `${pyStr(k)}: ${counts[k]}`).join(", ")}}`
}

function computeDictCountSteps(spec: DictCountSpec, li: DictCountLineIdx): DictCountStep[] {
  const steps: DictCountStep[] = []
  const counts: Record<string, number> = {}
  const orderedKeys: string[] = []

  steps.push({ currentWord: null, beforeValue: null, orderedKeys: [], counts: {}, finished: false,
    codeLines: [li.CNT_INIT], caption: "cnt를 빈 딕셔너리로 초기화합니다." })

  for (const w of spec.items) {
    steps.push({ currentWord: w, beforeValue: null, orderedKeys: [...orderedKeys], counts: { ...counts }, finished: false,
      codeLines: [li.FOR], caption: `w에 ${pyStr(w)}를 담습니다.` })

    const before = counts[w] ?? 0
    if (before === 0) orderedKeys.push(w)
    counts[w] = before + 1
    steps.push({ currentWord: w, beforeValue: before, orderedKeys: [...orderedKeys], counts: { ...counts }, finished: false,
      codeLines: [li.UPDATE], caption: `cnt.get(${pyStr(w)}, 0) = ${before} → cnt[${pyStr(w)}] = ${counts[w]}` })
  }

  steps.push({ currentWord: null, beforeValue: null, orderedKeys: [...orderedKeys], counts: { ...counts }, finished: true,
    codeLines: [li.PRINT], caption: `cnt를 출력합니다 → ${dictDisplay(orderedKeys, counts)}` })

  return steps
}

export type DictCountVizResult =
  | { ok: true;  spec: DictCountSpec; steps: DictCountStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildDictCountVisualization(raw: string): DictCountVizResult {
  const parsed = parseDictCountSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildDictCountPseudocode(parsed.spec)
    const steps = computeDictCountSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `빈도수 세기 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 리스트 vs 집합 탐색 속도 (```list-vs-set-lookup) ──

export type ListVsSetLookupSpec = { title?: string; items: number[]; target: number }

const LVS_ITEMS_MIN = 4
const LVS_ITEMS_MAX = 12
const LVS_NUM_MIN = -1000
const LVS_NUM_MAX = 1000

export type ListVsSetLookupValidationResult =
  | { ok: true;  spec: ListVsSetLookupSpec }
  | { ok: false; error: string }

export function parseListVsSetLookupSpec(raw: string): ListVsSetLookupValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "리스트/집합 탐색 데이터 형식이 올바르지 않습니다." }
  }
  const { title, items, target } = parsed
  if (!Array.isArray(items) || items.length < LVS_ITEMS_MIN || items.length > LVS_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${LVS_ITEMS_MIN}~${LVS_ITEMS_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (!Number.isInteger(it) || it < LVS_NUM_MIN || it > LVS_NUM_MAX) {
      return { ok: false, error: `items 항목은 ${LVS_NUM_MIN}~${LVS_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (new Set(items).size !== items.length) {
    return { ok: false, error: "items는 서로 다른 값이어야 합니다(집합 성질 반영)." }
  }
  if (!Number.isInteger(target) || target < LVS_NUM_MIN || target > LVS_NUM_MAX) {
    return { ok: false, error: `target은 ${LVS_NUM_MIN}~${LVS_NUM_MAX} 사이의 정수여야 합니다.` }
  }
  return { ok: true, spec: { title, items, target } }
}

function buildListVsSetLookupPseudocode(spec: ListVsSetLookupSpec) {
  const lines = [
    `numbers = [${spec.items.join(", ")}]`,
    "st = set(numbers)",
    "",
    `x = ${spec.target}`,
    "",
    "x in numbers   # 리스트: 처음부터 하나씩 비교",
    "x in st        # 집합: 해시로 한 번에 확인",
  ]
  return { lines, lineIdx: { NUMBERS: 0, SET_INIT: 1, X_INIT: 3, LIST_CHECK: 5, SET_CHECK: 6 }, collapseBefore: 2 }
}

export type ListVsSetLookupStep = {
  listCheckedUpTo: number
  listFound:       boolean | null
  setChecked:      boolean
  setFound:        boolean | null
  finished:        boolean
  codeLines:       number[]
  caption:         string
}

type ListVsSetLookupLineIdx = ReturnType<typeof buildListVsSetLookupPseudocode>["lineIdx"]

function computeListVsSetLookupSteps(spec: ListVsSetLookupSpec, li: ListVsSetLookupLineIdx): ListVsSetLookupStep[] {
  const steps: ListVsSetLookupStep[] = []
  const n = spec.items.length

  steps.push({ listCheckedUpTo: -1, listFound: null, setChecked: false, setFound: null, finished: false,
    codeLines: [li.X_INIT], caption: `x = ${spec.target}로 정합니다.` })

  let found = false, foundIdx = -1
  for (let i = 0; i < n; i++) {
    const match = spec.items[i] === spec.target
    steps.push({ listCheckedUpTo: i, listFound: null, setChecked: false, setFound: null, finished: false,
      codeLines: [li.LIST_CHECK], caption: `numbers[${i}](${spec.items[i]})와 x(${spec.target}) 비교 → ${match ? "일치" : "불일치"}` })
    if (match) { found = true; foundIdx = i; break }
  }

  steps.push({ listCheckedUpTo: found ? foundIdx : n - 1, listFound: found, setChecked: false, setFound: null, finished: false,
    codeLines: [li.LIST_CHECK],
    caption: found ? `리스트에서 ${foundIdx + 1}번 비교 만에 찾았습니다.` : `리스트 끝까지(${n}번) 비교했지만 없습니다.` })

  const setFound = spec.items.includes(spec.target)
  const comparisons = found ? foundIdx + 1 : n
  steps.push({ listCheckedUpTo: found ? foundIdx : n - 1, listFound: found, setChecked: true, setFound, finished: true,
    codeLines: [li.SET_CHECK],
    caption: `집합은 해시로 한 번에 확인합니다 → ${setFound ? "있음" : "없음"}. 리스트는 ${comparisons}번 비교, 집합은 1번 확인.` })

  return steps
}

export type ListVsSetLookupVizResult =
  | { ok: true;  spec: ListVsSetLookupSpec; steps: ListVsSetLookupStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildListVsSetLookupVisualization(raw: string): ListVsSetLookupVizResult {
  const parsed = parseListVsSetLookupSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildListVsSetLookupPseudocode(parsed.spec)
    const steps = computeListVsSetLookupSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `리스트/집합 탐색 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 최솟값/최댓값 갱신 패턴 (```min-max-track) ──

export type MinMaxTrackSpec = { title?: string; items: number[]; mode: "min" | "max"; tie: "first" | "last" }

const MM_ITEMS_MIN = 3
const MM_ITEMS_MAX = 10
const MM_NUM_MIN = -1000
const MM_NUM_MAX = 1000

export type MinMaxTrackValidationResult =
  | { ok: true;  spec: MinMaxTrackSpec }
  | { ok: false; error: string }

export function parseMinMaxTrackSpec(raw: string): MinMaxTrackValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "최솟값/최댓값 데이터 형식이 올바르지 않습니다." }
  }
  const { title, items, mode, tie } = parsed
  if (!Array.isArray(items) || items.length < MM_ITEMS_MIN || items.length > MM_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${MM_ITEMS_MIN}~${MM_ITEMS_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (!Number.isInteger(it) || it < MM_NUM_MIN || it > MM_NUM_MAX) {
      return { ok: false, error: `items 항목은 ${MM_NUM_MIN}~${MM_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (mode !== "min" && mode !== "max") return { ok: false, error: 'mode는 "min" 또는 "max"여야 합니다.' }
  if (tie !== "first" && tie !== "last") return { ok: false, error: 'tie는 "first" 또는 "last"여야 합니다.' }
  return { ok: true, spec: { title, items, mode, tie } }
}

function buildMinMaxTrackPseudocode(spec: MinMaxTrackSpec) {
  const varName = spec.mode === "min" ? "min_val" : "max_val"
  const idxName = spec.mode === "min" ? "min_idx" : "max_idx"
  const initVal = spec.mode === "min" ? "float('inf')" : "float('-inf')"
  const op = spec.mode === "min"
    ? (spec.tie === "first" ? "<" : "<=")
    : (spec.tie === "first" ? ">" : ">=")
  const lines = [
    `numbers = [${spec.items.join(", ")}]`,
    "",
    `${varName} = ${initVal}`,
    `${idxName} = -1`,
    "for i, n in enumerate(numbers):",
    `    if n ${op} ${varName}:`,
    `        ${varName} = n`,
    `        ${idxName} = i`,
    "",
    `print(${varName}, ${idxName})`,
  ]
  return {
    lines,
    lineIdx: { INIT: 0, VAL_INIT: 2, IDX_INIT: 3, FOR: 4, CHECK: 5, UPDATE_VAL: 6, UPDATE_IDX: 7, PRINT: 9 },
    collapseBefore: 1,
  }
}

export type MinMaxItemState = "pending" | "current" | "champion" | "checked"
export type MinMaxTrackStep = {
  itemStates: MinMaxItemState[]
  bestVal:    number
  bestIdx:    number
  finished:   boolean
  codeLines:  number[]
  caption:    string
}

type MinMaxTrackLineIdx = ReturnType<typeof buildMinMaxTrackPseudocode>["lineIdx"]

function evalTie(a: number, b: number, mode: "min" | "max", tie: "first" | "last"): boolean {
  if (mode === "min") return tie === "first" ? a < b : a <= b
  return tie === "first" ? a > b : a >= b
}

function computeMinMaxTrackSteps(spec: MinMaxTrackSpec, li: MinMaxTrackLineIdx): MinMaxTrackStep[] {
  const steps: MinMaxTrackStep[] = []
  const itemStates: MinMaxItemState[] = spec.items.map(() => "pending")
  let best = spec.mode === "min" ? Infinity : -Infinity
  let bestIdx = -1

  const snapshot = (finished: boolean, codeLines: number[], caption: string): MinMaxTrackStep => ({
    itemStates: [...itemStates], bestVal: best, bestIdx, finished, codeLines, caption,
  })

  steps.push(snapshot(false, [li.VAL_INIT], `${spec.mode === "min" ? "min_val" : "max_val"}을 ${spec.mode === "min" ? "무한대" : "음의 무한대"}로 초기화합니다.`))
  steps.push(snapshot(false, [li.IDX_INIT], `${spec.mode === "min" ? "min_idx" : "max_idx"}를 -1로 초기화합니다.`))

  spec.items.forEach((n, i) => {
    itemStates[i] = "current"
    const better = evalTie(n, best, spec.mode, spec.tie)
    steps.push(snapshot(false, [li.CHECK], `numbers[${i}](${n})와 현재 값(${best === Infinity || best === -Infinity ? "없음" : best}) 비교 → ${better ? "참" : "거짓"}`))

    if (better) {
      best = n
      bestIdx = i
      itemStates[i] = "champion"
      steps.push(snapshot(false, [li.UPDATE_VAL], `${spec.mode === "min" ? "min_val" : "max_val"} = ${best}`))
      steps.push(snapshot(false, [li.UPDATE_IDX], `${spec.mode === "min" ? "min_idx" : "max_idx"} = ${bestIdx}`))
    } else {
      itemStates[i] = "checked"
    }
  })

  steps.push(snapshot(true, [li.PRINT], `${best} ${bestIdx}를 출력합니다.`))
  return steps
}

export type MinMaxTrackVizResult =
  | { ok: true;  spec: MinMaxTrackSpec; steps: MinMaxTrackStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildMinMaxTrackVisualization(raw: string): MinMaxTrackVizResult {
  const parsed = parseMinMaxTrackSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildMinMaxTrackPseudocode(parsed.spec)
    const steps = computeMinMaxTrackSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `최솟값/최댓값 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 집합 연산 (```set-operations) ──

export type SetOpKind = "intersection" | "union" | "difference" | "symmetric_difference"
export type SetOperationsSpec = { title?: string; a: number[]; b: number[]; op: SetOpKind }

const SO_ITEMS_MIN = 2
const SO_ITEMS_MAX = 8
const SO_NUM_MIN = -1000
const SO_NUM_MAX = 1000
const SO_SYMBOL: Record<SetOpKind, { expr: string; comment: string }> = {
  intersection:        { expr: "a & b", comment: "교집합" },
  union:                { expr: "a | b", comment: "합집합" },
  difference:           { expr: "a - b", comment: "차집합" },
  symmetric_difference: { expr: "a ^ b", comment: "대칭차집합" },
}

export type SetOperationsValidationResult =
  | { ok: true;  spec: SetOperationsSpec }
  | { ok: false; error: string }

function validateSetArray(arr: any, label: string): string | null {
  if (!Array.isArray(arr) || arr.length < SO_ITEMS_MIN || arr.length > SO_ITEMS_MAX) {
    return `${label}는 길이 ${SO_ITEMS_MIN}~${SO_ITEMS_MAX}의 배열이어야 합니다.`
  }
  for (const v of arr) {
    if (!Number.isInteger(v) || v < SO_NUM_MIN || v > SO_NUM_MAX) {
      return `${label} 항목은 ${SO_NUM_MIN}~${SO_NUM_MAX} 사이의 정수여야 합니다.`
    }
  }
  if (new Set(arr).size !== arr.length) return `${label}는 서로 다른 값이어야 합니다.`
  return null
}

export function parseSetOperationsSpec(raw: string): SetOperationsValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "집합 연산 데이터 형식이 올바르지 않습니다." }
  }
  const { title, a, b, op } = parsed
  const aErr = validateSetArray(a, "a")
  if (aErr) return { ok: false, error: aErr }
  const bErr = validateSetArray(b, "b")
  if (bErr) return { ok: false, error: bErr }
  if (!SO_SYMBOL[op as SetOpKind]) {
    return { ok: false, error: 'op는 "intersection"/"union"/"difference"/"symmetric_difference" 중 하나여야 합니다.' }
  }
  return { ok: true, spec: { title, a, b, op } }
}

function buildSetOperationsPseudocode(spec: SetOperationsSpec) {
  const sym = SO_SYMBOL[spec.op]
  const lines = [
    `a = {${spec.a.join(", ")}}`,
    `b = {${spec.b.join(", ")}}`,
    "",
    `print(${sym.expr})   # ${sym.comment}`,
  ]
  return { lines, lineIdx: { A_INIT: 0, B_INIT: 1, RESULT: 3 }, collapseBefore: 2 }
}

export type SetOpItemState = "pending" | "current" | "included" | "excluded"
export type SetOperationsStep = {
  aStates:  SetOpItemState[]
  bStates:  SetOpItemState[]
  result:   number[]
  finished: boolean
  codeLines: number[]
  caption:  string
}

type SetOperationsLineIdx = ReturnType<typeof buildSetOperationsPseudocode>["lineIdx"]

function computeSetOperationsSteps(spec: SetOperationsSpec, li: SetOperationsLineIdx): SetOperationsStep[] {
  const steps: SetOperationsStep[] = []
  const aStates: SetOpItemState[] = spec.a.map(() => "pending")
  const bStates: SetOpItemState[] = spec.b.map(() => "pending")
  const result: number[] = []
  const bSet = new Set(spec.b)
  const aSet = new Set(spec.a)

  const snapshot = (finished: boolean, caption: string): SetOperationsStep => ({
    aStates: [...aStates], bStates: [...bStates], result: [...result], finished, codeLines: [li.RESULT], caption,
  })

  if (spec.op === "intersection" || spec.op === "difference") {
    spec.a.forEach((x, i) => {
      aStates[i] = "current"
      const inB = bSet.has(x)
      const include = spec.op === "intersection" ? inB : !inB
      if (include) { aStates[i] = "included"; result.push(x) } else { aStates[i] = "excluded" }
      steps.push(snapshot(false, `${x} ${spec.op === "intersection" ? (inB ? "는 b에도 있음 → 포함" : "는 b에 없음 → 제외") : (inB ? "는 b에도 있음 → 제외" : "는 b에 없음 → 포함")}`))
    })
  } else {
    // union / symmetric_difference: a를 먼저 훑고 이어서 b를 훑는다
    spec.a.forEach((x, i) => {
      aStates[i] = "current"
      const include = spec.op === "union" ? true : !bSet.has(x)
      if (include) { aStates[i] = "included"; result.push(x) } else { aStates[i] = "excluded" }
      steps.push(snapshot(false, spec.op === "union" ? `${x}를 결과에 추가` : `${x}는 b에 ${bSet.has(x) ? "있음 → 제외" : "없음 → 포함"}`))
    })
    spec.b.forEach((x, i) => {
      bStates[i] = "current"
      const include = spec.op === "union" ? !aSet.has(x) : !aSet.has(x)
      if (include) { bStates[i] = "included"; result.push(x) } else { bStates[i] = "excluded" }
      steps.push(snapshot(false, spec.op === "union"
        ? (aSet.has(x) ? `${x}는 이미 결과에 있음 → 건너뜀` : `${x}를 결과에 추가`)
        : `${x}는 a에 ${aSet.has(x) ? "있음 → 제외" : "없음 → 포함"}`))
    })
  }

  const sortedResult = [...result].sort((x, y) => x - y)
  steps.push({ aStates: [...aStates], bStates: [...bStates], result: sortedResult, finished: true, codeLines: [li.RESULT],
    caption: `결과 → {${sortedResult.join(", ")}}` })

  return steps
}

export type SetOperationsVizResult =
  | { ok: true;  spec: SetOperationsSpec; steps: SetOperationsStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildSetOperationsVisualization(raw: string): SetOperationsVizResult {
  const parsed = parseSetOperationsSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildSetOperationsPseudocode(parsed.spec)
    const steps = computeSetOperationsSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `집합 연산 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── sort() vs sorted() (```sort-mutate-compare) ──

export type SortMutateCompareSpec = { title?: string; items: number[]; mode: "sort" | "sorted"; reverse?: boolean }

const SMC_ITEMS_MIN = 3
const SMC_ITEMS_MAX = 8
const SMC_NUM_MIN = -1000
const SMC_NUM_MAX = 1000

export type SortMutateCompareValidationResult =
  | { ok: true;  spec: SortMutateCompareSpec }
  | { ok: false; error: string }

export function parseSortMutateCompareSpec(raw: string): SortMutateCompareValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "sort/sorted 데이터 형식이 올바르지 않습니다." }
  }
  const { title, items, mode, reverse } = parsed
  if (!Array.isArray(items) || items.length < SMC_ITEMS_MIN || items.length > SMC_ITEMS_MAX) {
    return { ok: false, error: `items는 길이 ${SMC_ITEMS_MIN}~${SMC_ITEMS_MAX}의 배열이어야 합니다.` }
  }
  for (const it of items) {
    if (!Number.isInteger(it) || it < SMC_NUM_MIN || it > SMC_NUM_MAX) {
      return { ok: false, error: `items 항목은 ${SMC_NUM_MIN}~${SMC_NUM_MAX} 사이의 정수여야 합니다.` }
    }
  }
  if (mode !== "sort" && mode !== "sorted") return { ok: false, error: 'mode는 "sort" 또는 "sorted"여야 합니다.' }
  if (reverse !== undefined && typeof reverse !== "boolean") return { ok: false, error: "reverse는 불(boolean)이어야 합니다." }
  return { ok: true, spec: { title, items, mode, reverse } }
}

function buildSortMutateComparePseudocode(spec: SortMutateCompareSpec) {
  const revArg = spec.reverse ? "reverse=True" : ""
  if (spec.mode === "sort") {
    const lines = [
      `numbers = [${spec.items.join(", ")}]`,
      "",
      `numbers.sort(${revArg})`,
      "print(numbers)",
    ]
    return { lines, lineIdx: { INIT: 0, CALL: 2, PRINT_NEW: 3, PRINT_ORIG: -1 }, collapseBefore: 1 }
  }
  const lines = [
    `lst = [${spec.items.join(", ")}]`,
    "",
    `new_lst = sorted(lst${revArg ? `, ${revArg}` : ""})`,
    "print(new_lst)",
    "print(lst)",
  ]
  return { lines, lineIdx: { INIT: 0, CALL: 2, PRINT_NEW: 3, PRINT_ORIG: 4 }, collapseBefore: 1 }
}

export type SortMutateCompareStep = {
  original:   number[]
  resultList: number[] | null
  mutated:    boolean
  finished:   boolean
  codeLines:  number[]
  caption:    string
}

type SortMutateCompareLineIdx = ReturnType<typeof buildSortMutateComparePseudocode>["lineIdx"]

function computeSortMutateCompareSteps(spec: SortMutateCompareSpec, li: SortMutateCompareLineIdx): SortMutateCompareStep[] {
  const steps: SortMutateCompareStep[] = []
  const varName = spec.mode === "sort" ? "numbers" : "lst"

  steps.push({ original: [...spec.items], resultList: null, mutated: false, finished: false, codeLines: [li.INIT],
    caption: `${varName} = [${spec.items.join(", ")}]을 만듭니다.` })

  const sorted = [...spec.items].sort((a, b) => spec.reverse ? b - a : a - b)

  if (spec.mode === "sort") {
    steps.push({ original: sorted, resultList: null, mutated: true, finished: false, codeLines: [li.CALL],
      caption: `${varName}.sort()는 원본을 그 자리에서 정렬합니다. ${varName} 자체가 바뀝니다.` })
    steps.push({ original: sorted, resultList: null, mutated: true, finished: true, codeLines: [li.PRINT_NEW],
      caption: `${varName}를 출력합니다 → [${sorted.join(", ")}] (원본이 정렬된 상태)` })
  } else {
    steps.push({ original: [...spec.items], resultList: sorted, mutated: false, finished: false, codeLines: [li.CALL],
      caption: `sorted(${varName})는 새 리스트를 만듭니다. ${varName}은 그대로입니다.` })
    steps.push({ original: [...spec.items], resultList: sorted, mutated: false, finished: false, codeLines: [li.PRINT_NEW],
      caption: `new_lst를 출력합니다 → [${sorted.join(", ")}]` })
    steps.push({ original: [...spec.items], resultList: sorted, mutated: false, finished: true, codeLines: [li.PRINT_ORIG],
      caption: `${varName}를 출력합니다 → [${spec.items.join(", ")}] (원본은 바뀌지 않음)` })
  }

  return steps
}

export type SortMutateCompareVizResult =
  | { ok: true;  spec: SortMutateCompareSpec; steps: SortMutateCompareStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildSortMutateCompareVisualization(raw: string): SortMutateCompareVizResult {
  const parsed = parseSortMutateCompareSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildSortMutateComparePseudocode(parsed.spec)
    const steps = computeSortMutateCompareSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `sort/sorted 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
