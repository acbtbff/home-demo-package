export default function DimensionLabel({ start, end, length }) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const magnitude = Math.hypot(dx, dy) || 1
  const normal = { x: -dy / magnitude, y: dx / magnitude }
  const center = {
    x: (start.x + end.x) / 2 + normal.x * 30,
    y: (start.y + end.y) / 2 + normal.y * 30,
  }

  return (
    <g className="dimension-label" pointerEvents="none">
      <line x1={start.x + normal.x * 22} y1={start.y + normal.y * 22} x2={end.x + normal.x * 22} y2={end.y + normal.y * 22} />
      <rect x={center.x - 34} y={center.y - 13} width="68" height="26" rx="7" />
      <text x={center.x} y={center.y + 4}>{length.toFixed(2)} m</text>
    </g>
  )
}
