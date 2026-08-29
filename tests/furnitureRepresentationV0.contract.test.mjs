import assert from 'node:assert/strict'
import { createFurniture, assertFurnitureHasNoPlacement } from '../src/domain/furnitureSchema.js'
import { normalizeFurnitureSemantic } from '../src/domain/furnitureSemantic.js'
import { MODEL_STRATEGY_BY_ARCHETYPE, routeFurnitureModelStrategy, MODEL_STRATEGIES } from '../src/domain/furnitureRouter.js'
import {
  ASSET_SOURCES,
  ASSET_STATUSES,
  DEFAULT_ASSET_REGISTRY_V0,
  FLOOR_LAMP_LIBRARY_ASSET_V0,
  OFFICE_CHAIR_LIBRARY_ASSET_V0,
  TWO_SEAT_SOFA_LIBRARY_ASSET_V0,
  createAssetContract,
  resolveFurnitureAsset,
} from '../src/domain/furnitureAssets.js'
import { createGeometryProxyFromFurniture, createPlacement } from '../src/domain/spatialContracts.js'
import { analyzeSpatialState } from '../src/domain/spatialAnalyzer.js'
import { createVisualModelContract, VISUAL_MODEL_STATUS } from '../src/domain/visualModelContract.js'
import { createParametricDeskSpec } from '../src/domain/parametricDesk.js'
import { createAddFurnitureCommand, createMoveFurnitureCommand, createOrbitCameraCommand, createRemoveFurnitureCommand, createRotateFurnitureYCommand, createSelectFurnitureCommand } from '../src/domain/interactionCommands.js'
import { FURNITURE_CATALOG_V0 } from '../src/data/furnitureCatalog.js'
import {
  DEMO_DESK_FURNITURE,
  DEMO_DESK_PLACEMENT,
  DEMO_TWO_SEAT_SOFA_FURNITURE,
  DEMO_TWO_SEAT_SOFA_PLACEMENT,
} from '../src/data/demoFurniture.js'
import { INITIAL_ROOM_DOCUMENT } from '../src/data/initialRoomDocument.js'
import { createFurnitureWorkspaceState, reduceFurnitureWorkspace } from '../src/state/useFurnitureWorkspace.js'

assert.deepEqual(normalizeFurnitureSemantic('office chair'), { category: 'CHAIR', archetype: 'OFFICE_CHAIR' })
assert.deepEqual(normalizeFurnitureSemantic('office-chair'), { category: 'CHAIR', archetype: 'OFFICE_CHAIR' })
assert.deepEqual(normalizeFurnitureSemantic('office_chair'), { category: 'CHAIR', archetype: 'OFFICE_CHAIR' })
assert.deepEqual(normalizeFurnitureSemantic('OFFICE_CHAIR'), { category: 'CHAIR', archetype: 'OFFICE_CHAIR' })
assert.deepEqual(normalizeFurnitureSemantic('unknown'), { category: 'OTHER', archetype: 'OTHER' })

assert.equal(routeFurnitureModelStrategy('DESK'), MODEL_STRATEGIES.PARAMETRIC)
assert.equal(routeFurnitureModelStrategy('OFFICE_CHAIR'), MODEL_STRATEGIES.LIBRARY)
assert.equal(routeFurnitureModelStrategy('LADDER_SPECIAL'), MODEL_STRATEGIES.GENERATED)
assert.equal(routeFurnitureModelStrategy('TWO_SEAT_SOFA'), MODEL_STRATEGIES.LIBRARY)

const frozenStrategyMapV0 = {
  DOUBLE_BED: MODEL_STRATEGIES.PARAMETRIC,
  DESK: MODEL_STRATEGIES.PARAMETRIC,
  ROUND_COFFEE_TABLE: MODEL_STRATEGIES.PARAMETRIC,
  NIGHTSTAND: MODEL_STRATEGIES.PARAMETRIC,
  DESK_PEDESTAL: MODEL_STRATEGIES.PARAMETRIC,
  CHEST_OF_DRAWERS: MODEL_STRATEGIES.PARAMETRIC,
  OPEN_BOOKSHELF: MODEL_STRATEGIES.PARAMETRIC,
  GARMENT_RACK: MODEL_STRATEGIES.PARAMETRIC,
  AREA_RUG: MODEL_STRATEGIES.PARAMETRIC,
  OFFICE_CHAIR: MODEL_STRATEGIES.LIBRARY,
  TWO_SEAT_SOFA: MODEL_STRATEGIES.LIBRARY,
  FLOOR_LAMP: MODEL_STRATEGIES.LIBRARY,
  DESK_LAMP: MODEL_STRATEGIES.LIBRARY,
  TABLE_LAMP: MODEL_STRATEGIES.LIBRARY,
  LADDER_SPECIAL: MODEL_STRATEGIES.GENERATED,
}
assert.deepEqual(MODEL_STRATEGY_BY_ARCHETYPE, frozenStrategyMapV0)
for (const [archetype, strategy] of Object.entries(frozenStrategyMapV0)) {
  assert.equal(routeFurnitureModelStrategy(archetype), strategy)
}

const furniture = createFurniture({
  id: 'furniture-01',
  name: 'Office chair',
  semantic: { archetype: 'OFFICE_CHAIR' },
  physical: { dimensionsM: { width: 0.62, depth: 0.64, height: 0 }, foldable: undefined },
  roomId: 'room-01',
  position: { x: 1, y: 0, z: 1 },
  rotationY: 1.57,
})

assert.equal(furniture.physical.dimensionsM.height, null)
assert.equal(furniture.physical.foldable, null)
assertFurnitureHasNoPlacement(furniture)
assert.equal(Object.hasOwn(furniture, 'roomId'), false)
assert.equal(Object.hasOwn(furniture, 'position'), false)
assert.equal(Object.hasOwn(furniture, 'rotationY'), false)

const geometryProxy = createGeometryProxyFromFurniture(furniture)
assert.deepEqual(geometryProxy.dimensionsM, furniture.physical.dimensionsM)
assert.equal(geometryProxy.shape, 'BOX')
assert.equal(geometryProxy.pivot, 'bottom-center')

const asset = createAssetContract({
  id: 'asset-office-chair-v0',
  archetype: 'OFFICE_CHAIR',
  modelUrl: '/assets/example.glb',
  referenceDimensionsM: { width: 9, depth: 9, height: 9 },
  source: ASSET_SOURCES.LOCAL,
  status: ASSET_STATUSES.READY,
})
assert.equal(furniture.physical.dimensionsM.width, 0.62)
assert.equal(asset.referenceDimensionsM.width, 9)

const chairAssetResult = resolveFurnitureAsset(furniture)
assert.equal(OFFICE_CHAIR_LIBRARY_ASSET_V0.status, ASSET_STATUSES.READY)
assert.equal(OFFICE_CHAIR_LIBRARY_ASSET_V0.modelUrl, '/assets/furniture/office-chair.glb')
assert.equal(OFFICE_CHAIR_LIBRARY_ASSET_V0.normalization.rotationOrder, 'YXZ')
assert.equal(chairAssetResult.asset, OFFICE_CHAIR_LIBRARY_ASSET_V0)
assert.equal(chairAssetResult.status, ASSET_STATUSES.READY)
assert.equal(chairAssetResult.visualModelAvailable, true)

const missingAssetResult = resolveFurnitureAsset('UNKNOWN_ARCHETYPE')
assert.equal(missingAssetResult.asset, null)
assert.equal(missingAssetResult.status, ASSET_STATUSES.UNAVAILABLE)
assert.equal(missingAssetResult.visualModelAvailable, false)
assert.equal(missingAssetResult.fallback, 'GEOMETRY_PROXY')

const frozenStrategySnapshot = structuredClone(MODEL_STRATEGY_BY_ARCHETYPE)
const libraryOnlyDeskRegistry = [createAssetContract({
  id: 'asset-desk-library-only',
  archetype: 'DESK',
  modelUrl: '/assets/desk.glb',
  source: ASSET_SOURCES.LOCAL,
  status: ASSET_STATUSES.READY,
})]
const assetIndependentDeskResult = resolveFurnitureAsset(DEMO_DESK_FURNITURE, libraryOnlyDeskRegistry)
assert.equal(assetIndependentDeskResult.asset.id, 'asset-desk-library-only')
assert.deepEqual(MODEL_STRATEGY_BY_ARCHETYPE, frozenStrategySnapshot)

const multipleChairAssets = [
  createAssetContract({ id: 'chair-placeholder', archetype: 'OFFICE_CHAIR', modelUrl: '/placeholder.glb', status: ASSET_STATUSES.PLACEHOLDER }),
  ...DEFAULT_ASSET_REGISTRY_V0,
  createAssetContract({ id: 'chair-ready-2', archetype: 'OFFICE_CHAIR', modelUrl: '/chair-2.glb', status: ASSET_STATUSES.READY }),
]
assert.equal(multipleChairAssets.filter((entry) => entry.archetype === 'OFFICE_CHAIR').length, 3)
assert.equal(resolveFurnitureAsset('OFFICE_CHAIR', multipleChairAssets).asset.id, OFFICE_CHAIR_LIBRARY_ASSET_V0.id)

assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.status, ASSET_STATUSES.READY)
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.modelUrl, '/assets/furniture/two-seat-sofa.glb')
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.normalization.rotationX, -0.26055822)
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.normalization.rotationY, -0.26162195)
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.normalization.rotationZ, 0)
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.normalization.rotationOrder, 'YXZ')
assert.equal(DEMO_TWO_SEAT_SOFA_PLACEMENT.rotationY, 0)
const sofaAssetResult = resolveFurnitureAsset(DEMO_TWO_SEAT_SOFA_FURNITURE)
assert.equal(sofaAssetResult.asset, TWO_SEAT_SOFA_LIBRARY_ASSET_V0)
assert.equal(sofaAssetResult.status, ASSET_STATUSES.READY)

const readySofaAsset = createAssetContract({
  ...TWO_SEAT_SOFA_LIBRARY_ASSET_V0,
  status: ASSET_STATUSES.READY,
})
const readySofaResult = resolveFurnitureAsset(DEMO_TWO_SEAT_SOFA_FURNITURE, [readySofaAsset])
assert.equal(readySofaResult.asset, readySofaAsset)
assert.equal(readySofaResult.status, ASSET_STATUSES.READY)
const sofaVisualModel = createVisualModelContract({
  furnitureId: DEMO_TWO_SEAT_SOFA_FURNITURE.id,
  strategy: MODEL_STRATEGIES.LIBRARY,
  asset: readySofaAsset,
})
assert.equal(sofaVisualModel.status, VISUAL_MODEL_STATUS.AVAILABLE)

assert.equal(DEMO_TWO_SEAT_SOFA_FURNITURE.physical.dimensionsM.width, 1.65)
assert.equal(TWO_SEAT_SOFA_LIBRARY_ASSET_V0.referenceDimensionsM.width, 1.72)
assert.equal(DEMO_TWO_SEAT_SOFA_FURNITURE.modelStrategy.preferred, MODEL_STRATEGIES.LIBRARY)
assert.equal(DEMO_TWO_SEAT_SOFA_FURNITURE.modelStrategy.resolved, MODEL_STRATEGIES.LIBRARY)
assertFurnitureHasNoPlacement(DEMO_TWO_SEAT_SOFA_FURNITURE)
assert.equal(DEMO_TWO_SEAT_SOFA_PLACEMENT.furnitureId, DEMO_TWO_SEAT_SOFA_FURNITURE.id)
const sofaGeometryProxy = createGeometryProxyFromFurniture(DEMO_TWO_SEAT_SOFA_FURNITURE)
assert.deepEqual(sofaGeometryProxy.dimensionsM, DEMO_TWO_SEAT_SOFA_FURNITURE.physical.dimensionsM)
const sofaSpatialFacts = analyzeSpatialState({
  roomDocument: INITIAL_ROOM_DOCUMENT,
  furnitureItems: [DEMO_TWO_SEAT_SOFA_FURNITURE],
  placementsById: { [DEMO_TWO_SEAT_SOFA_PLACEMENT.id]: DEMO_TWO_SEAT_SOFA_PLACEMENT },
}).byFurnitureId[DEMO_TWO_SEAT_SOFA_FURNITURE.id]
assert.equal(sofaSpatialFacts.furnitureCollision, false)
assert.equal(sofaSpatialFacts.outOfBounds, false)

assert.equal(FLOOR_LAMP_LIBRARY_ASSET_V0.status, ASSET_STATUSES.READY)
assert.equal(FLOOR_LAMP_LIBRARY_ASSET_V0.modelUrl, '/assets/furniture/floor-lamp.glb')
assert.equal(FLOOR_LAMP_LIBRARY_ASSET_V0.normalization.rotationY, -0.63847124)
const floorLampAssetResult = resolveFurnitureAsset('FLOOR_LAMP')
assert.equal(floorLampAssetResult.asset, FLOOR_LAMP_LIBRARY_ASSET_V0)
assert.equal(floorLampAssetResult.status, ASSET_STATUSES.READY)

assert.equal(DEMO_DESK_FURNITURE.semantic.category, 'TABLE')
assert.equal(DEMO_DESK_FURNITURE.semantic.archetype, 'DESK')
assert.equal(DEMO_DESK_FURNITURE.modelStrategy.preferred, MODEL_STRATEGIES.PARAMETRIC)
assert.equal(DEMO_DESK_FURNITURE.modelStrategy.resolved, MODEL_STRATEGIES.PARAMETRIC)
assertFurnitureHasNoPlacement(DEMO_DESK_FURNITURE)
assert.equal(DEMO_DESK_PLACEMENT.furnitureId, DEMO_DESK_FURNITURE.id)
assert.equal(DEMO_DESK_PLACEMENT.roomId, 'room-01')

const deskProxy = createGeometryProxyFromFurniture(DEMO_DESK_FURNITURE)
assert.deepEqual(deskProxy.dimensionsM, DEMO_DESK_FURNITURE.physical.dimensionsM)
assert.equal(deskProxy.shape, 'BOX')
assert.equal(deskProxy.pivot, 'bottom-center')

const wideDesk = createParametricDeskSpec({ width: 1.8, depth: 0.6, height: 0.75 })
const narrowDesk = createParametricDeskSpec({ width: 1.0, depth: 0.6, height: 0.75 })
assert.equal(wideDesk.parts.find((part) => part.id === 'tabletop').size.width, 1.8)
assert.equal(narrowDesk.parts.find((part) => part.id === 'tabletop').size.width, 1.0)
assert.ok(
  wideDesk.parts.find((part) => part.id === 'leg-1-1').position.x >
  narrowDesk.parts.find((part) => part.id === 'leg-1-1').position.x,
)

const tallerDesk = createParametricDeskSpec({ width: 1.2, depth: 0.6, height: 0.9 })
assert.ok(
  tallerDesk.parts.find((part) => part.id === 'leg-1-1').size.height >
  narrowDesk.parts.find((part) => part.id === 'leg-1-1').size.height,
)

const movedPlacement = createPlacement({ ...DEMO_DESK_PLACEMENT, position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 })
assert.equal(movedPlacement.furnitureId, DEMO_DESK_FURNITURE.id)
assert.equal(DEMO_DESK_FURNITURE.physical.dimensionsM.width, 1.2)
assert.equal(movedPlacement.position.x, 1)

let workspace = createFurnitureWorkspaceState()
assert.equal(Object.values(workspace.furnitureById).some((item) => item.semantic.archetype === 'OFFICE_CHAIR'), false)
assert.equal(Object.values(workspace.placementsById).some((item) => item.furnitureId === 'demo-office-chair-001'), false)
assert.deepEqual(FURNITURE_CATALOG_V0.map((item) => item.archetype), ['DESK', 'TWO_SEAT_SOFA', 'OFFICE_CHAIR', 'FLOOR_LAMP'])
assert.equal(FURNITURE_CATALOG_V0.some((item) => Object.hasOwn(item, 'placement')), false)

let catalogWorkspace = createFurnitureWorkspaceState()
const initialFurnitureCount = Object.keys(catalogWorkspace.furnitureById).length
catalogWorkspace = reduceFurnitureWorkspace(catalogWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[0]), INITIAL_ROOM_DOCUMENT)
const addedDeskId = catalogWorkspace.selectedFurnitureId
const addedDesk = catalogWorkspace.furnitureById[addedDeskId]
const addedDeskPlacement = Object.values(catalogWorkspace.placementsById).find((item) => item.furnitureId === addedDeskId)
assert.equal(Object.keys(catalogWorkspace.furnitureById).length, initialFurnitureCount + 1)
assert.equal(addedDesk.semantic.archetype, 'DESK')
assertFurnitureHasNoPlacement(addedDesk)
assert.equal(addedDeskPlacement.furnitureId, addedDesk.id)
const addedFacts = analyzeSpatialState({
  roomDocument: INITIAL_ROOM_DOCUMENT,
  furnitureItems: Object.values(catalogWorkspace.furnitureById),
  placementsById: catalogWorkspace.placementsById,
}).byFurnitureId[addedDeskId]
assert.equal(addedFacts.furnitureCollision, false)
assert.equal(addedFacts.exteriorWallCollision, false)
assert.equal(addedFacts.outOfBounds, false)

catalogWorkspace = reduceFurnitureWorkspace(catalogWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[1]), INITIAL_ROOM_DOCUMENT)
const addedSofaOneId = catalogWorkspace.selectedFurnitureId
catalogWorkspace = reduceFurnitureWorkspace(catalogWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[1]), INITIAL_ROOM_DOCUMENT)
const addedSofaTwoId = catalogWorkspace.selectedFurnitureId
assert.notEqual(addedSofaOneId, addedSofaTwoId)
assert.ok(catalogWorkspace.furnitureById[addedSofaOneId])
assert.ok(catalogWorkspace.furnitureById[addedSofaTwoId])
assert.ok(Object.values(catalogWorkspace.placementsById).find((item) => item.furnitureId === addedSofaOneId))
assert.ok(Object.values(catalogWorkspace.placementsById).find((item) => item.furnitureId === addedSofaTwoId))
const countBeforeRemove = Object.keys(catalogWorkspace.furnitureById).length
catalogWorkspace = reduceFurnitureWorkspace(catalogWorkspace, createRemoveFurnitureCommand(addedSofaOneId), INITIAL_ROOM_DOCUMENT)
assert.equal(Object.keys(catalogWorkspace.furnitureById).length, countBeforeRemove - 1)
assert.equal(catalogWorkspace.furnitureById[addedSofaOneId], undefined)
assert.equal(Object.values(catalogWorkspace.placementsById).some((item) => item.furnitureId === addedSofaOneId), false)
assert.ok(catalogWorkspace.furnitureById[addedSofaTwoId])
assert.equal(FURNITURE_CATALOG_V0.length, 4)

let chairWorkspace = createFurnitureWorkspaceState()
chairWorkspace = reduceFurnitureWorkspace(chairWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[2]), INITIAL_ROOM_DOCUMENT)
const addedChairOneId = chairWorkspace.selectedFurnitureId
chairWorkspace = reduceFurnitureWorkspace(chairWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[2]), INITIAL_ROOM_DOCUMENT)
const addedChairTwoId = chairWorkspace.selectedFurnitureId
assert.notEqual(addedChairOneId, addedChairTwoId)
assert.equal(chairWorkspace.furnitureById[addedChairOneId].semantic.archetype, 'OFFICE_CHAIR')
assert.equal(chairWorkspace.furnitureById[addedChairOneId].modelStrategy.resolved, MODEL_STRATEGIES.LIBRARY)
assert.deepEqual(chairWorkspace.furnitureById[addedChairOneId].physical.dimensionsM, { width: 0.62, depth: 0.62, height: 0.92 })
assertFurnitureHasNoPlacement(chairWorkspace.furnitureById[addedChairOneId])
assert.ok(Object.values(chairWorkspace.placementsById).find((item) => item.furnitureId === addedChairOneId))
assert.ok(Object.values(chairWorkspace.placementsById).find((item) => item.furnitureId === addedChairTwoId))

let floorLampWorkspace = createFurnitureWorkspaceState()
floorLampWorkspace = reduceFurnitureWorkspace(floorLampWorkspace, createAddFurnitureCommand(FURNITURE_CATALOG_V0[3]), INITIAL_ROOM_DOCUMENT)
const addedFloorLampId = floorLampWorkspace.selectedFurnitureId
const addedFloorLamp = floorLampWorkspace.furnitureById[addedFloorLampId]
const addedFloorLampPlacement = Object.values(floorLampWorkspace.placementsById).find((item) => item.furnitureId === addedFloorLampId)
assert.equal(addedFloorLamp.semantic.category, 'LIGHTING')
assert.equal(addedFloorLamp.semantic.archetype, 'FLOOR_LAMP')
assert.equal(addedFloorLamp.modelStrategy.resolved, MODEL_STRATEGIES.LIBRARY)
assert.deepEqual(addedFloorLamp.physical.dimensionsM, { width: 0.6, depth: 0.6, height: 1.65 })
assertFurnitureHasNoPlacement(addedFloorLamp)
assert.equal(addedFloorLampPlacement.furnitureId, addedFloorLamp.id)
assert.notDeepEqual(FLOOR_LAMP_LIBRARY_ASSET_V0.referenceDimensionsM, addedFloorLamp.physical.dimensionsM)

assert.equal(workspace.furnitureById[DEMO_TWO_SEAT_SOFA_FURNITURE.id].semantic.archetype, 'TWO_SEAT_SOFA')
assert.deepEqual(workspace.placementsById[DEMO_TWO_SEAT_SOFA_PLACEMENT.id], DEMO_TWO_SEAT_SOFA_PLACEMENT)
const originalRoomCommandState = workspace
workspace = reduceFurnitureWorkspace(workspace, createMoveFurnitureCommand({ furnitureId: DEMO_DESK_FURNITURE.id, deltaX: 1, deltaZ: 1 }))
assert.deepEqual(workspace.placementsById, originalRoomCommandState.placementsById)

workspace = reduceFurnitureWorkspace(workspace, createSelectFurnitureCommand(DEMO_DESK_FURNITURE.id))
workspace = reduceFurnitureWorkspace(workspace, createMoveFurnitureCommand({ furnitureId: DEMO_DESK_FURNITURE.id, deltaX: 0.2, deltaZ: -0.1 }))
assert.equal(workspace.placementsById[DEMO_DESK_PLACEMENT.id].position.x, DEMO_DESK_PLACEMENT.position.x + 0.2)
assert.equal(workspace.placementsById[DEMO_DESK_PLACEMENT.id].position.z, DEMO_DESK_PLACEMENT.position.z - 0.1)
workspace = reduceFurnitureWorkspace(workspace, createRotateFurnitureYCommand({ furnitureId: DEMO_DESK_FURNITURE.id, deltaRadians: 0.25 }))
assert.equal(workspace.placementsById[DEMO_DESK_PLACEMENT.id].rotationY, DEMO_DESK_PLACEMENT.rotationY + 0.25)
assert.equal(workspace.furnitureById[DEMO_DESK_FURNITURE.id].semantic.archetype, 'DESK')
assert.deepEqual(workspace.furnitureById[DEMO_DESK_FURNITURE.id].physical.dimensionsM, DEMO_DESK_FURNITURE.physical.dimensionsM)

const beforeOrbitDocument = structuredClone(workspace.placementsById)
workspace = reduceFurnitureWorkspace(workspace, createOrbitCameraCommand({ deltaYaw: 0.1, deltaPitch: 0.2 }))
assert.deepEqual(workspace.placementsById, beforeOrbitDocument)
assert.equal(workspace.lastRoomCommand.deltaYaw, 0.1)
