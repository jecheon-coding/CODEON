"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useCodeExecution } from "@/hooks/useCodeExecution"
import { preloadWorker } from "@/lib/pyodideWorker"
import {
  Play, Square, Terminal, ChevronDown, Loader2, AlertCircle, RotateCcw,
} from "lucide-react"

// ── 배경 팔레트 ──────────────────────────────────────────────────────────────
const SvgPalette = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
)

type BgKey = "white" | "lightgray" | "lightblue" | "dark" | "black"
const BG_OPTIONS: Record<BgKey, { label: string; editor: string; panel: string; isDark: boolean }> = {
  white:     { label: "흰색",         editor: "#ffffff", panel: "#f8fafc", isDark: false },
  lightgray: { label: "라이트그레이", editor: "#f3f4f6", panel: "#e5e7eb", isDark: false },
  lightblue: { label: "라이트블루",   editor: "#eff6ff", panel: "#dbeafe", isDark: false },
  dark:      { label: "다크",         editor: "#1e1e2e", panel: "#181825", isDark: true  },
  black:     { label: "블랙",         editor: "#0d0d1a", panel: "#000000", isDark: true  },
}

const CONSOLE_H = 180

type OutputTab = "output" | "error"

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialCode: string
  storageKey?: string
}

export default function PythonEditorPanel({ initialCode, storageKey = "guide" }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoInstanceRef  = useRef<any>(null)
  const monacoModuleRef    = useRef<any>(null)

  const { output, error, running, run, stop, reset } = useCodeExecution()

  useEffect(() => { preloadWorker() }, [])

  // 커서 위치
  const [cursorPos, setCursorPos] = useState({ ln: 1, col: 1 })

  // 실행 완료 표시 (2초)
  const prevRunningRef = useRef(false)
  const [runState, setRunState] = useState<"idle" | "done">("idle")
  const doneTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const wasRunning = prevRunningRef.current
    prevRunningRef.current = running
    if (wasRunning && !running) {
      clearTimeout(doneTimerRef.current)
      setRunState("done")
      doneTimerRef.current = setTimeout(() => setRunState("idle"), 2000)
    }
    return () => clearTimeout(doneTimerRef.current)
  }, [running])

  // 출력 탭
  const [activeTab, setActiveTab] = useState<OutputTab>("output")

  // 배경색
  const [bgKey, setBgKey] = useState<BgKey>(() => {
    if (typeof window === "undefined") return "dark"
    const saved = localStorage.getItem(`${storageKey}EditorBgKey`) as BgKey | null
    return saved && saved in BG_OPTIONS ? saved : "dark"
  })
  const [bgPickerOpen, setBgPickerOpen] = useState(false)
  const bg     = BG_OPTIONS[bgKey]
  const isDark = bg.isDark

  // 글자 크기
  const [fontSize, setFontSize] = useState(13)
  useEffect(() => {
    const saved = parseInt(localStorage.getItem(`${storageKey}EditorFontSize`) ?? "13")
    if (!isNaN(saved) && saved >= 11 && saved <= 20) setFontSize(saved)
  }, [storageKey])
  const handleFontSizeChange = (val: number) => {
    setFontSize(val)
    localStorage.setItem(`${storageKey}EditorFontSize`, String(val))
    monacoInstanceRef.current?.updateOptions({ fontSize: val })
  }

  // 테스트 입력
  const [testInput, setTestInput]   = useState("")
  const [inputOpen, setInputOpen]   = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flashInput = useCallback(() => {
    clearTimeout(flashTimerRef.current)
    setIsFlashing(true)
    flashTimerRef.current = setTimeout(() => setIsFlashing(false), 300)
  }, [])

  const getCode = useCallback(() => monacoInstanceRef.current?.getValue() ?? "", [])

  const codeHasInput      = output === null && !running && getCode().includes("input(")
  const needsInputWarning = codeHasInput && !testInput.trim()

  // Monaco 초기화
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!(window as any).MonacoEnvironment) {
        ;(window as any).MonacoEnvironment = {
          getWorker(_: string, __: string) {
            return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url))
          },
        }
      }

      const monaco = await import("monaco-editor")
      if (cancelled || !editorContainerRef.current) return

      monacoModuleRef.current = monaco
      monacoInstanceRef.current?.dispose()
      monacoInstanceRef.current = null

      const savedFs = parseInt(localStorage.getItem(`${storageKey}EditorFontSize`) ?? "")
      const initFontSize = (!isNaN(savedFs) && savedFs >= 11 && savedFs <= 20) ? savedFs : 13
      if (initFontSize !== fontSize) setFontSize(initFontSize)

      // Python 자동완성 (전역 1회 등록)
      if (!(window as any).__pythonCompletionRegistered) {
        ;(window as any).__pythonCompletionRegistered = true

        const PYTHON_BUILTINS = [
          { name: "print",     params: "*objects, sep=' ', end='\\n'" },
          { name: "input",     params: "prompt=''" },
          { name: "int",       params: "x=0" },
          { name: "float",     params: "x=0" },
          { name: "str",       params: "object=''" },
          { name: "bool",      params: "x=False" },
          { name: "len",       params: "s" },
          { name: "range",     params: "start, stop, step=1" },
          { name: "list",      params: "iterable=()" },
          { name: "dict",      params: "" },
          { name: "set",       params: "iterable=()" },
          { name: "tuple",     params: "iterable=()" },
          { name: "sorted",    params: "iterable, key=None, reverse=False" },
          { name: "reversed",  params: "sequence" },
          { name: "enumerate", params: "iterable, start=0" },
          { name: "zip",       params: "*iterables" },
          { name: "map",       params: "function, iterable" },
          { name: "filter",    params: "function, iterable" },
          { name: "sum",       params: "iterable, start=0" },
          { name: "max",       params: "*args" },
          { name: "min",       params: "*args" },
          { name: "abs",       params: "x" },
          { name: "round",     params: "number, ndigits=0" },
          { name: "type",      params: "object" },
          { name: "isinstance", params: "object, classinfo" },
          { name: "append",    params: "object" },
          { name: "split",     params: "sep=None, maxsplit=-1" },
          { name: "join",      params: "iterable" },
          { name: "strip",     params: "chars=None" },
          { name: "replace",   params: "old, new, count=-1" },
          { name: "open",      params: "file, mode='r'" },
        ]

        const PY_KEYWORDS = [
          'False','None','True','and','as','assert','async','await',
          'break','class','continue','def','del','elif','else','except',
          'finally','for','from','global','if','import','in','is','lambda',
          'nonlocal','not','or','pass','raise','return','try','while','with','yield',
        ]

        const PY_SNIPPETS: { label: string; insert: string; detail: string }[] = [
          { label: 'if',      insert: 'if ${1:condition}:\n\t${2:pass}',                                   detail: 'if 문' },
          { label: 'if/else', insert: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',              detail: 'if/else 문' },
          { label: 'for',     insert: 'for ${1:i} in ${2:range(10)}:\n\t${3:pass}',                      detail: 'for 반복문' },
          { label: 'while',   insert: 'while ${1:condition}:\n\t${2:pass}',                               detail: 'while 반복문' },
          { label: 'def',     insert: 'def ${1:func_name}(${2:}):\n\t${3:pass}',                         detail: '함수 정의' },
          { label: 'class',   insert: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}',      detail: '클래스 정의' },
          { label: 'try',     insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}', detail: 'try/except' },
        ]

        const CIK  = monaco.languages.CompletionItemKind
        const ITR  = monaco.languages.CompletionItemInsertTextRule
        const RULE = ITR.InsertAsSnippet

        function extractUserSymbols(code: string) {
          const symbols: { name: string; params: string; kind: "function" | "class" | "variable" }[] = []
          const seen = new Set<string>()
          const RESERVED = new Set([
            "if","else","for","while","def","class","import","from","return",
            "True","False","None","and","or","not","in","is","lambda",
          ])
          for (const m of code.matchAll(/^[ \t]*def\s+(\w+)\s*\(([^)]*)\)/gm)) {
            if (!seen.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: m[2].trim(), kind: "function" }) }
          }
          for (const m of code.matchAll(/^class\s+(\w+)/gm)) {
            if (!seen.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: "", kind: "class" }) }
          }
          for (const m of code.matchAll(/^(\w+)\s*=/gm)) {
            if (!seen.has(m[1]) && !RESERVED.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: "", kind: "variable" }) }
          }
          return symbols
        }

        monaco.languages.registerCompletionItemProvider("python", {
          provideCompletionItems(model: any, position: any) {
            const word  = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: word.startColumn, endColumn: word.endColumn,
            }

            const userSymbols = extractUserSymbols(model.getValue())
            const userSuggestions = userSymbols.map(s => ({
              label:           s.kind === "function" ? `${s.name}(${s.params})` : s.name,
              kind:            s.kind === "function" ? CIK.Function : s.kind === "class" ? CIK.Class : CIK.Variable,
              detail:          s.kind === "function" ? "사용자 정의 함수" : s.kind === "class" ? "클래스" : "변수",
              insertText:      s.kind === "function" ? `${s.name}($1)` : s.name,
              insertTextRules: s.kind === "function" ? RULE : undefined,
              sortText:        "0" + s.name,
              range,
            }))

            const builtinSuggestions = PYTHON_BUILTINS.map(b => ({
              label:           `${b.name}(${b.params})`,
              kind:            CIK.Function,
              detail:          "Python 내장 함수",
              insertText:      `${b.name}($1)`,
              insertTextRules: RULE,
              sortText:        "1" + b.name,
              range,
            }))

            const keywordSuggestions = PY_KEYWORDS.map(kw => ({
              label: kw, kind: CIK.Keyword, insertText: kw, sortText: "2" + kw, range,
            }))

            const snippetSuggestions = PY_SNIPPETS.map(s => ({
              label: s.label, kind: CIK.Snippet, insertText: s.insert,
              insertTextRules: RULE, detail: s.detail, sortText: "3" + s.label, range,
            }))

            return { suggestions: [...userSuggestions, ...builtinSuggestions, ...keywordSuggestions, ...snippetSuggestions] }
          },
        })
      }

      const editor = monaco.editor.create(editorContainerRef.current, {
        value:                   initialCode,
        language:                "python",
        theme:                   isDark ? "vs-dark" : "vs",
        fontSize:                initFontSize,
        fontFamily:              "'JetBrains Mono', 'Fira Code', Menlo, monospace",
        fontLigatures:           true,
        lineHeight:              22,
        minimap:                 { enabled: false },
        scrollBeyondLastLine:    false,
        renderLineHighlight:     "line",
        overviewRulerLanes:      0,
        padding:                 { top: 14, bottom: 14 },
        tabSize:                 4,
        quickSuggestions:        { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions:    "off" as any,
        autoClosingQuotes:       "languageDefined",
        automaticLayout:         true,
      })

      monacoInstanceRef.current = editor

      editor.onDidChangeCursorPosition((e: any) =>
        setCursorPos({ ln: e.position.lineNumber, col: e.position.column })
      )

      // Enter: Python 자동 들여쓰기
      editor.addCommand(
        monaco.KeyCode.Enter,
        () => {
          const model    = editor.getModel()
          const position = editor.getPosition()
          if (!model || !position) return
          const lineContent  = model.getLineContent(position.lineNumber)
          const beforeCursor = lineContent.substring(0, position.column - 1)
          const indentBase   = (lineContent.match(/^(\s*)/) ?? ["", ""])[1]
          if (/^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async).*:\s*$/.test(beforeCursor)) {
            editor.trigger("keyboard", "type", { text: "\n" + indentBase + "    " })
          } else {
            editor.trigger("keyboard", "type", { text: "\n" + indentBase })
          }
        },
        "!suggestWidgetVisible && !inSnippetMode",
      )

      // Tab → 내장 함수명 뒤에 () 자동 삽입 (드롭다운 없을 때)
      const PY_CALLABLES = new Set([
        'abs','all','any','bin','bool','bytearray','bytes','callable','chr',
        'dict','divmod','enumerate','eval','exec','filter','float','format',
        'frozenset','getattr','hasattr','hash','hex','id','input','int',
        'isinstance','issubclass','iter','len','list','map','max','min','next',
        'oct','open','ord','pow','print','range','repr','reversed','round',
        'set','setattr','slice','sorted','str','sum','super','tuple','type','vars','zip',
      ])
      editor.onKeyDown((e: any) => {
        if (e.keyCode !== monaco.KeyCode.Tab) return
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any
        const isSuggestOpen =
          suggestCtrl?.widget?.value?.suggestWidgetVisible?.get?.() ||
          (editor as any)._contextKeyService?.getContextKeyValue?.('suggestWidgetVisible')
        if (isSuggestOpen) return
        const model = editor.getModel()
        const pos   = editor.getPosition()
        if (!model || !pos) return
        // 커서가 () 안에 있으면 ) 밖으로 이동
        const lineText = model.getLineContent(pos.lineNumber)
        if (lineText[pos.column - 2] === '(' && lineText[pos.column - 1] === ')') {
          e.preventDefault(); e.stopPropagation()
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 1 })
          return
        }
        const word = model.getWordAtPosition(pos)
        if (!word) return
        if (PY_CALLABLES.has(word.word)) {
          e.preventDefault(); e.stopPropagation()
          editor.executeEdits('tab-fn', [{
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: '()',
          }])
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 1 })
        }
      })

      // Ctrl+Enter → 실행
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => handleRunRef.current()
      )
    })()

    return () => {
      cancelled = true
      monacoInstanceRef.current?.dispose()
      monacoInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // bgKey 변경 시 Monaco 테마 업데이트
  useEffect(() => {
    monacoModuleRef.current?.editor.setTheme(isDark ? "vs-dark" : "vs")
  }, [isDark])

  const handleRun = async () => {
    setActiveTab("output")
    reset()
    await run(getCode(), testInput)
  }

  const handleRunRef = useRef(handleRun)
  useEffect(() => { handleRunRef.current = handleRun })

  const handleReset = () => {
    monacoInstanceRef.current?.setValue(initialCode)
    reset()
  }

  const statusLabel =
    running           ? "● 실행 중..."  :
    runState === "done" ? "● 완료"     :
    "● 준비됨"
  const statusColor =
    running           ? "text-amber-400"   :
    runState === "done" ? "text-emerald-400" :
    "text-gray-600"

  const D = (dark: string, light: string) => isDark ? dark : light

  return (
    <div className={`h-full flex flex-col rounded-xl overflow-hidden border shadow-sm ${D("border-slate-700", "border-gray-200")}`}>

      {/* ── 에디터 헤더 ── */}
      <div className="h-10 flex items-center justify-between px-4 bg-[#2d2d2d] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28ca41]" />
          <span className="ml-3 text-xs font-mono text-gray-400 select-none">main.py</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 글자 크기 슬라이더 */}
          <span className="text-[11px] font-mono text-gray-500 select-none">{fontSize}px</span>
          <input
            type="range" min={11} max={20} step={1} value={fontSize}
            onChange={e => handleFontSizeChange(Number(e.target.value))}
            className="w-16 h-1.5 accent-[#534AB7] cursor-pointer"
            title="에디터 글자 크기"
          />
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/10 text-gray-400 select-none">
            Python 3
          </span>
          {/* 배경 선택 */}
          <div className="relative">
            <button
              onClick={() => setBgPickerOpen(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="배경색 변경"
            >
              <SvgPalette />
              <span className="w-3 h-3 rounded-full border border-gray-600" style={{ background: bg.editor }} />
            </button>
            {bgPickerOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-0.5 z-50 min-w-[140px]">
                {(Object.entries(BG_OPTIONS) as [BgKey, (typeof BG_OPTIONS)[BgKey]][]).map(([key, opt]) => (
                  <button key={key}
                    onClick={() => { setBgKey(key); localStorage.setItem(`${storageKey}EditorBgKey`, key); setBgPickerOpen(false) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left hover:bg-gray-50 transition-colors ${bgKey === key ? "bg-[#534AB7]/10 text-[#534AB7]" : "text-gray-700"}`}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ background: opt.editor }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Monaco 에디터 ── */}
      <div
        ref={editorContainerRef}
        className="flex-1 min-h-0"
        style={{ background: bg.editor }}
      />

      {/* ── 상태바 ── */}
      <div className={`h-5 flex items-center justify-between px-4 shrink-0 select-none
        ${D("bg-[#2d2d2d]", "bg-gray-100")} border-t ${D("border-white/5", "border-gray-200")}`}>
        <span className={`text-[10px] font-mono tabular-nums transition-colors duration-300 ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-[10px] font-mono text-gray-500 tabular-nums">
          Ln {cursorPos.ln}, Col {cursorPos.col}
        </span>
      </div>

      {/* ── 버튼 바 ── */}
      <div className={`h-12 flex items-center justify-between px-4 shrink-0
        border-t ${D("bg-[#252525] border-white/8", "bg-gray-50 border-gray-200")}`}>

        {/* 왼쪽: 테스트 입력 + 초기화 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInputOpen(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-150
              ${inputOpen
                ? D("text-emerald-300 bg-emerald-900/30", "text-emerald-600 bg-emerald-50")
                : D("text-gray-500 hover:text-emerald-300 hover:bg-emerald-900/20",
                    "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50")}`}
          >
            <Terminal size={11} />
            테스트 입력
            <ChevronDown size={10} className={`transition-transform duration-150 ${inputOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={handleReset}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors
              ${D("text-gray-500 hover:text-gray-300 hover:bg-white/10", "text-gray-500 hover:text-gray-700 hover:bg-gray-200")}`}
          >
            <RotateCcw size={11} /> 초기화
          </button>
        </div>

        {/* 오른쪽: 실행 / 정지 */}
        {running ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Square size={12} className="fill-current" /> 정지
          </button>
        ) : (
          <button
            onClick={handleRun}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors
              ${D("bg-emerald-600 hover:bg-emerald-500 text-white", "bg-emerald-500 hover:bg-emerald-600 text-white")}`}
          >
            {running
              ? <><Loader2 size={13} className="animate-spin" /> 실행 중...</>
              : <><Play size={13} className="fill-current" /> 실행</>}
          </button>
        )}
      </div>

      {/* ── 테스트 입력 패널 ── */}
      {inputOpen && (
        <div className={`shrink-0 border-t transition-colors duration-200
          ${isFlashing
            ? D("border-indigo-700/50 bg-indigo-900/40", "border-indigo-300 bg-indigo-100")
            : D("border-emerald-700/30 bg-[#191e19]",    "border-emerald-200 bg-emerald-50/70")}`}>
          <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold
              ${D("text-emerald-400", "text-emerald-600")}`}>
              <Terminal size={10} />
              테스트 입력값을 직접 넣고 실행해 보세요
            </div>
            {testInput.trim() && (
              <button
                onClick={() => setTestInput("")}
                className={`text-[11px] transition-colors ${D("text-slate-500 hover:text-slate-300", "text-gray-400 hover:text-gray-600")}`}
              >
                지우기
              </button>
            )}
          </div>
          <textarea
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder="예) 홍길동 (Enter로 여러 줄 입력 가능)"
            spellCheck={false}
            rows={3}
            className={`w-full px-4 pb-3 text-xs font-mono resize-none focus:outline-none leading-relaxed block bg-transparent
              ${D("text-emerald-300 placeholder:text-emerald-900/60", "text-gray-700 placeholder:text-gray-400")}`}
          />
        </div>
      )}

      {/* ── 콘솔 ── */}
      <div
        className={`flex flex-col shrink-0 border-t ${D("bg-slate-950 border-white/8", "bg-slate-900 border-gray-700")}`}
        style={{ height: `${CONSOLE_H}px` }}
      >
        {/* 탭 바 */}
        <div className={`h-9 flex items-stretch gap-0.5 px-3 border-b shrink-0 ${D("border-white/8", "border-white/8")}`}>
          <div className="flex items-center mr-1.5">
            <Terminal size={12} className="text-gray-600" />
          </div>
          {(["output", "error"] as const).map(tab => {
            const labels: Record<OutputTab, string> = { output: "출력", error: "에러" }
            const isActive    = activeTab === tab
            const hasErrorDot = tab === "error" && !!error
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 text-xs px-3 transition-all duration-150 font-medium
                  ${isActive
                    ? "text-white font-semibold border-b-2 border-indigo-500 -mb-[1px]"
                    : "text-gray-500 opacity-50 hover:opacity-75 hover:text-gray-300 hover:bg-white/5"}`}
              >
                {labels[tab]}
                {hasErrorDot && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 px-4 py-3 overflow-y-auto font-mono min-h-0">

          {activeTab === "output" && (
            output
              ? <pre className="text-sm text-green-400 whitespace-pre-wrap leading-relaxed">
                  <span className="text-gray-600 select-none">$ python main.py{"\n"}</span>
                  {output}
                </pre>
              : running
              ? <p className="text-xs text-gray-500">// 실행 중...</p>
              : needsInputWarning
              ? <div className="flex flex-col gap-2">
                  <div className="inline-flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
                    <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300 leading-relaxed">
                      <p className="font-semibold mb-0.5">입력값이 필요한 코드예요.</p>
                      <p className="text-amber-400/80">
                        아래 <strong className="text-amber-300">테스트 입력</strong> 버튼을 눌러 입력값을 넣은 뒤 실행해보세요.
                      </p>
                    </div>
                  </div>
                  {!inputOpen && (
                    <button
                      onClick={() => { setInputOpen(true); flashInput() }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg w-fit
                        bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                    >
                      <Terminal size={10} /> 테스트 입력 열기
                    </button>
                  )}
                </div>
              : <p className="text-xs text-gray-600">// 실행 버튼을 눌러 출력 결과를 확인하세요.</p>
          )}

          {activeTab === "error" && (
            error
              ? <pre className="text-sm text-red-400 whitespace-pre-wrap leading-relaxed">{error}</pre>
              : <p className="text-xs text-gray-600">// 에러가 없습니다.</p>
          )}

        </div>
      </div>

    </div>
  )
}
