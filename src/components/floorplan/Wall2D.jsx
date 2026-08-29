export default function Wall2D({ wall, start, end, scale, selected, onPointerDown }) {
  const strokeWidth = Math.max(7, Math.min(18, wall.thickness * scale))

  return (
    <g
      className={`floorplan-wall ${selected ? 'selected' : ''}`}
      data-wall-id={wall.id}
      onPointerDown={onPointerDown}
    >
      {selected && <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#f59e0b" strokeWidth={strokeWidth + 8} strokeLinecap="square" />}
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={wall.kind === 'exterior' ? '#273238' : '#5e6b72'} strokeWidth={strokeWidth} strokeLinecap="square" />
      <line className="wall-hit-target" x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={Math.max(24, strokeWidth + 12)} />
    </g>
  )
}
