export default function WallHandle({ wallId, endpoint, point, onPointerDown }) {
  return (
    <circle
      className="wall-handle"
      data-wall-id={wallId}
      data-endpoint={endpoint}
      cx={point.x}
      cy={point.y}
      r="9"
      onPointerDown={onPointerDown}
    />
  )
}
