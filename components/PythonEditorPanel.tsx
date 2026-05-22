"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useCodeExecution } from "@/hooks/useCodeExecution"
import { preloadWorker } from "@/lib/pyodideWorker"

// ── SVG 아이콘 ──────────────────────────────────────────────────────────────
const SvgPlay    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
const SvgReset   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
const SvgChevronUp   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
const SvgChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
const SvgX = ({ size = 13 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const SvgPalette = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>

// ── 배경 팔레트 ──────────────────────────────────────────────────────────────
type BgKey = "white" | "lightgray" | "lightblue" | "dark" | "black"
const BG_OPTIONS: Record<BgKey, { label: string; editor: string; panel: string; isDark: boolean }> = {
  white:     { label: "흰색",         editor: "#ffffff", panel: "#f8fafc", isDark: false },
  lightgray: { label: "라이트그레이", editor: "#f3f4f6", panel: "#e5e7eb", isDark: false },
  lightblue: { label: "라이트블루",   editor: "#eff6ff", panel: "#dbeafe", isDark: false },
  dark:      { label: "다크",         editor: "#1e1e2e", panel: "#181825", isDark: true  },
  black:     { label: "블랙",         editor: "#0d0d1a", panel: "#000000", isDark: true  },
}

// ── 에러 출력 ────────────────────────────────────────────────────────────────
function ErrorOutput({ error, isDark }: { error: string; isDark: boolean }) {
  const lines = error.split("\n")
  return (
    <pre className="text-sm whitespace-pre-wrap" style={{ color: isDark ? "#f87171" : "#dc2626", fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace" }}>
      {lines.map((line, i) => {
        const isTraceback = line.startsWith("  File") || line.startsWith("Traceback")
        return (
          <span key={i} style={{ color: isTraceback ? (isDark ? "#9ca3af" : "#6b7280") : undefined }}>
            {line}{"\n"}
          </span>
        )
      })}
    </pre>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialCode: string
  storageKey?: string   // localStorage key prefix (default "guide")
}

export default function PythonEditorPanel({ initialCode, storageKey = "guide" }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoInstanceRef  = useRef<any>(null)
  const monacoModuleRef    = useRef<any>(null)
  const [cursorPos, setCursorPos] = useState({ ln: 1, col: 1 })

  const { output: runOutput, error: runError, running, run, stop: stopRun, reset: resetRun } = useCodeExecution()

  useEffect(() => { preloadWorker() }, [])

  // 배경색
  const [bgKey, setBgKey] = useState<BgKey>(() => {
    if (typeof window === "undefined") return "dark"
    const saved = localStorage.getItem(`${storageKey}EditorBgKey`) as BgKey | null
    return saved && saved in BG_OPTIONS ? saved : "dark"
  })
  const [bgPickerOpen, setBgPickerOpen] = useState(false)

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

  // 결과 패널 수직 드래그
  const [resultPanelHeight, setResultPanelHeight] = useState(220)
  const [resultCollapsed,   setResultCollapsed]   = useState(false)
  const [isVDragging,       setIsVDragging]       = useState(false)
  const resultPanelHeightRef = useRef(220)
  const rightPanelRef        = useRef<HTMLDivElement>(null)
  resultPanelHeightRef.current = resultPanelHeight

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(`${storageKey}ResultPanelHeight`) ?? "220")
    if (!isNaN(saved) && saved >= 80 && saved <= 600) setResultPanelHeight(saved)
  }, [storageKey])

  const startVDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsVDragging(true)
    const startY      = e.clientY
    const startHeight = resultPanelHeightRef.current
    const onMouseMove = (ev: MouseEvent) => {
      if (!rightPanelRef.current) return
      const maxH = rightPanelRef.current.clientHeight * 0.72
      const newH = Math.min(maxH, Math.max(80, startHeight - (ev.clientY - startY)))
      setResultPanelHeight(newH)
      resultPanelHeightRef.current = newH
    }
    const onMouseUp = () => {
      setIsVDragging(false)
      localStorage.setItem(`${storageKey}ResultPanelHeight`, String(Math.round(resultPanelHeightRef.current)))
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
  }, [storageKey])

  // 테스트 입력
  const [testInput, setTestInput] = useState("")
  const [inputOpen, setInputOpen] = useState(false)

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

      const savedFs    = parseInt(localStorage.getItem(`${storageKey}EditorFontSize`) ?? "")
      const initFontSize = (!isNaN(savedFs) && savedFs >= 11 && savedFs <= 20) ? savedFs : 13
      if (initFontSize !== fontSize) setFontSize(initFontSize)

      // Python 자동완성 (전역 1회)
      if (!(window as any).__pythonCompletionRegistered) {
        ;(window as any).__pythonCompletionRegistered = true
        const PY_KEYWORDS = [
          'False','None','True','and','as','assert','async','await',
          'break','class','continue','def','del','elif','else','except',
          'finally','for','from','global','if','import','in','is','lambda',
          'nonlocal','not','or','pass','raise','return','try','while','with','yield',
        ]
        const PY_BUILTINS = [
          'abs','all','any','bin','bool','bytearray','bytes','callable','chr',
          'dict','dir','divmod','enumerate','eval','exec','filter','float',
          'format','frozenset','getattr','globals','hasattr','hash','hex',
          'id','input','int','isinstance','issubclass','iter','len','list',
          'locals','map','max','min','next','object','oct','open','ord',
          'pow','print','range','repr','reversed','round','set','setattr',
          'slice','sorted','str','sum','super','tuple','type','vars','zip',
        ]
        const PY_SNIPPETS: { label: string; insert: string; detail: string }[] = [
          { label: 'if',        insert: 'if ${1:condition}:\n\t${2:pass}',                                      detail: 'if 문' },
          { label: 'if/else',   insert: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',                  detail: 'if/else 문' },
          { label: 'elif',      insert: 'elif ${1:condition}:\n\t${2:pass}',                                    detail: 'elif 절' },
          { label: 'for',       insert: 'for ${1:i} in ${2:range(10)}:\n\t${3:pass}',                          detail: 'for 반복문' },
          { label: 'while',     insert: 'while ${1:condition}:\n\t${2:pass}',                                   detail: 'while 반복문' },
          { label: 'def',       insert: 'def ${1:func_name}(${2:}):\n\t${3:pass}',                             detail: '함수 정의' },
          { label: 'class',     insert: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}',          detail: '클래스 정의' },
          { label: 'try',       insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',    detail: 'try/except' },
          { label: 'with',      insert: 'with ${1:expr} as ${2:f}:\n\t${3:pass}',                              detail: 'with 문' },
          { label: 'print',     insert: 'print(${1})',                                                          detail: '출력' },
          { label: 'input',     insert: 'input(${1:""})',                                                       detail: '입력' },
          { label: 'range',     insert: 'range(${1:n})',                                                        detail: 'range(n)' },
          { label: 'len',       insert: 'len(${1:obj})',                                                        detail: '길이 반환' },
          { label: 'int',       insert: 'int(${1})',                                                            detail: '정수 변환' },
          { label: 'str',       insert: 'str(${1})',                                                            detail: '문자열 변환' },
          { label: 'float',     insert: 'float(${1})',                                                          detail: '실수 변환' },
          { label: 'list',      insert: 'list(${1})',                                                           detail: '리스트 변환' },
          { label: 'enumerate', insert: 'enumerate(${1:iterable})',                                             detail: 'enumerate' },
          { label: 'zip',       insert: 'zip(${1:a}, ${2:b})',                                                  detail: 'zip' },
          { label: 'map',       insert: 'map(${1:func}, ${2:iterable})',                                        detail: 'map' },
          { label: 'sorted',    insert: 'sorted(${1:iterable})',                                                detail: '정렬된 리스트 반환' },
          { label: 'split',     insert: 'split(${1:" "})',                                                      detail: '문자열 분할' },
          { label: 'join',      insert: '"${1: }".join(${2:iterable})',                                         detail: '문자열 결합' },
        ]
        const KW   = monaco.languages.CompletionItemKind.Keyword
        const FN   = monaco.languages.CompletionItemKind.Function
        const SNIP = monaco.languages.CompletionItemKind.Snippet
        const METH = monaco.languages.CompletionItemKind.Method
        const RULE = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet

        type MethodDef = { label: string; insert: string; detail: string }
        const LIST_METHODS: MethodDef[] = [
          { label: 'append',  insert: 'append(${1:item})',                        detail: '리스트 끝에 항목 추가' },
          { label: 'extend',  insert: 'extend(${1:iterable})',                    detail: '리스트 뒤에 iterable 추가' },
          { label: 'insert',  insert: 'insert(${1:index}, ${2:item})',            detail: '지정 위치에 항목 삽입' },
          { label: 'remove',  insert: 'remove(${1:item})',                        detail: '첫 번째 일치 항목 삭제' },
          { label: 'pop',     insert: 'pop(${1:})',                               detail: '항목 꺼내기 (기본: 마지막)' },
          { label: 'sort',    insert: 'sort(key=${1:None}, reverse=${2:False})',  detail: '리스트 정렬 (제자리)' },
          { label: 'reverse', insert: 'reverse()',                                detail: '리스트 역순 정렬 (제자리)' },
          { label: 'index',   insert: 'index(${1:item})',                         detail: '항목의 인덱스 반환' },
          { label: 'count',   insert: 'count(${1:item})',                         detail: '항목 등장 횟수 반환' },
          { label: 'clear',   insert: 'clear()',                                  detail: '리스트 비우기' },
          { label: 'copy',    insert: 'copy()',                                   detail: '얕은 복사' },
        ]
        const STR_METHODS: MethodDef[] = [
          { label: 'upper',      insert: 'upper()',                               detail: '대문자 변환' },
          { label: 'lower',      insert: 'lower()',                               detail: '소문자 변환' },
          { label: 'strip',      insert: 'strip()',                               detail: '양쪽 공백 제거' },
          { label: 'lstrip',     insert: 'lstrip()',                              detail: '왼쪽 공백 제거' },
          { label: 'rstrip',     insert: 'rstrip()',                              detail: '오른쪽 공백 제거' },
          { label: 'split',      insert: 'split(${1:" "})',                       detail: '문자열 분할' },
          { label: 'join',       insert: 'join(${1:iterable})',                   detail: '문자열 결합' },
          { label: 'replace',    insert: 'replace(${1:old}, ${2:new})',           detail: '문자열 치환' },
          { label: 'find',       insert: 'find(${1:sub})',                        detail: '부분 문자열 위치 반환' },
          { label: 'startswith', insert: 'startswith(${1:prefix})',               detail: '접두사 확인' },
          { label: 'endswith',   insert: 'endswith(${1:suffix})',                 detail: '접미사 확인' },
          { label: 'format',     insert: 'format(${1:})',                         detail: '문자열 포맷' },
          { label: 'title',      insert: 'title()',                               detail: '단어 첫 글자 대문자' },
          { label: 'capitalize', insert: 'capitalize()',                          detail: '첫 글자 대문자' },
          { label: 'isdigit',    insert: 'isdigit()',                             detail: '숫자 문자열 여부' },
          { label: 'isalpha',    insert: 'isalpha()',                             detail: '알파벳 문자열 여부' },
          { label: 'isalnum',    insert: 'isalnum()',                             detail: '알파벳+숫자 여부' },
          { label: 'count',      insert: 'count(${1:sub})',                       detail: '부분 문자열 등장 횟수' },
          { label: 'zfill',      insert: 'zfill(${1:width})',                     detail: '0으로 채우기' },
        ]
        const DICT_METHODS: MethodDef[] = [
          { label: 'keys',       insert: 'keys()',                                detail: '키 목록 반환' },
          { label: 'values',     insert: 'values()',                              detail: '값 목록 반환' },
          { label: 'items',      insert: 'items()',                               detail: '(키, 값) 쌍 반환' },
          { label: 'get',        insert: 'get(${1:key}, ${2:default})',           detail: '키로 값 조회 (기본값 지정 가능)' },
          { label: 'update',     insert: 'update(${1:})',                         detail: '딕셔너리 업데이트' },
          { label: 'pop',        insert: 'pop(${1:key})',                         detail: '키로 항목 제거 및 반환' },
          { label: 'clear',      insert: 'clear()',                               detail: '딕셔너리 비우기' },
          { label: 'copy',       insert: 'copy()',                                detail: '얕은 복사' },
          { label: 'setdefault', insert: 'setdefault(${1:key}, ${2:default})',   detail: '키 없을 때 기본값 설정' },
        ]
        const ALL_METHODS = [...LIST_METHODS, ...STR_METHODS, ...DICT_METHODS]

        monaco.languages.registerCompletionItemProvider("python", {
          triggerCharacters: ["."],
          provideCompletionItems(model: any, position: any) {
            const word  = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: word.startColumn, endColumn: word.endColumn,
            }

            // 커서 앞 라인 전체를 읽어 "식별자." 패턴인지 확인
            const lineBeforeCursor = model.getValueInRange({
              startLineNumber: position.lineNumber, startColumn: 1,
              endLineNumber: position.lineNumber,   endColumn: position.column,
            })
            if (/[\w\])"']\.\w*$/.test(lineBeforeCursor)) {
              // 메서드 + 자주 함께 쓰이는 빌트인 함수도 함께 제공
              const RELATED: MethodDef[] = [
                { label: 'sorted',   insert: 'sorted(${1:iterable})',             detail: '정렬된 새 리스트 반환 (원본 유지)' },
                { label: 'reversed', insert: 'reversed(${1:iterable})',           detail: '역순 iterator 반환' },
                { label: 'len',      insert: 'len(${1:obj})',                     detail: '길이 반환' },
                { label: 'max',      insert: 'max(${1:iterable})',                detail: '최댓값 반환' },
                { label: 'min',      insert: 'min(${1:iterable})',                detail: '최솟값 반환' },
                { label: 'sum',      insert: 'sum(${1:iterable})',                detail: '합계 반환' },
              ]
              return {
                suggestions: [
                  ...ALL_METHODS.map(m => ({
                    label: m.label, kind: METH, insertText: m.insert,
                    insertTextRules: RULE, detail: m.detail, range, sortText: '0' + m.label,
                  })),
                  ...RELATED.map(m => ({
                    label: m.label, kind: FN, insertText: m.insert,
                    insertTextRules: RULE, detail: m.detail, range, sortText: '1' + m.label,
                  })),
                ],
              }
            }

            return {
              suggestions: [
                ...PY_KEYWORDS.map(kw => ({ label: kw, kind: KW, insertText: kw, range })),
                ...PY_BUILTINS.map(bi => ({ label: bi, kind: FN, insertText: bi, range })),
                ...PY_SNIPPETS.map(s  => ({
                  label: s.label, kind: SNIP, insertText: s.insert,
                  insertTextRules: RULE, detail: s.detail, range,
                })),
              ],
            }
          },
        })
      }

      const bg     = BG_OPTIONS[bgKey as BgKey] ?? BG_OPTIONS.dark
      const editor = monaco.editor.create(editorContainerRef.current, {
        value:                   initialCode,
        language:                "python",
        theme:                   bg.isDark ? "vs-dark" : "vs",
        fontSize:                initFontSize,
        fontFamily:              "'JetBrains Mono', 'Fira Code', Menlo, monospace",
        fontLigatures:           true,
        lineHeight:              22,
        minimap:                 { enabled: false },
        scrollBeyondLastLine:    false,
        renderLineHighlight:     "gutter",
        overviewRulerLanes:      0,
        padding:                 { top: 12, bottom: 12 },
        suggestOnTriggerCharacters: true,
        quickSuggestions:        true,
        automaticLayout:         true,
      })

      monacoInstanceRef.current = editor

      editor.onDidChangeCursorPosition((e: any) =>
        setCursorPos({ ln: e.position.lineNumber, col: e.position.column })
      )

      // Tab → () 자동 삽입
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
        // 제안 위젯이 열려 있으면 Monaco가 Tab 처리 (선택 확정) — 우리 핸들러는 건너뜀
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
        if (lineText[pos.column - 2] === "(" && lineText[pos.column - 1] === ")") {
          e.preventDefault(); e.stopPropagation()
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 1 })
          return
        }
        // 정확한 callable 이름 입력 시 () 자동 추가
        const word = model.getWordAtPosition(pos)
        if (!word) return
        if (PY_CALLABLES.has(word.word)) {
          e.preventDefault(); e.stopPropagation()
          editor.executeEdits("tab-fn", [{
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: "()",
          }])
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 1 })
        }
      })

      // else/elif/except/finally 자동 들여쓰기
      editor.onDidChangeModelContent((e: any) => {
        if (e.changes.length !== 1 || e.changes[0].text !== ":") return
        const model = editor.getModel()
        const pos   = editor.getPosition()
        if (!model || !pos) return
        const lineContent = model.getLineContent(pos.lineNumber)
        const trimmed     = lineContent.trimStart()
        if (!["else", "elif", "except", "finally"].some(kw => trimmed.startsWith(kw))) return
        const currentIndentLen = lineContent.length - trimmed.length
        for (let li = pos.lineNumber - 1; li >= Math.max(1, pos.lineNumber - 20); li--) {
          const prev = model.getLineContent(li)
          if (!prev.trim()) continue
          const prevIndent = (prev.match(/^(\s*)/) as any)[1]
          if (prevIndent.length < currentIndentLen) {
            editor.executeEdits("align-else", [{
              range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, currentIndentLen + 1),
              text:  prevIndent,
            }])
            editor.setPosition({ lineNumber: pos.lineNumber, column: prevIndent.length + trimmed.length + 1 })
            return
          }
        }
      })

      // Shift+Enter → 다음 줄 삽입
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => editor.trigger("keyboard", "editor.action.insertLineAfter", null)
      )

      // Ctrl+Enter → 실행 (handleRunRef로 최신 함수 참조)
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
  const bg     = BG_OPTIONS[bgKey]
  const isDark = bg.isDark
  useEffect(() => {
    monacoModuleRef.current?.editor.setTheme(isDark ? "vs-dark" : "vs")
  }, [isDark])

  const getCode = useCallback(() => monacoInstanceRef.current?.getValue() ?? "", [])

  const handleRun = async () => {
    resetRun()
    setResultCollapsed(false)
    await run(getCode(), testInput)
  }

  // 최신 handleRun을 ref로 보관 (Monaco 클로저 문제 방지)
  const handleRunRef = useRef(handleRun)
  useEffect(() => { handleRunRef.current = handleRun })

  const handleReset = () => {
    monacoInstanceRef.current?.setValue(initialCode)
    resetRun()
  }

  const editorBorderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"

  return (
    <div ref={rightPanelRef} className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: bg.editor }}>

      {/* 상단바 */}
      <div className="h-10 flex items-center justify-between px-4 shrink-0"
        style={{ background: bg.panel, borderBottom: `1px solid ${editorBorderColor}` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-mono tracking-wide" style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>main.py</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>{fontSize}px</span>
          <input
            type="range" min={11} max={20} step={1} value={fontSize}
            onChange={e => handleFontSizeChange(Number(e.target.value))}
            className="w-20 h-1.5 accent-[#534AB7] cursor-pointer"
            title="에디터 글자 크기"
          />
          <span className="px-2 py-1 rounded text-[11px] font-bold tracking-wide"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6", color: isDark ? "#d1d5db" : "#6b7280" }}
          >Python 3</span>
          {/* 배경 선택 */}
          <div className="relative">
            <button
              onClick={() => setBgPickerOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors px-2 py-1 rounded-lg"
              style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6", color: isDark ? "#d1d5db" : "#6b7280" }}
            >
              <SvgPalette />
              <span className="w-3 h-3 rounded-full border border-gray-400" style={{ background: bg.editor }} />
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

      {/* Monaco 에디터 */}
      <div ref={editorContainerRef} className="flex-1 min-h-0 overflow-hidden" />

      {/* 상태바 */}
      <div className="h-7 flex items-center justify-between px-4 text-[11px] font-mono shrink-0"
        style={{ background: bg.panel, borderTop: `1px solid ${editorBorderColor}`, color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
      >
        <span style={{ color: running ? "#f59e0b" : "#4ade80" }}>
          {running ? "실행 중..." : "Ready"}
        </span>
        <span>Ln {cursorPos.ln}, Col {cursorPos.col}</span>
      </div>

      {/* 테스트 입력 */}
      {inputOpen && (
        <div className="shrink-0 border-t px-3 py-2" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-700">테스트 입력</span>
            <button onClick={() => setInputOpen(false)}
              className="flex items-center justify-center transition-colors"
              style={{ width: "22px", height: "22px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.14)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
            ><SvgX /></button>
          </div>
          <textarea
            value={testInput} onChange={e => setTestInput(e.target.value)} rows={2}
            placeholder="입력값을 입력하세요..."
            className="w-full text-sm font-mono bg-white border border-[#86efac] rounded-lg px-3 py-2 resize-none outline-none focus:border-[#22c55e] text-gray-700"
            style={{ maxHeight: "96px", overflowY: "auto" }}
          />
        </div>
      )}

      {/* 컨트롤 바 */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0"
        style={{ background: isDark ? "#1e1e2e" : "#ffffff", borderTop: `1px solid ${editorBorderColor}` }}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => setInputOpen(v => !v)}
            className={`flex items-center gap-1 text-xs font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            테스트 입력 {inputOpen ? <SvgChevronUp /> : <SvgChevronDown />}
          </button>
          <button onClick={handleReset}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors px-2.5 py-1.5 rounded-lg ${isDark ? "text-gray-400 hover:text-white bg-white/10 hover:bg-white/20" : "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200"}`}
          ><SvgReset /> 초기화</button>
        </div>
        {running ? (
          <button onClick={stopRun}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#dc2626] text-white text-sm font-bold rounded-lg hover:bg-[#b91c1c] transition-colors animate-pulse"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>
            정지
          </button>
        ) : (
          <button onClick={handleRun}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#639922] text-white text-sm font-bold rounded-lg hover:bg-[#52821a] transition-colors"
          ><SvgPlay /> 실행</button>
        )}
      </div>

      {/* 수직 드래그 핸들 */}
      <div
        onMouseDown={startVDrag}
        className={`h-1.5 shrink-0 cursor-row-resize transition-colors duration-150 hover:bg-blue-400 ${isVDragging ? "bg-blue-500" : ""}`}
        style={{ background: isVDragging ? undefined : editorBorderColor }}
      />

      {/* 결과 패널 */}
      <div className="flex flex-col shrink-0 overflow-hidden"
        style={{ height: resultCollapsed ? "36px" : `${resultPanelHeight}px`, background: bg.editor }}
      >
        <div className="flex items-center gap-1 px-3 shrink-0"
          style={{ background: isDark ? "#181825" : "#f0f0f0", borderBottom: resultCollapsed ? "none" : `1px solid ${editorBorderColor}` }}
        >
          <span className={`px-4 py-2.5 text-xs font-bold border-t-2 ${isDark ? "text-white border-[#534AB7] bg-[#1e1e2e]" : "text-[#534AB7] border-[#534AB7] bg-white"}`}>
            출력
          </span>
          <button
            onClick={() => setResultCollapsed(v => !v)}
            className={`ml-auto shrink-0 p-1.5 rounded transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            title={resultCollapsed ? "결과 패널 열기" : "결과 패널 닫기"}
          >
            {resultCollapsed ? <SvgChevronUp /> : <SvgChevronDown />}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 min-w-0">
          {running ? (
            <p className="text-sm font-mono" style={{ color: isDark ? "#d1d5db" : "#374151" }}>실행 중...</p>
          ) : runError ? (
            <ErrorOutput error={runError} isDark={isDark} />
          ) : runOutput ? (
            <pre className="text-sm whitespace-pre" style={{ color: isDark ? "#d1d5db" : "#374151", fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace" }}>{runOutput}</pre>
          ) : (
            <p className="text-sm font-mono" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>코드를 실행하면 결과가 여기에 표시됩니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
