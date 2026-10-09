// CommonMark의 강조(emphasis) 규칙 때문에 `**text**`가 굵게 처리되지 않는 경우를
// 되살리는 remark 플러그인.
//
// 문제: CommonMark는 닫는 `**` 바로 앞 글자가 문장부호(예: 괄호 `)`)이면, 그 `**`
// 바로 뒤에 공백/문장부호/줄 끝이 와야만 강조를 닫을 수 있다고 규정한다. 그런데
// 한국어는 조사가 띄어쓰기 없이 단어 뒤에 바로 붙는다("**비트(bit)**라고"처럼).
// 이 경우 닫는 `**` 뒤에 오는 글자가 한글 "라"라서 이 규칙을 만족하지 못해
// remark가 강조를 아예 포기하고 `**`를 리터럴 텍스트로 남겨버린다.
// ("**진법**이라고"처럼 닫는 `**` 앞이 문장부호가 아니면 이 제약이 없어 정상 동작한다.)
//
// 해결: 표준 파싱이 끝난 뒤, 리터럴 `**`가 그대로 남아있는 텍스트 노드만 찾아
// "**로 감싼 조각은 무조건 굵게"라는 단순한 규칙으로 후처리한다. 이미 정상적으로
// strong 노드로 파싱된 부분이나 코드 블록/인라인 코드는 건드리지 않는다(코드 노드는
// text 타입이 아니라 code/inlineCode 타입이라 애초에 대상이 아님).

type MdastNode = { type: string; value?: string; children?: MdastNode[]; [key: string]: unknown }

const BOLD_RE = /\*\*([^*]+?)\*\*/g

function splitBold(value: string): MdastNode[] | null {
  BOLD_RE.lastIndex = 0
  let match: RegExpExecArray | null
  let last = 0
  const nodes: MdastNode[] = []

  while ((match = BOLD_RE.exec(value))) {
    if (match.index > last) nodes.push({ type: "text", value: value.slice(last, match.index) })
    nodes.push({ type: "strong", children: [{ type: "text", value: match[1] }] })
    last = BOLD_RE.lastIndex
  }
  if (nodes.length === 0) return null
  if (last < value.length) nodes.push({ type: "text", value: value.slice(last) })
  return nodes
}

function walk(node: MdastNode) {
  if (!Array.isArray(node.children)) return
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (child.type === "text" && typeof child.value === "string" && child.value.includes("**")) {
      const replaced = splitBold(child.value)
      if (replaced) {
        node.children.splice(i, 1, ...replaced)
        i += replaced.length - 1
        continue
      }
    }
    walk(child)
  }
}

export function remarkFixKoreanBold() {
  return (tree: MdastNode) => { walk(tree) }
}
