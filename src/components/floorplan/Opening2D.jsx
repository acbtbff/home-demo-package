import { getOpeningWorldPosition, getWallDirection } from '../../domain/roomGeometry.js'

export default function Opening2D({ opening, wall, transform, selected, onPointerDown }) {
  const centerWorld = getOpeningWorldPosition(wall, opening)
  const direction = getWallDirection(wall)
  const center = transform.worldToScreen(centerWorld)
  const half = opening.width * transform.scale / 2
  const start = { x: center.x - direction.x * half, y: center.y - direction.z * half }
  const end = { x: center.x + direction.x * half, y: center.y + direction.z * half }
  const normal = { x: -direction.z, y: direction.x }
  const openingClass = `floorplan-opening ${opening.type} ${selected ? 'selected' : ''}`

  return (
    <g className={openingClass} data-opening-id={opening.id} onPointerDown={onPointerDown}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="opening-gap" />
      {opening.type === 'window' ? (
        <>
          <line x1={start.x + normal.x * 4} y1={start.y + normal.y * 4} x2={end.x + normal.x * 4} y2={end.y + normal.y * 4} />
          <line x1={start.x - normal.x * 4} y1={start.y - normal.y * 4} x2={end.x - normal.x * 4} y2={end.y - normal.y * 4} />
        </>
      ) : (
        <>
          <line x1={start.x} y1={start.y} x2={start.x + normal.x * half * 2} y2={start.y + normal.y * half * 2} />
          <path d={`M ${end.x} ${end.y} A ${half * 2} ${half * 2} 0 0 0 ${start.x + normal.x * half * 2} ${start.y + normal.y * half * 2}`} fill="none" />
        </>
      )}
      <line className="opening-hit-target" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
    </g>
  )
}
