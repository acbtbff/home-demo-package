import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPABILITY_STATUS,
  FURNITURE_CAPABILITY_REGISTRY_V0,
  getFurnitureCapabilityReport,
  getFurnitureCapability,
} from '../src/domain/furnitureCapabilityRegistry.js'
import { resolveFurnitureModel } from '../src/domain/furnitureModelResolver.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { routeFurnitureModelStrategy, MODEL_STRATEGIES } from '../src/domain/furnitureRouter.js'
import {
  createCreateFurnitureCommand,
  createCreatePlacementCommand,
  createPurchaseFurnitureCommand,
} from '../src/domain/interactionCommands.js'
import { createGeometryProxyFromFurniture } from '../src/domain/spatialContracts.js'
import { INITIAL_ROOM_DOCUMENT } from '../src/data/initialRoomDocument.js'
import { createFurnitureWorkspaceState, reduceFurnitureWorkspace } from '../src/state/useFurnitureWorkspace.js'

const COVERAGE = [
  { archetype: 'NIGHTSTAND', dimensions: { width: 0.45, depth: 0.4, height: 0.55 } },
  { archetype: 'DOUBLE_BED', dimensions: { width: 1.5, depth: 2, height: 0.9 } },
  { archetype: 'CABINET', dimensions: { width: 0.8, depth: 0.4, height: 1 } },
  { archetype: 'COFFEE_TABLE', dimensions: { width: 1, depth: 0.5, height: 0.42 } },
]

test('four demo coverage archetypes are READY PARAMETRIC capabilities', () => {
  const report = getFurnitureCapabilityReport()
  assert.equal(report.counts.READY, 8)
  for (const { archetype } of COVERAGE) {
    const capability = getFurnitureCapability(archetype)
    assert.equal(capability.capabilityStatus, CAPABILITY_STATUS.READY)
    assert.equal(capability.preferredStrategy, MODEL_STRATEGIES.PARAMETRIC)
    assert.equal(capability.generatorKey, archetype)
    assert.equal(typeof capability.handler, 'function')
    assert.equal(routeFurnitureModelStrategy(archetype), MODEL_STRATEGIES.PARAMETRIC)
    assert.equal(FURNITURE_CAPABILITY_REGISTRY_V0[archetype], capability)
  }
})

test('each generator consumes dimensions and produces size-dependent geometry', () => {
  for (const { archetype, dimensions } of COVERAGE) {
    const capability = getFurnitureCapability(archetype)
    const first = capability.handler(dimensions)
    const secondDimensions = { width: dimensions.width * 1.2, depth: dimensions.depth * 1.15, height: dimensions.height * 1.1 }
    const second = capability.handler(secondDimensions)
    assert.deepEqual(first.dimensionsM, dimensions)
    assert.deepEqual(second.dimensionsM, secondDimensions)
    assert.notDeepEqual(first.parts, second.parts)

    const furniture = createFurniture({ semantic: { archetype }, physical: { dimensionsM: dimensions } })
    const before = structuredClone(furniture.physical.dimensionsM)
    const resolution = resolveFurnitureModel(furniture)
    assert.equal(resolution.status, 'AVAILABLE')
    assert.equal(resolution.strategy, MODEL_STRATEGIES.PARAMETRIC)
    assert.equal(resolution.generatorKey, archetype)
    assert.deepEqual(furniture.physical.dimensionsM, before)
    assert.deepEqual(createGeometryProxyFromFurniture(furniture).dimensionsM, before)
  }
})

test('new parametric archetypes support wishlist presentation and purchase identity', () => {
  const room = INITIAL_ROOM_DOCUMENT
  for (const { archetype, dimensions } of COVERAGE) {
    const id = `wishlist-${archetype.toLowerCase()}`
    const input = {
      id,
      archetype,
      dimensionsCm: {
        width: dimensions.width * 100,
        depth: dimensions.depth * 100,
        height: dimensions.height * 100,
      },
      ownershipKey: 'WISHLIST',
    }
    let state = reduceFurnitureWorkspace(createFurnitureWorkspaceState(), createCreateFurnitureCommand(input))
    const wishlist = state.furnitureById[id]
    assert.equal(wishlist.ownership.type, 'NONE')
    assert.equal(wishlist.lifecycle.status, 'WISHLIST')
    assert.equal(wishlist.modelStrategy.resolved, MODEL_STRATEGIES.PARAMETRIC)
    assert.equal(resolveFurnitureModel(wishlist).status, 'AVAILABLE')
    state = reduceFurnitureWorkspace(state, createCreatePlacementCommand(id), room)
    const placementBefore = structuredClone(Object.values(state.placementsById).find((item) => item.furnitureId === id))
    assert.ok(placementBefore)
    state = reduceFurnitureWorkspace(state, createPurchaseFurnitureCommand(id))
    const purchased = state.furnitureById[id]
    assert.equal(purchased.ownership.type, 'USER')
    assert.equal(purchased.lifecycle.status, 'OWNED')
    assert.equal(purchased.id, id)
    assert.equal(purchased.modelStrategy.resolved, MODEL_STRATEGIES.PARAMETRIC)
    assert.deepEqual(Object.values(state.placementsById).find((item) => item.furnitureId === id), placementBefore)
    assert.deepEqual(createGeometryProxyFromFurniture(purchased).dimensionsM, dimensions)
  }
})

test('existing generated and planned fallback contracts remain unchanged', () => {
  const planned = createFurniture({ semantic: { archetype: 'BOOKSHELF' }, physical: { dimensionsM: { width: 0.8, depth: 0.3, height: 1.8 } } })
  assert.equal(getFurnitureCapability('BOOKSHELF').capabilityStatus, CAPABILITY_STATUS.PLANNED)
  assert.equal(resolveFurnitureModel(planned).visualModelAvailable, false)

  const generated = createFurniture({ semantic: { archetype: 'OTHER' }, physical: { dimensionsM: { width: 1, depth: 1, height: 1 } } })
  assert.equal(resolveFurnitureModel(generated).strategy, MODEL_STRATEGIES.GENERATED)
  assert.equal(resolveFurnitureModel(generated).status, 'PENDING')
  assert.equal(generated.representation.status, 'PENDING_GENERATION')
})
