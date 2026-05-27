"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useInteractiveExecution, type OutputChunk } from "@/hooks/useInteractiveExecution"
import { preloadWorker } from "@/lib/pyodideWorker"
import { Play, Square, Loader2, RotateCcw } from "lucide-react"

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

const CONSOLE_H_DEFAULT = 180
const CONSOLE_H_MIN = 80
const CONSOLE_H_MAX = 600

interface Props {
  initialCode: string
  storageKey?: string
}

export default function PythonEditorPanel({ initialCode, storageKey = "guide" }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoInstanceRef  = useRef<any>(null)
  const monacoModuleRef    = useRef<any>(null)
  const consoleBottomRef   = useRef<HTMLDivElement>(null)
  const inputRef           = useRef<HTMLInputElement>(null)
  const dragStartY         = useRef<number>(0)
  const dragStartH         = useRef<number>(CONSOLE_H_DEFAULT)

  const { chunks, running, waitingInput, run, submitInput, stop, reset } = useInteractiveExecution()
  const pendingInputLines = useRef<string[]>([])

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

  // 콘솔 높이 (드래그 리사이즈)
  const [consoleH, setConsoleH] = useState(CONSOLE_H_DEFAULT)

  const onResizeDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartH.current = consoleH

    const onMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY
      setConsoleH(Math.min(CONSOLE_H_MAX, Math.max(CONSOLE_H_MIN, dragStartH.current + delta)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [consoleH])

  // 인라인 입력값
  const [inputValue, setInputValue] = useState("")

  // 콘솔 자동 스크롤 & 입력 포커스 (큐 있으면 자동 제출)
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    if (waitingInput) {
      if (pendingInputLines.current.length > 0) {
        const line = pendingInputLines.current.shift()!
        submitInput(line)
      } else {
        inputRef.current?.focus()
      }
    }
  }, [chunks, waitingInput, submitInput])

  const getCode = useCallback(() => monacoInstanceRef.current?.getValue() ?? "", [])

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
          { name: "pow",       params: "base, exp, mod=None" },
          { name: "divmod",    params: "x, y" },
          { name: "chr",       params: "i" },
          { name: "ord",       params: "c" },
          { name: "hex",       params: "x" },
          { name: "oct",       params: "x" },
          { name: "bin",       params: "x" },
          { name: "all",       params: "iterable" },
          { name: "any",       params: "iterable" },
          { name: "type",      params: "object" },
          { name: "isinstance", params: "object, classinfo" },
          { name: "open",      params: "file, mode='r'" },
          // 문자열 메서드
          { name: "isdigit",    params: "" },
          { name: "isalpha",    params: "" },
          { name: "isalnum",    params: "" },
          { name: "isnumeric",  params: "" },
          { name: "islower",    params: "" },
          { name: "isupper",    params: "" },
          { name: "isspace",    params: "" },
          { name: "lower",      params: "" },
          { name: "upper",      params: "" },
          { name: "title",      params: "" },
          { name: "capitalize", params: "" },
          { name: "strip",      params: "chars=None" },
          { name: "lstrip",     params: "chars=None" },
          { name: "rstrip",     params: "chars=None" },
          { name: "split",      params: "sep=None, maxsplit=-1" },
          { name: "replace",    params: "old, new, count=-1" },
          { name: "join",       params: "iterable" },
          { name: "startswith", params: "prefix" },
          { name: "endswith",   params: "suffix" },
          { name: "find",       params: "sub, start=0, end=-1" },
          { name: "count",      params: "sub" },
          { name: "format",     params: "*args, **kwargs" },
          { name: "zfill",      params: "width" },
          { name: "center",     params: "width, fillchar=' '" },
          { name: "ljust",      params: "width, fillchar=' '" },
          { name: "rjust",      params: "width, fillchar=' '" },
          // 리스트 메서드
          { name: "append",     params: "object" },
          { name: "extend",     params: "iterable" },
          { name: "insert",     params: "index, object" },
          { name: "remove",     params: "value" },
          { name: "pop",        params: "index=-1" },
          { name: "index",      params: "value, start=0, stop=-1" },
          { name: "sort",       params: "key=None, reverse=False" },
          { name: "reverse",    params: "" },
          { name: "copy",       params: "" },
          // 딕셔너리 메서드
          { name: "keys",       params: "" },
          { name: "values",     params: "" },
          { name: "items",      params: "" },
          { name: "get",        params: "key, default=None" },
          { name: "update",     params: "other" },
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
        const RULE = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet

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
            const userSymbols    = extractUserSymbols(model.getValue())
            const userSuggestions = userSymbols.map(s => ({
              label:           s.kind === "function" ? `${s.name}(${s.params})` : s.name,
              kind:            s.kind === "function" ? CIK.Function : s.kind === "class" ? CIK.Class : CIK.Variable,
              detail:          s.kind === "function" ? "사용자 정의 함수" : s.kind === "class" ? "클래스" : "변수",
              insertText:      s.kind === "function" ? `${s.name}($1)` : s.name,
              insertTextRules: s.kind === "function" ? RULE : undefined,
              sortText:        "0" + s.name, range,
            }))
            const builtinSuggestions = PYTHON_BUILTINS.map(b => ({
              label: `${b.name}(${b.params})`, kind: CIK.Function, detail: "Python 내장 함수",
              insertText: `${b.name}($1)`, insertTextRules: RULE, sortText: "1" + b.name, range,
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
        fontLigatures:           false,
        lineHeight:              22,
        minimap:                 { enabled: false },
        scrollBeyondLastLine:    false,
        renderLineHighlight:     "line",
        overviewRulerLanes:      0,
        padding:                 { top: 14, bottom: 14 },
        tabSize:                 4,
        insertSpaces:            true,
        detectIndentation:       false,
        quickSuggestions:        { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions:    "off" as any,
        autoClosingQuotes:       "always",
        automaticLayout:         true,
      })

      monacoInstanceRef.current = editor

      editor.getModel()?.updateOptions({ tabSize: 4, insertSpaces: true, detectIndentation: false })

      editor.onDidChangeCursorPosition((e: any) =>
        setCursorPos({ ln: e.position.lineNumber, col: e.position.column })
      )

      // Enter → Python 자동 들여쓰기
      editor.addCommand(
        monaco.KeyCode.Enter,
        () => {
          // 자동완성 팝업이 열려 있으면 선택 항목 적용
          const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any
          const isSuggestOpen =
            suggestCtrl?.widget?.value?.suggestWidgetVisible?.get?.() ||
            (editor as any)._contextKeyService?.getContextKeyValue?.('suggestWidgetVisible')
          if (isSuggestOpen) {
            editor.trigger('keyboard', 'acceptSelectedSuggestion', {})
            return
          }

          const model    = editor.getModel()
          const pos      = editor.getPosition()
          if (!model || !pos) return
          const lineContent  = model.getLineContent(pos.lineNumber)
          const beforeCursor = lineContent.substring(0, pos.column - 1)
          const indentBase   = (lineContent.match(/^(\s*)/) ?? ["", ""])[1]
          const newIndent    = /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async).*:\s*$/.test(beforeCursor)
            ? indentBase + "    "
            : indentBase
          editor.trigger('keyboard', 'type', { text: "\n" + newIndent })
        },
      )

      // Shift+Enter → 줄 끝에 줄바꿈 + 컨텍스트 들여쓰기 (줄 분리 없음)
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => {
          const model = editor.getModel()
          const pos   = editor.getPosition()
          if (!model || !pos) return
          const lineContent = model.getLineContent(pos.lineNumber)
          const indentBase  = (lineContent.match(/^(\s*)/) ?? ["", ""])[1]
          const newIndent   = /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async).*:\s*$/.test(lineContent.trimEnd())
            ? indentBase + "    "
            : indentBase
          const lineEnd = model.getLineMaxColumn(pos.lineNumber)
          editor.executeEdits('shift-enter', [{
            range: new monaco.Range(pos.lineNumber, lineEnd, pos.lineNumber, lineEnd),
            text: '\n' + newIndent,
          }])
          editor.setPosition({ lineNumber: pos.lineNumber + 1, column: newIndent.length + 1 })
        },
      )

      // Tab → callable 뒤 () 자동 삽입 (onKeyDown은 Tab에는 정상 작동)
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

  const hasOutput = chunks.length > 0

  const handleRun = async () => {
    reset()
    await run(getCode())
  }

  const handleRunRef = useRef(handleRun)
  useEffect(() => { handleRunRef.current = handleRun })

  const handleReset = () => {
    monacoInstanceRef.current?.setValue(initialCode)
    reset()
  }

  const handleInputSubmit = () => {
    if (!inputValue.trim() && inputValue === "") return
    submitInput(inputValue)
    setInputValue("")
  }

  const statusLabel =
    waitingInput        ? "● 입력 대기..."   :
    running             ? "● 실행 중..."     :
    runState === "done" ? "● 완료"           :
    "● 준비됨"
  const statusColor =
    waitingInput        ? "text-gray-400"    :
    running             ? "text-gray-400"    :
    runState === "done" ? "text-gray-400"    :
    "text-gray-600"

  const D = (dark: string, light: string) => isDark ? dark : light

  return (
    <div className={`h-full flex flex-col rounded-xl overflow-hidden border shadow-sm ${D("border-slate-700", "border-gray-200")}`}>

      {/* ── 에디터 헤더 ── */}
      <div className="h-8 flex items-center justify-between px-3 bg-[#2d2d2d] shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28ca41]" />
          <span className="ml-2 text-[11px] font-mono text-gray-400 select-none">main.py</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-gray-500 select-none">{fontSize}px</span>
          <input
            type="range" min={11} max={20} step={1} value={fontSize}
            onChange={e => handleFontSizeChange(Number(e.target.value))}
            className="w-14 h-1 accent-[#534AB7] cursor-pointer"
          />
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-gray-400 select-none">Python 3</span>
          <div className="relative">
            <button
              onClick={() => setBgPickerOpen(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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
      <div ref={editorContainerRef} className="flex-1 min-h-0" style={{ background: bg.editor }} />

      {/* ── 상태바 ── */}
      <div className={`h-4 flex items-center justify-between px-3 shrink-0 select-none
        ${D("bg-[#2d2d2d]", "bg-gray-100")} border-t ${D("border-white/5", "border-gray-200")}`}>
        <span className={`text-[9px] font-mono tabular-nums transition-colors duration-300 ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-[9px] font-mono text-gray-500 tabular-nums">
          Ln {cursorPos.ln}, Col {cursorPos.col}
        </span>
      </div>

      {/* ── 버튼 바 ── */}
      <div className={`h-9 flex items-center justify-between px-3 shrink-0
        border-t ${D("bg-[#252525] border-white/8", "bg-gray-50 border-gray-200")}`}>
        <button
          onClick={handleReset}
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors
            ${D("text-gray-500 hover:text-gray-300 hover:bg-white/10", "text-gray-500 hover:text-gray-700 hover:bg-gray-200")}`}
        >
          <RotateCcw size={10} /> 초기화
        </button>
        {running || waitingInput ? (
          <button
            onClick={stop}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Square size={10} className="fill-current" /> 정지
          </button>
        ) : (
          <button
            onClick={handleRun}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-md transition-colors
              ${D("bg-emerald-600 hover:bg-emerald-500 text-white", "bg-emerald-500 hover:bg-emerald-600 text-white")}`}
          >
            <Play size={11} className="fill-current" /> 실행
          </button>
        )}
      </div>

      {/* ── 리사이즈 핸들 ── */}
      <div
        onMouseDown={onResizeDragStart}
        className={`h-[6px] shrink-0 flex items-center justify-center cursor-row-resize select-none group
          ${D("bg-[#1e1e1e] border-y border-white/8 hover:bg-indigo-500/20", "bg-gray-200 border-y border-gray-300 hover:bg-indigo-100")}`}
      >
        <div className="flex gap-[3px]">
          <span className={`w-5 h-[2px] rounded-full ${D("bg-white/20 group-hover:bg-indigo-400", "bg-gray-400 group-hover:bg-indigo-400")}`} />
          <span className={`w-1 h-[2px] rounded-full ${D("bg-white/20 group-hover:bg-indigo-400", "bg-gray-400 group-hover:bg-indigo-400")}`} />
        </div>
      </div>

      {/* ── 터미널 콘솔 ── */}
      <div
        className={`flex flex-col shrink-0 border-t ${D("bg-slate-950 border-white/8", "bg-slate-900 border-gray-700")}`}
        style={{ height: `${consoleH}px` }}
      >
        {/* 터미널 출력 + 인라인 입력 */}
        <div className="flex-1 px-3 py-2 overflow-y-auto font-mono min-h-0">
          {hasOutput || running || waitingInput ? (
            <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFeatureSettings: "'liga' 0, 'calt' 0, 'clig' 0" }}>

              {chunks.map((chunk, i) => (
                <span
                  key={i}
                  className={chunk.kind === "input" ? "text-green-300" : "text-gray-300"}
                >
                  {chunk.text}
                </span>
              ))}
              {waitingInput && (
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); handleInputSubmit() }
                  }}
                  onPaste={e => {
                    const text = e.clipboardData.getData("text")
                    if (!text.includes("\n")) return
                    e.preventDefault()
                    const lines = text.split("\n").filter((l, i, a) => i < a.length - 1 || l !== "")
                    if (lines.length === 0) return
                    pendingInputLines.current = lines.slice(1)
                    setInputValue("")
                    submitInput(lines[0])
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    display: "inline",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#86efac",
                    caretColor: "#86efac",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    lineHeight: "inherit",
                    width: "60ch",
                    verticalAlign: "baseline",
                  }}
                />
              )}
              {running && !waitingInput && (
                <span className="text-gray-500 animate-pulse"> ▶</span>
              )}
            </pre>
          ) : null}
          <div ref={consoleBottomRef} />
        </div>
      </div>

    </div>
  )
}
