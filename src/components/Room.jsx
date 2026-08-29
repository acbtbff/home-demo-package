import { useRef } from 'react'
import { Plane, Vector3 } from 'three'
import { getExteriorWallsBounds } from '../domain/roomGeometry.js'
import WallSegment from './WallSegment.jsx'

const floorPlane = new Plane(new Vector3(0, 1, 0), 0)

function ResizeHandle({ axis, position, onResize, onDragStateChange }) {
  const startPoint = useRef(null)
  const startValue = useRef(0)
  const pointOnFloor = (event) => event.ray.intersectPlane(floorPlane, new Vector3())

  return (
    <mesh
      position={position}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.target.setPointerCapture(event.pointerId)
        startPoint.current = pointOnFloor(event)
        startValue.current = axis === 'x' ? position[0] : position[2]
        onDragStateChange(true)
      }}
      onPointerMove={(event) => {
        if (!startPoint.current) return
        event.stopPropagation()
        const point = pointOnFloor(event)
        if (!point) return
        const delta = axis === 'x' ? point.x - startPoint.current.x : point.z - startPoint.current.z
        onResize(startValue.current + delta)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        event.target.releasePointerCapture(event.pointerId)
        startPoint.current = null
        onDragStateChange(false)
      }}
      onPointerCancel={() => {
        startPoint.current = null
        onDragStateChange(false)
      }}
    >
      <boxGeometry args={axis === 'x' ? [0.2, 0.24, 0.72] : [0.72, 0.24, 0.2]} />
      <meshStandardMaterial color="#f59e0b" emissive="#7c3b00" emissiveIntensity={0.35} />
    </mesh>
  )
}

function Room({ document, editWalls, onDimensionDrag, onDragStateChange }) {
  const bounds = getExteriorWallsBounds(document.walls)
  const floorThickness = document.room.floorThickness
  const materials = new Map(document.materials.map((material) => [material.id, material]))

  return (
    <group name="editable-room">
      <mesh
        name="floor"
        position={[bounds.centerX, -floorThickness / 2, bounds.centerZ]}
        receiveShadow
      >
        <boxGeometry args={[bounds.width + floorThickness * 2, floorThickness, bounds.depth + floorThickness * 2]} />
        <meshStandardMaterial color="#d8c4a8" roughness={0.92} metalness={0} />
      </mesh>

      {document.walls.map((wall) => (
        <WallSegment
          key={wall.id}
          wall={wall}
          openings={document.openings.filter((opening) => opening.wallId === wall.id)}
          color={materials.get(wall.materialId)?.color ?? '#eee9df'}
          roomCenter={{ x: bounds.centerX, z: bounds.centerZ }}
        />
      ))}

      {editWalls && (
        <group name="room-resize-handles">
          <ResizeHandle
            axis="x"
            position={[bounds.maxX, 0.12, bounds.centerZ]}
            onResize={(edge) => onDimensionDrag('width', (edge - bounds.centerX) * 2)}
            onDragStateChange={onDragStateChange}
          />
          <ResizeHandle
            axis="z"
            position={[bounds.centerX, 0.12, bounds.maxZ]}
            onResize={(edge) => onDimensionDrag('depth', (edge - bounds.centerZ) * 2)}
            onDragStateChange={onDragStateChange}
          />
        </group>
      )}
    </group>
  )
}

export default Room
