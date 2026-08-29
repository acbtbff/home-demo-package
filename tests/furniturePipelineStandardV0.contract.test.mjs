import assert from 'node:assert/strict'
import {
  assertFurnitureHasNoPlacement,
  assertValidOwnershipLifecycle,
  createFurniture,
  isValidOwnershipLifecycle,
  LIFECYCLE_STATUSES,
  OWNERSHIP_TYPES,
} from '../src/domain/furnitureSchema.js'
import {
  COORDINATE_CONTRACT,
  ROOM_COORDINATE_SYSTEM,
  ROOM_UNITS,
  WORLD_SCALE_CONTRACT,
} from '../src/domain/roomSchema.js'
import { createGeometryProxyFromFurniture, createPlacement } from '../src/domain/spatialContracts.js'
import {
  calculateLibraryVisualCalibration,
  LIBRARY_ASPECT_RATIO_POLICY,
  LADDER_SPECIAL_GENERATED_ASSET_PENDING_V0,
  ASSET_STATUSES,
} from '../src/domain/furnitureAssets.js'
import {
  GENERATED_ROUTE_STATUS,
  MODEL_STRATEGIES,
  MODEL_STRATEGY_VALIDATION_STATUS,
  routeFurnitureModelStrategy,
} from '../src/domain/furnitureRouter.js'
import { createParametricDeskSpec } from '../src/domain/parametricDesk.js'

assert.equal(WORLD_SCALE_CONTRACT.metersPerWorldUnit, 1)
assert.equal(WORLD_SCALE_CONTRACT.units, 'meters')
assert.equal(ROOM_UNITS, 'meters')
assert.deepEqual(ROOM_COORDINATE_SYSTEM.floorAxes, ['x', 'z'])
assert.equal(COORDINATE_CONTRACT.upAxis, 'y')
assert.equal(COORDINATE_CONTRACT.furnitureRotation, 'rotationY')
assert.equal(COORDINATE_CONTRACT.furniturePivot, 'bottom-center')

const desk = createFurniture({
  id: 'contract-desk',
  semantic: { archetype: 'DESK' },
  physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } },
  ownership: { type: 'USER' },
  lifecycle: { status: 'OWNED' },
  position: { x: 10, y: 0, z: 10 },
  rotationY: 2,
  roomId: 'room-should-not-be-copied',
})
assert.deepEqual(desk.physical.dimensionsM, { width: 1.2, depth: 0.6, height: 0.75 })
assert.deepEqual(desk.ownership, { type: OWNERSHIP_TYPES.USER })
assert.equal(desk.lifecycle.status, LIFECYCLE_STATUSES.OWNED)
assertFurnitureHasNoPlacement(desk)

const proxy = createGeometryProxyFromFurniture(desk)
assert.deepEqual(proxy.dimensionsM, desk.physical.dimensionsM)
assert.equal(proxy.pivot, 'bottom-center')
assert.equal(proxy.shape, 'BOX')

const beforeVisualCalibration = structuredClone(desk.physical.dimensionsM)
const calibration = calculateLibraryVisualCalibration({
  assetDimensionsM: { width: 2, depth: 1, height: 1 },
  targetDimensionsM: desk.physical.dimensionsM,
})
assert.deepEqual(calibration.scale, [0.6, 0.75, 0.6])
assert.deepEqual(desk.physical.dimensionsM, beforeVisualCalibration)

const severeCalibration = calculateLibraryVisualCalibration({
  assetDimensionsM: { width: 4, depth: 0.5, height: 0.5 },
  targetDimensionsM: { width: 1, depth: 1, height: 1 },
})
assert.equal(severeCalibration.severeAspectMismatch, true)
assert.equal(LIBRARY_ASPECT_RATIO_POLICY.severeAction, 'WARN_AND_REVIEW_ASSET')

const updatedDeskSpec = createParametricDeskSpec({ width: 1.8, depth: 0.7, height: 0.9 })
assert.deepEqual(updatedDeskSpec.dimensionsM, { width: 1.8, depth: 0.7, height: 0.9 })
assert.equal(updatedDeskSpec.parts.find((part) => part.id === 'tabletop').size.width, 1.8)

const placement = createPlacement({ furnitureId: desk.id, roomId: 'room-1', position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 })
assert.equal(placement.position.x, 1)
assert.equal(placement.position.z, 2)
assert.equal(placement.rotationY, 0.5)
assert.equal(desk.position, undefined)

for (const [ownershipType, lifecycleStatus] of [
  [OWNERSHIP_TYPES.USER, LIFECYCLE_STATUSES.OWNED],
  [OWNERSHIP_TYPES.LANDLORD, LIFECYCLE_STATUSES.OWNED],
  [OWNERSHIP_TYPES.NONE, LIFECYCLE_STATUSES.WISHLIST],
]) {
  assert.equal(isValidOwnershipLifecycle({ ownershipType, lifecycleStatus }), true)
  assertValidOwnershipLifecycle(createFurniture({ ownership: { type: ownershipType }, lifecycle: { status: lifecycleStatus } }))
}
assert.equal(isValidOwnershipLifecycle({ ownershipType: OWNERSHIP_TYPES.USER, lifecycleStatus: LIFECYCLE_STATUSES.WISHLIST }), false)

assert.equal(routeFurnitureModelStrategy('DESK'), MODEL_STRATEGIES.PARAMETRIC)
assert.equal(routeFurnitureModelStrategy('OFFICE_CHAIR'), MODEL_STRATEGIES.LIBRARY)
assert.equal(routeFurnitureModelStrategy('LADDER_SPECIAL'), MODEL_STRATEGIES.GENERATED)
assert.equal(MODEL_STRATEGY_VALIDATION_STATUS.PARAMETRIC, 'VALIDATED')
assert.equal(MODEL_STRATEGY_VALIDATION_STATUS.LIBRARY, 'VALIDATED')
assert.equal(MODEL_STRATEGY_VALIDATION_STATUS.GENERATED, 'VALIDATION_PENDING')
assert.deepEqual(GENERATED_ROUTE_STATUS, { interface: 'INTERFACE_RESERVED', validation: 'VALIDATION_PENDING' })
assert.equal(LADDER_SPECIAL_GENERATED_ASSET_PENDING_V0.status, ASSET_STATUSES.UNAVAILABLE)

console.log('FURNITURE-PIPELINE-STANDARDIZATION-V0 contract tests passed')
