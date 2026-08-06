// 학습자료 챕터 본문의 ```graph-dfs / ```graph-bfs 코드펜스에 들어가는
// 그래프 JSON을 파싱/검증하고, 표준 DFS(스택)·BFS(큐) 알고리즘으로
// 방문 순서를 미리 계산해둔다. React에 의존하지 않는 순수 함수 모음.

export type GraphNode = {
  id:     string
  label?: string
  x:      number   // 0~100 퍼센트 좌표 (작성자가 직접 배치)
  y:      number   // 0~100 퍼센트 좌표
}

export type GraphEdge = {
  from: string
  to:   string
}

export type GraphSpec = {
  title?:    string
  directed?: boolean
  start:     string
  nodes:     GraphNode[]
  edges:     GraphEdge[]
}

export type GraphValidationResult =
  | { ok: true;  spec: GraphSpec }
  | { ok: false; error: string }

export function parseGraphSpec(raw: string): GraphValidationResult {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "그래프 데이터 형식이 올바르지 않습니다." }
  }

  const { nodes, edges, start, directed, title } = parsed

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { ok: false, error: "nodes 배열이 비어 있습니다." }
  }

  const ids = new Set<string>()
  for (const n of nodes) {
    if (typeof n?.id !== "string" || !n.id.trim()) {
      return { ok: false, error: "노드 id가 올바르지 않습니다." }
    }
    if (ids.has(n.id)) {
      return { ok: false, error: `노드 id가 중복됩니다: ${n.id}` }
    }
    if (typeof n.x !== "number" || typeof n.y !== "number") {
      return { ok: false, error: `노드 "${n.id}"의 좌표(x, y)가 없습니다.` }
    }
    ids.add(n.id)
  }

  if (!Array.isArray(edges)) {
    return { ok: false, error: "edges 배열이 없습니다." }
  }
  for (const e of edges) {
    if (!ids.has(e?.from) || !ids.has(e?.to)) {
      return { ok: false, error: `존재하지 않는 노드를 참조하는 엣지가 있습니다: ${e?.from} → ${e?.to}` }
    }
  }

  if (typeof start !== "string" || !ids.has(start)) {
    return { ok: false, error: "start 노드가 nodes 목록에 없습니다." }
  }

  return {
    ok: true,
    spec: { title, directed: !!directed, start, nodes, edges },
  }
}

export type TraversalStep = {
  currentNode:  string    // 이 스텝에서 처리 중인 노드
  visitedOrder: string[]  // 이 스텝까지 방문 완료된 노드 순서 (누적)
  frontier:     string[]  // 이 스텝 직후의 스택(DFS)/큐(BFS) 스냅샷
  codeLines:    number[]  // 하이라이트할 의사코드 줄 인덱스 — 항상 정확히 한 줄만 담는다(디버거 커서처럼 한 줄씩 이동)
  caption:      string    // 이 스텝에서 일어난 일을 설명하는 한국어 문장
}

export function nodeLabel(spec: GraphSpec, id: string): string {
  return spec.nodes.find(n => n.id === id)?.label || id
}

// 학습자료 본문에 실제로 등장하는 dfs_stack()/bfs() 함수 코드를 그대로 사용한다.
// (가상의 의사코드가 아니라 학생이 방금 읽은 코드와 100% 동일한 텍스트라야
// "이 코드가 이렇게 실행되는구나"를 바로 연결할 수 있다.)
export const DFS_PSEUDOCODE = [
  "def dfs_stack(graph, start):",
  "    visited = set()",
  "    stack = [start]",              // 2 INIT
  "    result = []",
  "",
  "    while stack:",                 // 5 LOOP
  "        node = stack.pop()",       // 6 POP
  "        if node not in visited:",  // 7 CHECK
  "            visited.add(node)",    // 8 MARK_VISITED
  "            result.append(node)",  // 9 MARK_RESULT
  "            for i in graph[node]:",        // 10 FOR
  "                if i not in visited:",     // 11 NEIGHBOR_CHECK
  "                    stack.append(i)",      // 12 NEIGHBOR_PUSH
  "",
  "    return result",
]
const DFS_LINE = {
  INIT: 2, LOOP: 5, POP: 6, CHECK: 7,
  MARK_VISITED: 8, MARK_RESULT: 9,
  FOR: 10, NEIGHBOR_CHECK: 11, NEIGHBOR_PUSH: 12,
}

export const BFS_PSEUDOCODE = [
  "def bfs(graph, start):",
  "    visited = set([start])",
  "    queue = deque([start])",       // 2 INIT
  "    result = []",
  "",
  "    while queue:",                 // 5 LOOP
  "        node = queue.popleft()",   // 6 DEQUEUE
  "        result.append(node)",      // 7 RECORD
  "",
  "        for i in graph[node]:",            // 9 FOR
  "            if i not in visited:",         // 10 NEIGHBOR_CHECK
  "                visited.add(i)",           // 11 NEIGHBOR_MARK
  "                queue.append(i)",          // 12 NEIGHBOR_ENQUEUE
  "",
  "    return result",
]
const BFS_LINE = {
  INIT: 2, LOOP: 5, DEQUEUE: 6, RECORD: 7,
  FOR: 9, NEIGHBOR_CHECK: 10, NEIGHBOR_MARK: 11, NEIGHBOR_ENQUEUE: 12,
}

export function getPseudocode(mode: "dfs" | "bfs"): string[] {
  return mode === "dfs" ? DFS_PSEUDOCODE : BFS_PSEUDOCODE
}

function buildAdjacency(spec: GraphSpec): Map<string, string[]> {
  const adj = new Map<string, string[]>(spec.nodes.map(n => [n.id, []]))
  const push = (from: string, to: string) => {
    const list = adj.get(from)!
    if (!list.includes(to)) list.push(to)   // 중복 엣지로 인한 프론티어 중복 표시 방지
  }
  for (const e of spec.edges) {
    push(e.from, e.to)
    if (!spec.directed) push(e.to, e.from)
  }
  return adj
}

// 반복(iterative) DFS — 스택 기반. dfs_stack() 코드와 완전히 동일한 순서로 push한다
// (인접 노드를 순서대로 push — 예전엔 "왼쪽부터 방문되게" 임의로 역순 push했으나,
// 화면에 보이는 실제 코드와 시뮬레이션 동작이 어긋나는 문제라 제거함. 그 결과 스택
// 방식의 방문 순서가 재귀 방식과 달라질 수 있는데, 이는 학습자료 본문에도 이미
// "재귀 방식과 순서가 다를 수 있습니다"라고 명시된 정상적인 특성이다).
export function computeDfsSteps(spec: GraphSpec): TraversalStep[] {
  const adj = buildAdjacency(spec)
  const visitedSet = new Set<string>()
  const visitedOrder: string[] = []
  const steps: TraversalStep[] = []
  const stack: string[] = [spec.start]
  const label = (id: string) => nodeLabel(spec, id)

  steps.push({
    currentNode: spec.start, visitedOrder: [], frontier: [...stack],
    codeLines: [DFS_LINE.INIT], caption: `${label(spec.start)} 노드를 시작 노드로 스택에 넣습니다.`,
  })

  while (stack.length > 0) {
    const node = stack.pop()!
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
      codeLines: [DFS_LINE.POP], caption: `${label(node)} 노드를 스택에서 꺼냈습니다.`,
    })

    if (visitedSet.has(node)) {               // 이미 방문 → 스킵(사이클 대응)
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
        codeLines: [DFS_LINE.CHECK], caption: `${label(node)} 노드는 이미 방문했으므로 건너뜁니다.`,
      })
      continue
    }
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
      codeLines: [DFS_LINE.CHECK], caption: `${label(node)} 노드는 아직 방문하지 않았습니다.`,
    })

    visitedSet.add(node)
    visitedOrder.push(node)
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
      codeLines: [DFS_LINE.MARK_VISITED], caption: `${label(node)} 노드를 방문 집합에 추가합니다.`,
    })
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
      codeLines: [DFS_LINE.MARK_RESULT], caption: `${label(node)} 노드를 결과 리스트에 기록합니다. (${visitedOrder.length}번째 방문)`,
    })

    const neighbors = adj.get(node) ?? []
    if (neighbors.length === 0) {
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
        codeLines: [DFS_LINE.FOR], caption: `${label(node)} 노드는 인접한 노드가 없습니다.`,
      })
      continue
    }
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
      codeLines: [DFS_LINE.FOR], caption: `${label(node)} 노드의 인접 노드를 순서대로 확인합니다.`,
    })
    for (const nb of neighbors) {
      if (visitedSet.has(nb)) {
        steps.push({
          currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
          codeLines: [DFS_LINE.NEIGHBOR_CHECK], caption: `${label(nb)} 노드는 이미 방문했으므로 건너뜁니다.`,
        })
        continue
      }
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
        codeLines: [DFS_LINE.NEIGHBOR_CHECK], caption: `${label(nb)} 노드는 아직 방문하지 않았습니다.`,
      })
      stack.push(nb)
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...stack],
        codeLines: [DFS_LINE.NEIGHBOR_PUSH], caption: `${label(nb)} 노드를 스택에 추가합니다.`,
      })
    }
  }

  steps.push({
    currentNode: visitedOrder.at(-1) ?? spec.start, visitedOrder: [...visitedOrder], frontier: [],
    codeLines: [DFS_LINE.LOOP],
    caption: `스택이 비어 탐색을 마칩니다. 전체 방문 순서: ${visitedOrder.map(label).join(" → ")}`,
  })
  return steps
}

// 큐 기반 BFS — 큐에 넣는 시점에 visited 표시(교과서 표준, bfs() 코드와 동일).
export function computeBfsSteps(spec: GraphSpec): TraversalStep[] {
  const adj = buildAdjacency(spec)
  const visitedSet = new Set<string>([spec.start])
  const visitedOrder: string[] = []
  const steps: TraversalStep[] = []
  const queue: string[] = [spec.start]
  const label = (id: string) => nodeLabel(spec, id)

  steps.push({
    currentNode: spec.start, visitedOrder: [], frontier: [...queue],
    codeLines: [BFS_LINE.INIT], caption: `${label(spec.start)} 노드를 시작 노드로 큐에 넣고 방문 표시합니다.`,
  })

  while (queue.length > 0) {
    const node = queue.shift()!
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
      codeLines: [BFS_LINE.DEQUEUE], caption: `${label(node)} 노드를 큐에서 꺼냈습니다.`,
    })

    visitedOrder.push(node)
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
      codeLines: [BFS_LINE.RECORD], caption: `${label(node)} 노드를 방문 순서에 기록합니다. (${visitedOrder.length}번째 방문)`,
    })

    const neighbors = adj.get(node) ?? []
    if (neighbors.length === 0) {
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
        codeLines: [BFS_LINE.FOR], caption: `${label(node)} 노드는 인접한 노드가 없습니다.`,
      })
      continue
    }
    steps.push({
      currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
      codeLines: [BFS_LINE.FOR], caption: `${label(node)} 노드의 인접 노드를 순서대로 확인합니다.`,
    })
    for (const nb of neighbors) {
      if (visitedSet.has(nb)) {
        steps.push({
          currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
          codeLines: [BFS_LINE.NEIGHBOR_CHECK], caption: `${label(nb)} 노드는 이미 방문했으므로 건너뜁니다.`,
        })
        continue
      }
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
        codeLines: [BFS_LINE.NEIGHBOR_CHECK], caption: `${label(nb)} 노드는 아직 방문하지 않았습니다.`,
      })
      visitedSet.add(nb)
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
        codeLines: [BFS_LINE.NEIGHBOR_MARK], caption: `${label(nb)} 노드를 방문 표시합니다.`,
      })
      queue.push(nb)
      steps.push({
        currentNode: node, visitedOrder: [...visitedOrder], frontier: [...queue],
        codeLines: [BFS_LINE.NEIGHBOR_ENQUEUE], caption: `${label(nb)} 노드를 큐에 추가합니다.`,
      })
    }
  }

  steps.push({
    currentNode: visitedOrder.at(-1) ?? spec.start, visitedOrder: [...visitedOrder], frontier: [],
    codeLines: [BFS_LINE.LOOP],
    caption: `큐가 비어 탐색을 마칩니다. 전체 방문 순서: ${visitedOrder.map(label).join(" → ")}`,
  })
  return steps
}

export type GraphVizResult =
  | { ok: true;  spec: GraphSpec; steps: TraversalStep[] }
  | { ok: false; error: string }

export function buildGraphVisualization(raw: string, mode: "dfs" | "bfs"): GraphVizResult {
  const parsed = parseGraphSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const steps = mode === "dfs" ? computeDfsSteps(parsed.spec) : computeBfsSteps(parsed.spec)
    return { ok: true, spec: parsed.spec, steps }
  } catch (e: any) {
    return { ok: false, error: `그래프 순회 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 재귀 버전 DFS 시각화 (```graph-dfs-recursive) ──
// 학습자료에 실제로 등장하는 dfs(graph, node, visited) 함수 코드를 그대로 표시하되,
// 맨 위에 "graph = {...}" 딕셔너리 리터럴을 현재 JSON 그래프 데이터로부터 그대로
// 생성해서 붙인다(하이라이트 대상은 아님 — 순수 컨텍스트, 기본 접힘). 드라이버 호출의
// "1" 대신 "start"로 일반화하는 것은 그대로 유지.
function formatPyKey(id: string): string {
  return /^-?\d+$/.test(id) ? id : JSON.stringify(id)
}

function buildGraphDictLines(spec: GraphSpec): string[] {
  const adj = buildAdjacency(spec)
  const lines = ["graph = {"]
  spec.nodes.forEach(n => {
    const neighbors = (adj.get(n.id) ?? []).map(formatPyKey).join(", ")
    lines.push(`    ${formatPyKey(n.id)}: [${neighbors}],`)
  })
  lines.push("}")
  return lines
}

const DFS_FUNC_LINES = [
  "def dfs(graph, node, visited):",
  "    visited.add(node)",
  "    print(node, end=' ')",
  "",
  "    for i in graph[node]:",
  "        if i not in visited:",
  "            dfs(graph, i, visited)",
  "",
  "visited = set()",
  "dfs(graph, start, visited)",
]

function buildDfsRecursivePseudocode(spec: GraphSpec) {
  const graphLines = buildGraphDictLines(spec)
  const collapseBefore = graphLines.length   // graph = {...} 딕셔너리는 기본 접힘 대상(스텝 하이라이트 없음)
  const offset = graphLines.length + 1       // +1: 그래프 리터럴과 함수 사이 빈 줄 → offset = "def dfs(...)" 줄의 인덱스
  const lines = [...graphLines, "", ...DFS_FUNC_LINES]
  const lineIdx = {
    ENTER_ADD:      offset + 1,
    ENTER_PRINT:    offset + 2,
    FOR:            offset + 4,
    NEIGHBOR_CHECK: offset + 5,
    CALL:           offset + 6,
    RETURN:         offset + 4,   // for 라인 재사용 — 반복문 버전이 while/for 종료 시 같은 줄을 재사용하는 관례와 동일
    DRIVER_CALL:    offset + 9,
  }
  return { lines, lineIdx, collapseBefore }
}

export type RecursiveStepKind = "init" | "enter" | "for" | "check" | "skip" | "call" | "return" | "terminal"

export type RecursiveTraversalStep = {
  kind:          RecursiveStepKind
  activeNode:    string | null            // 콜스택 top(현재 실행 중인 프레임). init 이전엔 null.
  callStack:     string[]                 // [0]=최초 호출(바닥) ... 마지막=top(현재 프레임)
  visited:       Record<string, boolean>  // spec.nodes 전체 id를 key로 초기화 — 그리드 표시에 필요
  visitOrder:    string[]                 // 누적 방문 순서
  neighborNode?: string                   // check/skip/call 스텝에서 확인 중인 이웃 id
  codeLines:     number[]                 // 항상 정확히 한 줄만 담는다
  caption:       string
}

// JS 자체의 재귀 호출로 Python의 재귀를 그대로 모사한다 — 별도의 "프레임+반복 인덱스"
// 자료구조를 직접 관리할 필요 없이, visited 체크(재귀 진입 직후 마킹)만으로 사이클·
// 셀프루프·연결 안 된 노드·이웃 없는 노드가 모두 실제 파이썬 실행과 동일하게 처리된다.
function computeDfsRecursiveSteps(spec: GraphSpec, lineIdx: ReturnType<typeof buildDfsRecursivePseudocode>["lineIdx"]): RecursiveTraversalStep[] {
  const adj = buildAdjacency(spec)
  const label = (id: string) => nodeLabel(spec, id)
  const visited: Record<string, boolean> = Object.fromEntries(spec.nodes.map(n => [n.id, false]))
  const visitOrder: string[] = []
  const callStack: string[] = []
  const steps: RecursiveTraversalStep[] = []

  function pushStep(partial: Pick<RecursiveTraversalStep, "kind" | "codeLines" | "caption"> & Partial<Pick<RecursiveTraversalStep, "neighborNode">>) {
    steps.push({
      activeNode: callStack.at(-1) ?? null,
      callStack: [...callStack],
      visited: { ...visited },
      visitOrder: [...visitOrder],
      ...partial,
    })
  }

  pushStep({
    kind: "init", codeLines: [lineIdx.DRIVER_CALL],
    caption: `visited 집합을 초기화하고 dfs(graph, ${label(spec.start)}, visited)를 호출합니다.`,
  })

  function dfs(node: string) {
    callStack.push(node)

    visited[node] = true
    pushStep({
      kind: "enter", codeLines: [lineIdx.ENTER_ADD],
      caption: `dfs(${label(node)}) 호출이 시작됩니다. ${label(node)} 노드를 방문 집합에 추가합니다.`,
    })

    visitOrder.push(node)
    pushStep({
      kind: "enter", codeLines: [lineIdx.ENTER_PRINT],
      caption: `${label(node)} 노드를 출력합니다. (${visitOrder.length}번째 방문)`,
    })

    const neighbors = adj.get(node) ?? []
    if (neighbors.length === 0) {
      pushStep({
        kind: "for", codeLines: [lineIdx.FOR],
        caption: `${label(node)} 노드는 인접한 노드가 없습니다.`,
      })
    } else {
      pushStep({
        kind: "for", codeLines: [lineIdx.FOR],
        caption: `${label(node)} 노드의 인접 노드를 순서대로 확인합니다.`,
      })
      for (const nb of neighbors) {
        if (visited[nb]) {
          pushStep({
            kind: "skip", neighborNode: nb, codeLines: [lineIdx.NEIGHBOR_CHECK],
            caption: `${label(nb)} 노드는 이미 방문했으므로 건너뜁니다.`,
          })
          continue
        }
        pushStep({
          kind: "check", neighborNode: nb, codeLines: [lineIdx.NEIGHBOR_CHECK],
          caption: `${label(nb)} 노드는 아직 방문하지 않았습니다.`,
        })
        pushStep({
          kind: "call", neighborNode: nb, codeLines: [lineIdx.CALL],
          caption: `dfs(${label(nb)})를 재귀 호출합니다.`,
        })
        dfs(nb)   // 실제 JS 재귀 호출 — 반환되면 자동으로 이 for 루프의 다음 이터레이션으로 이어짐
      }
    }

    // pop 하기 "전"에 스냅샷 — 이 프레임이 반환되려는 마지막 순간을 node가 여전히 top인 채로 보여줌
    pushStep({
      kind: "return", codeLines: [lineIdx.RETURN],
      caption: `dfs(${label(node)})의 모든 인접 노드 처리가 끝나 호출 스택에서 반환됩니다.`,
    })
    callStack.pop()
  }

  dfs(spec.start)

  pushStep({
    kind: "terminal", codeLines: [lineIdx.DRIVER_CALL],
    caption: `모든 재귀 호출이 반환되어 탐색을 마칩니다. 전체 방문 순서: ${visitOrder.map(label).join(" → ")}`,
  })
  return steps
}

export type GraphVizRecursiveResult =
  | { ok: true;  spec: GraphSpec; steps: RecursiveTraversalStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildDfsRecursiveVisualization(raw: string): GraphVizRecursiveResult {
  const parsed = parseGraphSpec(raw)
  if (!parsed.ok) return parsed
  try {
    const { lines, lineIdx, collapseBefore } = buildDfsRecursivePseudocode(parsed.spec)
    const steps = computeDfsRecursiveSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `그래프 순회 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}

// ── 그래프 "구축" 시뮬레이션 (```graph-build) ──
// 학습자료 4.2절의 실제 코드(간선 리스트 → 인접 리스트 변환)를 그대로 표시한다.
// graph2 = [[] for _ in range(n+1)]처럼 리스트 인덱스로 접근하는 코드이므로,
// 노드 id가 1부터 N까지의 연속된 정수가 아니면 코드가 실제로 성립하지 않는다
// (다른 시각화는 딕셔너리 기반이라 임의 id를 허용하지만 이건 예외).
function validateSequentialIds(spec: GraphSpec): string | null {
  const numbers = spec.nodes.map(n => Number(n.id))
  const n = spec.nodes.length
  const isSequential =
    numbers.every(Number.isInteger) &&
    new Set(numbers).size === n &&
    Math.min(...numbers) === 1 &&
    Math.max(...numbers) === n
  return isSequential
    ? null
    : `그래프 구축 시뮬레이션은 노드 id가 1부터 ${n}까지의 연속된 정수여야 합니다 (예: "1", "2", ..., "${n}"). 리스트 인덱스로 인접 리스트를 만드는 실제 코드를 그대로 재생하기 때문입니다.`
}

function buildGraphBuildPseudocode(spec: GraphSpec) {
  const n = spec.nodes.length
  const edgeTuples = spec.edges.map(e => `(${e.from}, ${e.to})`).join(", ")
  const contextLines = [
    `n = ${n}`,
    `edges = [${edgeTuples}]`,
  ]
  const collapseBefore = contextLines.length
  const funcLines = [
    "graph2 = [[] for _ in range(n + 1)]",   // 0(+offset) INIT
    "",
    "for u, v in edges:",                    // 2 FOR
    "    graph2[u].append(v)",               // 3 APPEND_UV
    "    graph2[v].append(u)",               // 4 APPEND_VU
    "",
    "print(graph2)",                         // 6 TERMINAL
  ]
  const offset = contextLines.length + 1   // +1: 컨텍스트와 본문 사이 빈 줄
  const lines = [...contextLines, "", ...funcLines]
  const lineIdx = {
    INIT:       offset,
    FOR:        offset + 2,
    APPEND_UV:  offset + 3,
    APPEND_VU:  offset + 4,
    TERMINAL:   offset + 6,
  }
  return { lines, lineIdx, collapseBefore }
}

export type GraphBuildStepKind = "init" | "for" | "append-uv" | "append-vu" | "terminal"

export type GraphBuildStep = {
  kind:           GraphBuildStepKind       // append-uv/append-vu 구분으로 캔버스가 방향 화살표를 그릴 수 있게 함
  visibleEdgeIds: Set<string>              // "from|to" 형태 키. 이 스텝까지 캔버스에 그려진 간선들.
  adjacency:      Record<string, string[]> // graph2 스냅샷
  activePair?:    [string, string]         // 이번 스텝에서 처리 중인 (u, v)
  codeLines:      number[]
  caption:        string
}

function edgeKey(from: string, to: string): string {
  return `${from}|${to}`
}

function computeGraphBuildSteps(spec: GraphSpec, lineIdx: ReturnType<typeof buildGraphBuildPseudocode>["lineIdx"]): GraphBuildStep[] {
  const adjacency: Record<string, string[]> = Object.fromEntries(spec.nodes.map(n => [n.id, []]))
  const visibleEdgeIds = new Set<string>()
  const steps: GraphBuildStep[] = []
  const label = (id: string) => nodeLabel(spec, id)

  function pushStep(partial: Pick<GraphBuildStep, "kind" | "codeLines" | "caption"> & Partial<Pick<GraphBuildStep, "activePair">>) {
    steps.push({
      visibleEdgeIds: new Set(visibleEdgeIds),
      adjacency: Object.fromEntries(Object.entries(adjacency).map(([k, v]) => [k, [...v]])),
      ...partial,
    })
  }

  pushStep({
    kind: "init", codeLines: [lineIdx.INIT],
    caption: `정점 개수만큼 빈 리스트를 담은 graph2를 준비합니다.`,
  })

  for (const e of spec.edges) {
    const { from: u, to: v } = e
    pushStep({
      kind: "for", codeLines: [lineIdx.FOR], activePair: [u, v],
      caption: `간선 (${label(u)}, ${label(v)})을 확인합니다.`,
    })

    adjacency[u].push(v)
    visibleEdgeIds.add(edgeKey(u, v))
    pushStep({
      kind: "append-uv", codeLines: [lineIdx.APPEND_UV], activePair: [u, v],
      caption: `graph2[${label(u)}]에 ${label(v)}를 추가합니다 → ${label(u)} → ${label(v)} 방향으로 간선이 나타납니다.`,
    })

    adjacency[v].push(u)
    pushStep({
      kind: "append-vu", codeLines: [lineIdx.APPEND_VU], activePair: [u, v],
      caption: `graph2[${label(v)}]에도 ${label(u)}를 추가해서 ${label(u)} ↔ ${label(v)} 양방향 연결을 완성합니다.`,
    })
  }

  const summary = spec.nodes.map(n => `${label(n.id)}: [${adjacency[n.id].map(label).join(", ")}]`).join(", ")
  pushStep({
    kind: "terminal", codeLines: [lineIdx.TERMINAL],
    caption: `모든 간선 처리가 끝나 인접 리스트가 완성되었습니다. graph2 = { ${summary} }`,
  })

  return steps
}

export type GraphVizBuildResult =
  | { ok: true;  spec: GraphSpec; steps: GraphBuildStep[]; pseudocode: string[]; codeCollapseBefore: number }
  | { ok: false; error: string }

export function buildGraphBuildVisualization(raw: string): GraphVizBuildResult {
  const parsed = parseGraphSpec(raw)
  if (!parsed.ok) return parsed
  const idError = validateSequentialIds(parsed.spec)
  if (idError) return { ok: false, error: idError }
  try {
    const { lines, lineIdx, collapseBefore } = buildGraphBuildPseudocode(parsed.spec)
    const steps = computeGraphBuildSteps(parsed.spec, lineIdx)
    return { ok: true, spec: parsed.spec, steps, pseudocode: lines, codeCollapseBefore: collapseBefore }
  } catch (e: any) {
    return { ok: false, error: `그래프 구축 계산 중 오류가 발생했습니다: ${e?.message ?? "알 수 없는 오류"}` }
  }
}
