import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPABILITY_STATUS,
  getFurnitureCapability,
} from '../src/domain/furnitureCapabilityRegistry.js'
import { resolveFurnitureModel } from '../src/domain/furnitureModelResolver.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import {
  createCreateFurnitureCommand,
  createCreatePlacementCommand,
  createPurchaseFurnitureCommand,
  createUpdateFurnitureInfoCommand,
} from '../src/domain/interactionCommands.js'
import { createGeometryProxyFromFurniture } from '../src/domain/spatialContracts.js'
import { createFurnitureWorkspaceState, reduceFurnitureWorkspace } from '../src/state/useFurnitureWorkspace.js'

const room = { room: { id: 'integration-room' }, walls: [] }

function createWishlist(input) {
  return createFurniture({
    id: input.id,
    semantic: { archetype: input.archetype },
    physical: { dimensionsM: input.dimensionsM },
    ownership: { type: 'NONE' },
    lifecycle: { status: 'WISHLIST' },
    modelStrategy: { resolved: input.resolved },
  })
}

test('wishlist desk and office chair resolve through Registry routes', () => {
  const desk = createWishlist({ id: 'integration-desk', archetype: 'DESK', dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 }, resolved: 'PARAMETRIC' })
  const chair = createWishlist({ id: 'integration-chair', archetype: 'OFFICE_CHAIR', dimensionsM: { width: 0.62, depth: 0.62, height: 0.92 }, resolved: 'LIBRARY' })
  assert.equal(getFurnitureCapability(desk).capabilityStatus, CAPABILITY_STATUS.READY)
  assert.equal(resolveFurnitureModel(desk).strategy, 'PARAMETRIC')
  assert.equal(resolveFurnitureModel(desk).generatorKey, 'DESK')
  assert.equal(resolveFurnitureModel(chair).strategy, 'LIBRARY')
  assert.equal(resolveFurnitureModel(chair).asset.id, 'office-chair-local-v0')
  assert.deepEqual(createGeometryProxyFromFurniture(desk).dimensionsM, desk.physical.dimensionsM)
  assert.deepEqual(createGeometryProxyFromFurniture(chair).dimensionsM, chair.physical.dimensionsM)
})

test('wishlist edits and purchase preserve spatial identity and strategy', () => {
  let state = createFurnitureWorkspaceState()
  state = reduceFurnitureWorkspace(state, createCreateFurnitureCommand({
    id: 'integration-purchase-desk',
    archetype: 'DESK',
    dimensionsCm: { width: 120, depth: 60, height: 75 },
    ownershipKey: 'WISHLIST',
  }))
  state = reduceFurnitureWorkspace(state, createCreatePlacementCommand('integration-purchase-desk'), room)
  const originalPlacement = state.placementsById['placement-integration-purchase-desk']
  state = reduceFurnitureWorkspace(state, createUpdateFurnitureInfoCommand({
    furnitureId: 'integration-purchase-desk',
    patch: { dimensionsM: { width: 1.4, depth: 0.7, height: 0.75 } },
  }))
  const edited = state.furnitureById['integration-purchase-desk']
  assert.deepEqual(edited.physical.dimensionsM, { width: 1.4, depth: 0.7, height: 0.75 })
  assert.deepEqual(createGeometryProxyFromFurniture(edited).dimensionsM, edited.physical.dimensionsM)
  assert.deepEqual(state.placementsById['placement-integration-purchase-desk'], originalPlacement)
  const strategyBeforePurchase = edited.modelStrategy.resolved
  state = reduceFurnitureWorkspace(state, createPurchaseFurnitureCommand('integration-purchase-desk'))
  const purchased = state.furnitureById['integration-purchase-desk']
  assert.equal(purchased.ownership.type, 'USER')
  assert.equal(purchased.lifecycle.status, 'OWNED')
  assert.equal(purchased.id, edited.id)
  assert.equal(purchased.modelStrategy.resolved, strategyBeforePurchase)
  assert.deepEqual(state.placementsById['placement-integration-purchase-desk'], originalPlacement)
})

test('planned and generated routes remain honest in the integrated chain', () => {
  const bed = createFurniture({ semantic: { archetype: 'DOUBLE_BED' }, physical: { dimensionsM: { width: 1.6, depth: 2, height: 0.45 } } })
  const bedCapability = getFurnitureCapability(bed)
  const bedResolution = resolveFurnitureModel(bed)
  assert.equal(bedCapability.capabilityStatus, CAPABILITY_STATUS.PLANNED)
  assert.equal(bedResolution.visualModelAvailable, false)
  assert.equal(bedResolution.fallback, 'PROXY_ONLY')

  const special = createFurniture({ semantic: { archetype: 'SPECIAL_UNKNOWN' }, physical: { dimensionsM: { width: 1, depth: 1, height: 1 } } })
  const specialResolution = resolveFurnitureModel(special)
  assert.equal(specialResolution.strategy, 'GENERATED')
  assert.equal(specialResolution.status, 'PENDING')
  assert.equal(special.representation.status, 'PENDING_GENERATION')
})
