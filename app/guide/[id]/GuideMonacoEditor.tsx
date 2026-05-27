"use client"

import { useEffect, useRef } from "react"

interface Props {
  value: string
  onChange: (v: string) => void
  onRun: () => void
}

export default function GuideMonacoEditor({ value, onChange, onRun }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const editorRef      = useRef<any>(null)
  const onChangeRef    = useRef(onChange)
  const onRunRef       = useRef(onRun)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onRunRef.current    = onRun    }, [onRun])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!(window as any).MonacoEnvironment) {
        ;(window as any).MonacoEnvironment = {
          getWorker(_: string, __: string) {
            return new Worker(
              new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url)
            )
          },
        }
      }

      const monaco = await import("monaco-editor")
      if (cancelled || !containerRef.current) return

      editorRef.current?.dispose()
      editorRef.current = null

      // Python 자동완성 (전역 1회만 등록)
      if (!(window as any).__guideCompletionRegistered) {
        ;(window as any).__guideCompletionRegistered = true
        const KW = monaco.languages.CompletionItemKind.Keyword
        const FN = monaco.languages.CompletionItemKind.Function
        const RULE = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        monaco.languages.registerCompletionItemProvider("python", {
          provideCompletionItems(model: any, position: any) {
            const word  = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: word.startColumn, endColumn: word.endColumn,
            }
            const keywords = [
              'False','None','True','and','as','assert','async','await',
              'break','class','continue','def','del','elif','else','except',
              'finally','for','from','global','if','import','in','is','lambda',
              'nonlocal','not','or','pass','raise','return','try','while','with','yield',
            ]
            const snippets = [
              { label: 'if',      insert: 'if ${1:condition}:\n    ${2:pass}',                                   detail: 'if 문' },
              { label: 'for',     insert: 'for ${1:i} in ${2:range(10)}:\n    ${3:pass}',                      detail: 'for 반복문' },
              { label: 'while',   insert: 'while ${1:condition}:\n    ${2:pass}',                              detail: 'while 반복문' },
              { label: 'def',     insert: 'def ${1:func_name}(${2:}):\n    ${3:pass}',                         detail: '함수 정의' },
              { label: 'class',   insert: 'class ${1:ClassName}:\n    def __init__(self):\n        ${2:pass}', detail: '클래스 정의' },
              { label: 'try',     insert: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}', detail: 'try/except' },
              { label: 'print',   insert: 'print(${1})',                                                   detail: '출력' },
              { label: 'input',   insert: 'input(${1:""})',                                                detail: '입력' },
              { label: 'range',   insert: 'range(${1:n})',                                                 detail: 'range(n)' },
              { label: 'len',     insert: 'len(${1:obj})',                                                 detail: '길이 반환' },
            ]
            return {
              suggestions: [
                ...keywords.map(kw => ({ label: kw, kind: KW, insertText: kw, range })),
                ...snippets.map(s => ({ label: s.label, kind: FN, insertText: s.insert,
                  insertTextRules: RULE, detail: s.detail, range })),
              ],
            }
          },
        })
      }

      const editor = monaco.editor.create(containerRef.current, {
        value: value.replace(/\t/g, "    "),
        language:              "python",
        theme:                 "vs-dark",
        fontSize:              13,
        fontFamily:            "'JetBrains Mono', 'Fira Code', Menlo, monospace",
        fontLigatures:         true,
        lineHeight:            22,
        minimap:               { enabled: false },
        scrollBeyondLastLine:  false,
        renderLineHighlight:   "gutter",
        overviewRulerLanes:    0,
        padding:               { top: 12, bottom: 12 },
        tabSize:               4,
        insertSpaces:          true,
        detectIndentation:     false,
        suggestOnTriggerCharacters: true,
        quickSuggestions:      true,
        automaticLayout:       true,
      })

      editorRef.current = editor

      editor.getModel()?.updateOptions({ tabSize: 4, insertSpaces: true, detectIndentation: false })

      editor.onDidChangeModelContent(() => {
        onChangeRef.current(editor.getValue())
      })

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => onRunRef.current()
      )
    })()

    return () => {
      cancelled = true
      editorRef.current?.dispose()
      editorRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부에서 value가 바뀔 때 (초기화 버튼 등) 에디터에 반영
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const normalized = value.replace(/\t/g, "    ")
    if (editor.getValue() !== normalized) {
      editor.setValue(normalized)
    }
  }, [value])

  return <div ref={containerRef} className="flex-1 min-h-0" />
}
