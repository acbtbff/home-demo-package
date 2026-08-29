import assert from 'node:assert/strict'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { createPlacement } from '../src/domain/spatialContracts.js'
import {
  createBeginFurnitureInteractionCommand,
  createEndFurnitureInteractionCommand,
  createMoveFurnitureCommand,
  createOrbitCameraCommand,
  createRotateFurnitureYCommand,
  createUpdateFurnitureDimensionsCommand,
} from '../src/domain/interactionCommands.js'
import { analyzeSpatialState } from '../src/domain/spatialAnalyzer.js'
import { createFurnitureWorkspaceState, reduceFurnitureWorkspace } from '../src/state/useFurnitureWorkspace.js'
import { INITIAL_ROOM_DOCUMENT } from '../src/data/initialRoomDocument.js'

const roomDocument = structuredClone(INITIAL_ROOM_DOCUMENT)
roomDocument.walls.push({
  id: 'wall-bath-01',
  roomId: roomDocument.room.id,
  start: { x: 0.5, z: -1.0 },
  end: { x: 0.5, z: 1.0 },
  height: roomDocument.room.defaults.wallHeight,
  thickness: roomDocument.room.defaults.wallThickness,
  kind: 'partition',
  materialId: roomDocument.walls[0].materialId,
})
const originalRoomDocument = structuredClone(roomDocument)
const createBox = (id, dimensionsM) => createFurniture({ id, name: id, semantic: { category: 'FURNITURE', archetype: 'DESK' }, physical: { dimensionsM } })
const createPlacementFor = (furniture, position, rotationY = 0) => createPlacement({
  id: `placement-${furniture.id}`, furnitureId: furniture.id, roomId: roomDocument.room.id, position, rotationY,
})
const createState = (furnitureItems, placements, selectedFurnitureId) => ({
  ...createFurnitureWorkspaceState(),
  furnitureById: Object.fromEntries(furnitureItems.map((item) => [item.id, structuredClone(item)])),
  placementsById: Object.fromEntries(placements.map((item) => [item.id, structuredClone(item)])),
  previewPlacementsById: {},
  activeFurnitureInteraction: null,
  selectedFurnitureId,
})
const reduce = (state, command) => reduceFurnitureWorkspace(state, command, roomDocument)
const effectivePlacements = (state) => ({ ...state.placementsById, ...state.previewPlacementsById })
const factsFor = (state, furnitureId) => analyzeSpatialState({
  roomDocument,
  furnitureItems: Object.values(state.furnitureById),
  placementsById: effectivePlacements(state),
}).byFurnitureId[furnitureId]

const internalWallFurniture = createBox('internal-wall-furniture', { width: 0.4, depth: 0.4, height: 0.8 })
const internalWallStart = createPlacementFor(internalWallFurniture, { x: -0.5, y: 0, z: 0 })
let state = createState([internalWallFurniture], [internalWallStart], internalWallFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(internalWallFurniture.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: internalWallFurniture.id, deltaX: 1.5, deltaZ: 0 }))
assert.equal(state.placementsById[internalWallStart.id].position.x, -0.5)
assert.equal(state.previewPlacementsById[internalWallStart.id].position.x, 1)
assert.equal(factsFor(state, internalWallFurniture.id).collisionDetected, false)
state = reduce(state, createEndFurnitureInteractionCommand(internalWallFurniture.id))
assert.equal(state.placementsById[internalWallStart.id].position.x, 1)

state = createState([internalWallFurniture], [internalWallStart], internalWallFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(internalWallFurniture.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: internalWallFurniture.id, deltaX: 1.0, deltaZ: 0 }))
assert.equal(factsFor(state, internalWallFurniture.id).collisionDetected, true)
assert.equal(factsFor(state, internalWallFurniture.id).interiorWallCollision, true)
assert.equal(factsFor(state, internalWallFurniture.id).exteriorWallCollision, false)
assert.equal(factsFor(state, internalWallFurniture.id).furnitureCollision, false)
assert.ok(factsFor(state, internalWallFurniture.id).collidingWallIds.includes('wall-bath-01'))
state = reduce(state, createEndFurnitureInteractionCommand(internalWallFurniture.id))
assert.equal(state.placementsById[internalWallStart.id].position.x, 0.5)
assert.deepEqual(state.previewPlacementsById, {})

const desk = createBox('desk', { width: 1.2, depth: 0.6, height: 0.75 })
const chair = createBox('chair', { width: 0.62, depth: 0.62, height: 0.92 })
const deskPlacement = createPlacementFor(desk, { x: 0, y: 0, z: 0 })
const chairPlacement = createPlacementFor(chair, { x: 0, y: 0, z: 1.2 })
state = createState([desk, chair], [deskPlacement, chairPlacement], chair.id)
state = reduce(state, createBeginFurnitureInteractionCommand(chair.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: chair.id, deltaX: 0, deltaZ: -1.2 }))
assert.equal(state.previewPlacementsById[chairPlacement.id].position.z, 1.2)
state = reduce(state, createEndFurnitureInteractionCommand(chair.id))
assert.deepEqual(state.placementsById[chairPlacement.id].position, chairPlacement.position)

state = createState([desk, chair], [deskPlacement, chairPlacement], chair.id)
state = reduce(state, createBeginFurnitureInteractionCommand(chair.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: chair.id, deltaX: 0, deltaZ: 8 }))
assert.equal(state.previewPlacementsById[chairPlacement.id].position.z, 1.2)
state = reduce(state, createEndFurnitureInteractionCommand(chair.id))
assert.deepEqual(state.placementsById[chairPlacement.id].position, chairPlacement.position)

const exteriorPlacement = createPlacementFor(internalWallFurniture, { x: -1.2, y: 0, z: 0 })
state = createState([internalWallFurniture], [exteriorPlacement], internalWallFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(internalWallFurniture.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: internalWallFurniture.id, deltaX: -0.25, deltaZ: 0 }))
assert.equal(state.previewPlacementsById[exteriorPlacement.id].position.x, -1.2)

const acrossWallFurniture = createBox('across-wall-furniture', { width: 0.4, depth: 0.4, height: 0.8 })
const acrossWallPlacement = createPlacementFor(acrossWallFurniture, { x: 1.0, y: 0, z: 0 })
state = createState([internalWallFurniture, acrossWallFurniture], [internalWallStart, acrossWallPlacement], internalWallFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(internalWallFurniture.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: internalWallFurniture.id, deltaX: 1.5, deltaZ: 0 }))
assert.equal(state.previewPlacementsById[internalWallStart.id].position.x, -0.5)

state = createState([acrossWallFurniture], [acrossWallPlacement], acrossWallFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(acrossWallFurniture.id))
state = reduce(state, createMoveFurnitureCommand({ furnitureId: acrossWallFurniture.id, deltaX: 0.45, deltaZ: 0.5 }))
assert.deepEqual(state.previewPlacementsById[acrossWallPlacement.id].position, acrossWallPlacement.position)

const rotatingFurniture = createBox('rotating-furniture', { width: 0.2, depth: 0.8, height: 0.8 })
const validRotationPlacement = createPlacementFor(rotatingFurniture, { x: 0, y: 0, z: 0 })
state = createState([rotatingFurniture], [validRotationPlacement], rotatingFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(rotatingFurniture.id))
state = reduce(state, createRotateFurnitureYCommand({ furnitureId: rotatingFurniture.id, deltaRadians: Math.PI / 2 }))
state = reduce(state, createEndFurnitureInteractionCommand(rotatingFurniture.id))
assert.equal(state.placementsById[validRotationPlacement.id].rotationY, Math.PI / 2)

const invalidRotationPlacement = createPlacementFor(rotatingFurniture, { x: 0.15, y: 0, z: 0 })
state = createState([rotatingFurniture], [invalidRotationPlacement], rotatingFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(rotatingFurniture.id))
state = reduce(state, createRotateFurnitureYCommand({ furnitureId: rotatingFurniture.id, deltaRadians: Math.PI / 2 }))
assert.equal(factsFor(state, rotatingFurniture.id).collisionDetected, true)
state = reduce(state, createEndFurnitureInteractionCommand(rotatingFurniture.id))
assert.equal(state.placementsById[invalidRotationPlacement.id].rotationY, Math.PI / 2)

const rotationObstacle = createBox('rotation-obstacle', { width: 0.3, depth: 0.3, height: 0.8 })
const rotationObstaclePlacement = createPlacementFor(rotationObstacle, { x: 0.3, y: 0, z: 0 })
const furnitureRotationStart = createPlacementFor(rotatingFurniture, { x: 0, y: 0, z: 0 }, 0)
state = createState([rotatingFurniture, rotationObstacle], [furnitureRotationStart, rotationObstaclePlacement], rotatingFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(rotatingFurniture.id))
state = reduce(state, createRotateFurnitureYCommand({ furnitureId: rotatingFurniture.id, deltaRadians: Math.PI / 2 }))
assert.equal(state.previewPlacementsById[furnitureRotationStart.id].rotationY, 0)

const exteriorRotationStart = createPlacementFor(rotatingFurniture, { x: -1.3, y: 0, z: 0 }, 0)
state = createState([rotatingFurniture], [exteriorRotationStart], rotatingFurniture.id)
state = reduce(state, createBeginFurnitureInteractionCommand(rotatingFurniture.id))
state = reduce(state, createRotateFurnitureYCommand({ furnitureId: rotatingFurniture.id, deltaRadians: Math.PI / 2 }))
assert.equal(state.previewPlacementsById[exteriorRotationStart.id].rotationY, 0)

const dimensionEditState = reduce(createState([chair], [chairPlacement], chair.id), createUpdateFurnitureDimensionsCommand({ furnitureId: chair.id, patch: { width: 2 } }))
assert.equal(dimensionEditState.furnitureById[chair.id].physical.dimensionsM.width, 2)
const cameraCommand = createOrbitCameraCommand({ deltaYaw: 0.2, deltaPitch: -0.1 })
const cameraState = reduce(createState([chair], [chairPlacement], chair.id), cameraCommand)
assert.strictEqual(cameraState.lastRoomCommand, cameraCommand)
assert.deepEqual(roomDocument, originalRoomDocument)

console.log('SPATIAL-002D collision policy tests passed')
