import assert from 'node:assert/strict'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { createPlacement } from '../src/domain/spatialContracts.js'
import {
  analyzeSpatialState,
  buildExteriorWallPolygon,
  createBoxFootprintObb,
  createWallSolidObbs,
  doObbsOverlap,
} from '../src/domain/spatialAnalyzer.js'
import { INITIAL_ROOM_DOCUMENT } from '../src/data/initialRoomDocument.js'
import { getOpeningWorldPosition } from '../src/domain/roomGeometry.js'

const createBoxFurniture = (id, dimensionsM = { width: 1, depth: 1, height: 1 }) => createFurniture({
  id,
  name: id,
  semantic: { category: 'OTHER', archetype: 'OTHER' },
  physical: { dimensionsM },
})

const createPlacementFor = (furniture, position, rotationY = 0) => createPlacement({
  id: `placement-${furniture.id}`,
  furnitureId: furniture.id,
  roomId: 'room-01',
  position,
  rotationY,
})

const analyze = ({ furnitureItems, placementsById }) => analyzeSpatialState({
  roomDocument: INITIAL_ROOM_DOCUMENT,
  furnitureItems,
  placementsById,
})

const roomPolygon = buildExteriorWallPolygon(INITIAL_ROOM_DOCUMENT.walls)
assert.equal(roomPolygon.length, 4)

const wallObbs = createWallSolidObbs(INITIAL_ROOM_DOCUMENT)
const internalWallRoomDocument = structuredClone(INITIAL_ROOM_DOCUMENT)
internalWallRoomDocument.walls.push({
  id: 'wall-bath-01',
  roomId: internalWallRoomDocument.room.id,
  start: { x: 0.6, z: -0.8 },
  end: { x: 0.6, z: 0.8 },
  height: internalWallRoomDocument.room.defaults.wallHeight,
  thickness: internalWallRoomDocument.room.defaults.wallThickness,
  kind: 'partition',
  materialId: internalWallRoomDocument.walls[0].materialId,
})
const entryDoorOpening = INITIAL_ROOM_DOCUMENT.openings.find((opening) => opening.id === 'door-entry')
const doorWall = INITIAL_ROOM_DOCUMENT.walls.find((wall) => wall.id === entryDoorOpening.wallId)
const doorWallObbs = wallObbs.filter((obb) => obb.wallId === doorWall.id)
assert.equal(doorWallObbs.length, 3)
const doorHeader = doorWallObbs.find((obb) => obb.minY >= entryDoorOpening.sillHeight + entryDoorOpening.height)
const doorWorld = getOpeningWorldPosition(doorWall, entryDoorOpening)
assert.equal(doorHeader.minY, entryDoorOpening.height)
assert.ok(Math.hypot(doorHeader.center.x - doorWorld.x, doorHeader.center.z - doorWorld.z) < 1e-9)
assert.equal(doorWallObbs.filter((obb) => obb !== doorHeader).length, 2)

const desk = createBoxFurniture('desk', { width: 1.2, depth: 0.6, height: 0.75 })
const chair = createBoxFurniture('chair', { width: 0.62, depth: 0.62, height: 0.92 })

const placements = {
  desk: createPlacementFor(desk, { x: 0, y: 0, z: 0 }, Math.PI / 2),
  chair: createPlacementFor(chair, { x: 0, y: 0, z: 0 }, Math.PI / 2),
}
const overlapping = analyze({ furnitureItems: [desk, chair], placementsById: placements })
assert.equal(overlapping.byFurnitureId[desk.id].collisionDetected, true)
assert.equal(overlapping.byFurnitureId[desk.id].furnitureCollision, true)
assert.equal(overlapping.byFurnitureId[desk.id].exteriorWallCollision, false)
assert.equal(overlapping.byFurnitureId[desk.id].interiorWallCollision, false)
assert.equal(overlapping.byFurnitureId[chair.id].collisionDetected, true)
assert.deepEqual(overlapping.byFurnitureId[desk.id].collidingFurnitureIds, [chair.id])

placements.chair = createPlacementFor(chair, { x: 0, y: 0, z: 1.2 }, Math.PI / 2)
const separated = analyze({ furnitureItems: [desk, chair], placementsById: placements })
assert.equal(separated.byFurnitureId[desk.id].collisionDetected, false)
assert.equal(separated.byFurnitureId[chair.id].collisionDetected, false)
assert.equal(separated.byFurnitureId[desk.id].outOfBounds, false)

placements.desk = createPlacementFor(desk, { x: 0, y: 0, z: 0 }, 0)
placements.chair = createPlacementFor(chair, { x: 1, y: 0, z: 0 }, Math.PI / 2)
const rotatedApart = analyze({ furnitureItems: [desk, chair], placementsById: placements })
assert.equal(rotatedApart.byFurnitureId.desk.collisionDetected, false)

placements.desk = createPlacementFor(desk, { x: 0, y: 0, z: 0 }, 0)
placements.chair = createPlacementFor(chair, { x: 0.8, y: 0, z: 0 }, Math.PI / 2)
const rotatedColliding = analyze({ furnitureItems: [desk, chair], placementsById: placements })
assert.equal(rotatedColliding.byFurnitureId.desk.collisionDetected, true)

const rotatingDesk = createBoxFurniture('rotating-desk', { width: 1, depth: 0.25, height: 1 })
const rotatingChair = createBoxFurniture('rotating-chair', { width: 0.3, depth: 0.3, height: 1 })
const rotatingPlacements = {
  rotatingDeskId: createPlacementFor(rotatingDesk, { x: 0, y: 0, z: 0 }, 0),
  rotatingChairId: createPlacementFor(rotatingChair, { x: 0.5, y: 0, z: 0 }, 0),
}
const beforeRotation = analyze({ furnitureItems: [rotatingDesk, rotatingChair], placementsById: rotatingPlacements })
assert.equal(beforeRotation.byFurnitureId[rotatingDesk.id].collisionDetected, true)

rotatingPlacements.rotatingDeskId = createPlacementFor(rotatingDesk, { x: 0, y: 0, z: 0 }, Math.PI / 4)
rotatingPlacements.rotatingChairId = createPlacementFor(rotatingChair, { x: 0.5, y: 0, z: 0 }, 0)
const afterRotation = analyze({ furnitureItems: [rotatingDesk, rotatingChair], placementsById: rotatingPlacements })
assert.equal(afterRotation.byFurnitureId[rotatingDesk.id].collisionDetected, false)

const wallCollidingDesk = createBoxFurniture('wall-desk')
const wallCollision = analyze({
  furnitureItems: [wallCollidingDesk],
  placementsById: {
    wallDesk: createPlacementFor(wallCollidingDesk, { x: -1.4, y: 0, z: 0 }),
  },
})
assert.equal(wallCollision.byFurnitureId[wallCollidingDesk.id].collisionDetected, true)
assert.equal(wallCollision.byFurnitureId[wallCollidingDesk.id].exteriorWallCollision, true)
assert.ok(wallCollision.byFurnitureId[wallCollidingDesk.id].collidingWallIds.includes('wall-west'))

const outOfBoundsDesk = createBoxFurniture('out-of-bounds-desk')
const outOfBounds = analyze({
  furnitureItems: [outOfBoundsDesk],
  placementsById: {
    outOfBoundsDesk: createPlacementFor(outOfBoundsDesk, { x: 0, y: 0, z: 10 }),
  },
})
assert.equal(outOfBounds.byFurnitureId[outOfBoundsDesk.id].outOfBounds, true)

const resizableDesk = createBoxFurniture('resizable-desk', { width: 0.5, depth: 0.5, height: 0.75 })
const resizedChair = createBoxFurniture('resized-chair', { width: 0.5, depth: 0.5, height: 0.92 })
const resizePlacements = {
  resizableDesk: createPlacementFor(resizableDesk, { x: 0, y: 0, z: 0 }),
  resizedChair: createPlacementFor(resizedChair, { x: 0.8, y: 0, z: 0 }),
}
const beforeResize = analyze({ furnitureItems: [resizableDesk, resizedChair], placementsById: resizePlacements })
assert.equal(beforeResize.byFurnitureId[resizableDesk.id].collisionDetected, false)

const grownDesk = {
  ...resizableDesk,
  physical: {
    ...resizableDesk.physical,
    dimensionsM: { ...resizableDesk.physical.dimensionsM, width: 1.2 },
  },
}
const afterResize = analyze({ furnitureItems: [grownDesk, resizedChair], placementsById: resizePlacements })
assert.equal(afterResize.byFurnitureId[resizableDesk.id].collisionDetected, true)

const axisAlignedObb = createBoxFootprintObb(
  { dimensionsM: { width: 1, depth: 1, height: 1 } },
  createPlacement({ position: { x: -1.4, y: 0, z: 0 }, rotationY: 0 }),
)
const westWallObb = wallObbs.find((obb) => obb.wallId === 'wall-west')
assert.ok(doObbsOverlap(axisAlignedObb, westWallObb))

const internalWallFurniture = createBoxFurniture('internal-wall-furniture', { width: 0.4, depth: 0.4, height: 0.8 })
const awayFromInternalWall = analyzeSpatialState({
  roomDocument: internalWallRoomDocument,
  furnitureItems: [internalWallFurniture],
  placementsById: { away: createPlacementFor(internalWallFurniture, { x: -0.3, y: 0, z: 0 }) },
})
assert.equal(awayFromInternalWall.byFurnitureId[internalWallFurniture.id].collisionDetected, false)

const overlappingInternalWall = analyzeSpatialState({
  roomDocument: internalWallRoomDocument,
  furnitureItems: [internalWallFurniture],
  placementsById: { overlap: createPlacementFor(internalWallFurniture, { x: 0.6, y: 0, z: 0 }) },
})
assert.equal(overlappingInternalWall.byFurnitureId[internalWallFurniture.id].collisionDetected, true)
assert.equal(overlappingInternalWall.byFurnitureId[internalWallFurniture.id].interiorWallCollision, true)
assert.equal(overlappingInternalWall.byFurnitureId[internalWallFurniture.id].exteriorWallCollision, false)
assert.ok(overlappingInternalWall.byFurnitureId[internalWallFurniture.id].collidingWallIds.includes('wall-bath-01'))

const rotatingInternalWallFurniture = createBoxFurniture('rotating-internal-wall-furniture', { width: 0.2, depth: 0.8, height: 0.8 })
const internalRotationStart = createPlacementFor(rotatingInternalWallFurniture, { x: 0.25, y: 0, z: 0 }, 0)
const beforeInternalRotation = analyzeSpatialState({
  roomDocument: internalWallRoomDocument,
  furnitureItems: [rotatingInternalWallFurniture],
  placementsById: { rotation: internalRotationStart },
})
assert.equal(beforeInternalRotation.byFurnitureId[rotatingInternalWallFurniture.id].collisionDetected, false)
const rotatedIntoInternalWall = analyzeSpatialState({
  roomDocument: internalWallRoomDocument,
  furnitureItems: [rotatingInternalWallFurniture],
  placementsById: {
    rotation: createPlacementFor(rotatingInternalWallFurniture, { x: 0.25, y: 0, z: 0 }, Math.PI / 2),
  },
})
assert.ok(rotatedIntoInternalWall.byFurnitureId[rotatingInternalWallFurniture.id].collidingWallIds.includes('wall-bath-01'))
const diagonalRoomDocument = structuredClone(INITIAL_ROOM_DOCUMENT)
diagonalRoomDocument.walls.push({
  id: 'wall-diagonal-partition',
  roomId: diagonalRoomDocument.room.id,
  start: { x: -1, z: -1 },
  end: { x: 1, z: 1 },
  height: 2.2,
  thickness: 0.12,
  kind: 'partition',
  materialId: diagonalRoomDocument.walls[0].materialId,
})
const diagonalCollision = analyzeSpatialState({
  roomDocument: diagonalRoomDocument,
  furnitureItems: [internalWallFurniture],
  placementsById: { diagonal: createPlacementFor(internalWallFurniture, { x: 0, y: 0, z: 0 }) },
})
assert.ok(diagonalCollision.byFurnitureId[internalWallFurniture.id].collidingWallIds.includes('wall-diagonal-partition'))

const internalDoorRoomDocument = structuredClone(INITIAL_ROOM_DOCUMENT)
internalDoorRoomDocument.walls.push({
  id: 'wall-internal-door',
  roomId: internalDoorRoomDocument.room.id,
  start: { x: 0, z: -1 },
  end: { x: 0, z: 1 },
  height: 2.2,
  thickness: 0.12,
  kind: 'partition',
  materialId: internalDoorRoomDocument.walls[0].materialId,
})
internalDoorRoomDocument.openings.push({
  id: 'door-internal',
  type: 'door',
  wallId: 'wall-internal-door',
  offset: 1,
  width: 0.8,
  height: 2.1,
  sillHeight: 0,
})
const internalDoorFurniture = createBoxFurniture('internal-door-furniture', { width: 0.3, depth: 0.3, height: 1 })
const internalDoorPassage = analyzeSpatialState({
  roomDocument: internalDoorRoomDocument,
  furnitureItems: [internalDoorFurniture],
  placementsById: { doorway: createPlacementFor(internalDoorFurniture, { x: 0, y: 0, z: 0 }) },
})
assert.equal(internalDoorPassage.byFurnitureId[internalDoorFurniture.id].collisionDetected, false)

console.log('SPATIAL-001 contract tests passed')
