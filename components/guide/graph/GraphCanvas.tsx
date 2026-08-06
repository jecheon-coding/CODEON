"use client"

import type { GraphSpec, GraphEdge } from "@/lib/graphTraversal"

export type NodeState = "current" | "visited" | "frontier" | "unvisited"

export const NODE_STYLE: Record<NodeState, { fill: string; stroke: string; text: string }> = {
  unvisited: { fill: "fill-gray-200",   stroke: "stroke-gray-300",   text: "fill-gray-500" },
  frontier:  { fill: "fill-amber-100",  stroke: "stroke-amber-400",  text: "fill-amber-700" },
  current:   { fill: "fill-indigo-500", stroke: "stroke-indigo-600", text: "fill-white" },
  visited:   { fill: "fill-emerald-500",stroke: "stroke-emerald-600",text: "fill-white" },
}

const VIEW_W  = 160
const VIEW_H  = 100
const NODE_R  = 6
const ARROW_SIZE = 3.5

export type EdgeArrow = "forward" | "backward" | "both"

// SVG <marker>(refX/orient=auto-start-reverse)는 브라우저별로 렌더링이 불안정해 눈에 안 보이는
// 경우가 있어, 화살표를 마커 대신 좌표를 직접 계산한 삼각형(<polygon>)으로 그린다.
// pointingAngle은 화살표 "촉"이 향하는 방향(라디안). 촉은 노드 경계(반지름만큼 안쪽)에 위치시켜
// 선이 노드 원과 만나는 지점에 딱 맞닿아 보이게 한다.
function arrowPolygonPoints(centerX: number, centerY: number, pointingAngle: number, radius: number): string {
  const tipX = centerX - radius * Math.cos(pointingAngle)
  const tipY = centerY - radius * Math.sin(pointingAngle)
  const backX = tipX - ARROW_SIZE * Math.cos(pointingAngle)
  const backY = tipY - ARROW_SIZE * Math.sin(pointingAngle)
  const perp = pointingAngle + Math.PI / 2
  const halfWidth = ARROW_SIZE * 0.6
  const leftX = backX + halfWidth * Math.cos(perp)
  const leftY = backY + halfWidth * Math.sin(perp)
  const rightX = backX - halfWidth * Math.cos(perp)
  const rightY = backY - halfWidth * Math.sin(perp)
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`
}

export function GraphCanvas({
  spec,
  getNodeState,
  isEdgeHighlighted,
  isEdgeVisible = () => true,
  getEdgeArrow = () => null,
}: {
  spec: GraphSpec
  getNodeState: (id: string) => NodeState
  isEdgeHighlighted: (edge: GraphEdge) => boolean
  isEdgeVisible?: (edge: GraphEdge) => boolean   // 그래프 "구축" 시뮬레이션처럼 아직 추가되지 않은 간선을 숨길 때 사용
  getEdgeArrow?: (edge: GraphEdge) => EdgeArrow | null   // 그래프 "구축" 시뮬레이션에서 append 진행 방향을 화살표로 보여줄 때 사용
}) {
  return (
    <div className="flex-1 p-3">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full aspect-[16/10]">
        {/* 엣지 */}
        {spec.edges.map((e, i) => {
          const from = spec.nodes.find(n => n.id === e.from)
          const to   = spec.nodes.find(n => n.id === e.to)
          if (!from || !to || !isEdgeVisible(e)) return null
          const highlighted = isEdgeHighlighted(e)
          const arrow = getEdgeArrow(e)

          const x1 = from.x / 100 * VIEW_W, y1 = from.y / 100 * VIEW_H
          const x2 = to.x   / 100 * VIEW_W, y2 = to.y   / 100 * VIEW_H
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const showForward  = spec.directed || arrow === "forward" || arrow === "both"
          const showBackward = arrow === "backward" || arrow === "both"

          return (
            <g key={i}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                className={`transition-colors duration-300 ${highlighted ? "stroke-emerald-300" : "stroke-gray-300"}`}
                strokeWidth={highlighted ? 1 : 0.7}
              />
              {showForward && (
                <polygon points={arrowPolygonPoints(x2, y2, angle, NODE_R)} className="fill-indigo-500" />
              )}
              {showBackward && (
                <polygon points={arrowPolygonPoints(x1, y1, angle + Math.PI, NODE_R)} className="fill-amber-500" />
              )}
            </g>
          )
        })}

        {/* 노드 */}
        {spec.nodes.map(n => {
          const state = getNodeState(n.id)
          const style = NODE_STYLE[state]
          const cx = n.x / 100 * VIEW_W
          const cy = n.y / 100 * VIEW_H
          return (
            <g key={n.id}>
              {state === "current" && (
                <circle
                  cx={cx} cy={cy} r={NODE_R}
                  className="fill-indigo-400 opacity-60 animate-ping"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}
              <circle
                cx={cx} cy={cy} r={NODE_R}
                className={`transition-colors duration-300 ${style.fill} ${style.stroke}`}
                strokeWidth={1}
              />
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="central"
                className={`text-[6px] font-bold ${style.text}`}
              >
                {n.label || n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
