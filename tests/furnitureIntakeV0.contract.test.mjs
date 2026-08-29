import test from 'node:test'
import assert from 'node:assert/strict'
import { centimetersToMeters, createFurnitureFromIntake } from '../src/domain/furnitureIntake.js'
import { MODEL_STRATEGIES, routeFurnitureModelStrategy } from '../src/domain/furnitureRouter.js'
import { createPlacement } from '../src/domain/spatialContracts.js'

test('cm to meter conversion is explicit and rejects invalid values', () => {
  assert.equal(centimetersToMeters(120), 1.2)
  assert.equal(centimetersToMeters(0), null)
  assert.equal(centimetersToMeters('nope'), null)
})

test('intake dimensions come from user confirmation, never photo recognition', () => {
  const furniture = createFurnitureFromIntake({ archetype: 'DESK', dimensionsCm: { width: 120, depth: 60, height: 75 }, photo: { name: 'chair.jpg' } })
  assert.deepEqual(furniture.physical.dimensionsM, { width: 1.2, depth: 0.6, height: 0.75 })
  assert.equal(furniture.intakeMetadata.fileName, 'chair.jpg')
})

test('ownership and lifecycle mappings use formal semantics', () => {
  assert.equal(createFurnitureFromIntake({ archetype: 'DESK', dimensionsCm: { width: 1, depth: 1, height: 1 }, ownershipKey: 'USER' }).lifecycle.status, 'OWNED')
  assert.equal(createFurnitureFromIntake({ archetype: 'DESK', dimensionsCm: { width: 1, depth: 1, height: 1 }, ownershipKey: 'LANDLORD' }).ownership.type, 'LANDLORD')
  const wish = createFurnitureFromIntake({ archetype: 'DESK', dimensionsCm: { width: 1, depth: 1, height: 1 }, ownershipKey: 'WISHLIST' })
  assert.deepEqual({ type: wish.ownership.type, status: wish.lifecycle.status }, { type: 'NONE', status: 'WISHLIST' })
})

test('intake reuses router strategies and keeps placement separate', () => {
  assert.equal(routeFurnitureModelStrategy({ archetype: 'DESK' }), MODEL_STRATEGIES.PARAMETRIC)
  assert.equal(routeFurnitureModelStrategy({ archetype: 'OFFICE_CHAIR' }), MODEL_STRATEGIES.LIBRARY)
  const generated = createFurnitureFromIntake({ archetype: 'OTHER', dimensionsCm: { width: 1, depth: 1, height: 1 } })
  assert.equal(generated.modelStrategy.resolved, MODEL_STRATEGIES.GENERATED)
  assert.equal(generated.representation.status, 'PENDING_GENERATION')
  assert.equal(Object.hasOwn(generated, 'position'), false)
  const placement = createPlacement({ furnitureId: generated.id, roomId: 'room-01' })
  assert.equal(placement.furnitureId, generated.id)
})
