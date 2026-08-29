import { useRef } from 'react'
import { Plane, Vector3 } from 'three'
import {
  createBeginFurnitureInteractionCommand,
  createCancelFurnitureInteractionCommand,
  createEndFurnitureInteractionCommand,
  createMoveFurnitureCommand,
  createRotateFurnitureYCommand,
  createSelectFurnitureCommand,
} from '../../domain/interactionCommands.js'
import { createGeometryProxyFromFurniture } from '../../domain/spatialContracts.js'
import GeometryProxyBox from './GeometryProxyBox.jsx'
import FurnitureVisualModel from './FurnitureVisualModel.jsx'

const floorPlane = new Plane(new Vector3(0, 1, 0), 0)

export default function FurnitureInstance({
  furniture,
  placement,
  selected,
  showGeometryProxy,
  spatialFacts = null,
  dispatchFurnitureCommand,
  onDragStateChange,
  styleMode = 'ORIGINAL',
}) {
  const dragRef = useRef(null)
  const geometryProxy = createGeometryProxyFromFurniture(furniture)
  const selectionRadius = Math.hypot(geometryProxy.dimensionsM.width ?? 0.01, geometryProxy.dimensionsM.depth ?? 0.01) / 2
  const pointOnFloor = (event) => event.ray.intersectPlane(floorPlane, new Vector3())

  const startDrag = (event) => {
    event.stopPropagation()
    event.target.setPointerCapture(event.pointerId)
    dispatchFurnitureCommand(createSelectFurnitureCommand(furniture.id))
    dispatchFurnitureCommand(createBeginFurnitureInteractionCommand(furniture.id))
    dragRef.current = {
      mode: event.button === 2 || event.shiftKey ? 'rotate' : 'move',
      startPoint: pointOnFloor(event),
      startClientX: event.clientX,
      lastClientX: event.clientX,
      startPosition: { ...placement.position },
    }
    onDragStateChange(true)
  }

  const drag = (event) => {
    if (!dragRef.current?.startPoint) return
    event.stopPropagation()
    if (dragRef.current.mode === 'rotate') {
      const deltaX = event.clientX - dragRef.current.lastClientX
      dragRef.current.lastClientX = event.clientX
      dispatchFurnitureCommand(createRotateFurnitureYCommand({
        furnitureId: furniture.id,
        deltaRadians: deltaX * 0.01,
      }))
      return
    }
    const point = pointOnFloor(event)
    if (!point) return
    dispatchFurnitureCommand(createMoveFurnitureCommand({
      furnitureId: furniture.id,
      deltaX: dragRef.current.startPosition.x + point.x - dragRef.current.startPoint.x - placement.position.x,
      deltaZ: dragRef.current.startPosition.z + point.z - dragRef.current.startPoint.z - placement.position.z,
    }))
  }

  const stopDrag = (event) => {
    event.stopPropagation()
    event.target.releasePointerCapture(event.pointerId)
    dispatchFurnitureCommand(createEndFurnitureInteractionCommand(furniture.id))
    dragRef.current = null
    onDragStateChange(false)
  }

  return (
    <group
      name={`furniture-instance:${furniture.id}`}
      position={[placement.position.x, placement.position.y, placement.position.z]}
      rotation={[0, placement.rotationY, 0]}
      userData={{ furnitureId: furniture.id, placementId: placement.id }}
      onContextMenu={(event) => event.nativeEvent.preventDefault()}
    >
      <mesh
        name={`furniture-hitbox:${furniture.id}`}
        position={[0, furniture.physical.dimensionsM.height / 2, 0]}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={() => {
          dispatchFurnitureCommand(createCancelFurnitureInteractionCommand(furniture.id))
          dragRef.current = null
          onDragStateChange(false)
        }}
      >
        <boxGeometry args={[
          Math.max(0.05, furniture.physical.dimensionsM.width + 0.08),
          Math.max(0.05, furniture.physical.dimensionsM.height),
          Math.max(0.05, furniture.physical.dimensionsM.depth + 0.08),
        ]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <FurnitureVisualModel furniture={furniture} warning={Boolean(spatialFacts?.interiorWallCollision)} styleMode={styleMode} />
      {showGeometryProxy && (
        <GeometryProxyBox
          geometryProxy={geometryProxy}
          warning={Boolean(spatialFacts?.collisionDetected || spatialFacts?.outOfBounds)}
        />
      )}
      {selected && (
        <mesh name={`selection-ring:${furniture.id}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[selectionRadius + 0.05, selectionRadius + 0.11, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  )
}
