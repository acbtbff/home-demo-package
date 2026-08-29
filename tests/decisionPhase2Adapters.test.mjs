import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DESK_FURNITURE, DEMO_DESK_PLACEMENT } from '../src/data/demoFurniture.js'
import { INITIAL_ROOM_DOCUMENT } from '../src/data/initialRoomDocument.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { analyzeSpatialState } from '../src/domain/spatialAnalyzer.js'
import { adaptFurnitureToDecisionFurniture } from '../src/decision/adapters/furnitureDecisionAdapter.js'
import { buildMoveDecisionInput } from '../src/decision/adapters/moveDecisionAdapter.js'
import { buildPurchaseDecisionInput } from '../src/decision/adapters/purchaseDecisionAdapter.js'
import { adaptUserProfile } from '../src/decision/adapters/userDecisionAdapter.js'

const ownedUserFurniture = createFurniture({
  id: 'owned-user-desk', name: 'Owned desk', semantic: { category: 'TABLE', archetype: 'DESK' },
  physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } },
  ownership: { type: 'USER' }, lifecycle: { status: 'OWNED' }, isFavorite: true,
})

test('Furniture adapter maps the real nested Furniture model', () => {
  const result = adaptFurnitureToDecisionFurniture(ownedUserFurniture)
  assert.deepEqual(result.dimensions, { width: 1.2, depth: 0.6, height: 0.75 })
  assert.equal(result.category, 'TABLE')
  assert.equal(result.lifecycleStatus, 'OWNED')
  assert.equal(result.ownershipType, 'PERSONAL')
  assert.equal(result.isFavorite, true)
  assert.equal(result.sentimentalAttachment, null)
})

test('ownership and lifecycle aliases normalize only in Decision layer', () => {
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture({ ownership: { type: 'LANDLORD' }, lifecycle: { status: 'OWNED' } })).ownershipType, 'NON_PERSONAL')
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture({ ownership: { type: 'NONE' }, lifecycle: { status: 'OWNED' } })).ownershipType, 'NON_PERSONAL')
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture({ lifecycle: { status: 'DISCARDED' } })).lifecycleStatus, 'DISPOSED')
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture({ lifecycle: { status: 'GIVEN_AWAY' } })).lifecycleStatus, 'DISPOSED')
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture()).ownershipType, 'UNKNOWN')
  assert.equal(adaptFurnitureToDecisionFurniture(createFurniture()).lifecycleStatus, 'UNKNOWN')
})

test('Move adapter gates before constructing input', () => {
  const eligible = buildMoveDecisionInput({ furniture: ownedUserFurniture })
  assert.equal(eligible.eligible, true)
  assert.equal(eligible.input.furniture.ownershipType, 'PERSONAL')
  assert.equal(eligible.input.furniture.lifecycleStatus, 'OWNED')
  for (const type of ['LANDLORD', null]) {
    const result = buildMoveDecisionInput({ furniture: createFurniture({ ownership: { type }, lifecycle: { status: 'OWNED' } }) })
    assert.equal(result.eligible, false)
    assert.equal(result.input, null)
  }
  const wishlist = buildMoveDecisionInput({ furniture: createFurniture({ ownership: { type: 'USER' }, lifecycle: { status: 'WISHLIST' } }) })
  assert.equal(wishlist.eligible, false)
})

test('Purchase adapter preserves unknown facts and reports duplicate product conflicts', () => {
  const spatialAnalysis = analyzeSpatialState({
    roomDocument: INITIAL_ROOM_DOCUMENT,
    furnitureItems: [DEMO_DESK_FURNITURE],
    placementsById: { [DEMO_DESK_PLACEMENT.id]: DEMO_DESK_PLACEMENT },
  })
  const result = buildPurchaseDecisionInput({
    furniture: DEMO_DESK_FURNITURE,
    roomDocument: INITIAL_ROOM_DOCUMENT,
    placement: DEMO_DESK_PLACEMENT,
    spatialAnalysis,
    overrides: { furniture: { returnable: true }, reversibilityContext: { returnable: false } },
  })
  assert.equal(result.input.furniture.id, DEMO_DESK_FURNITURE.id)
  assert.deepEqual(result.input.furniture.dimensions, DEMO_DESK_FURNITURE.physical.dimensionsM)
  assert.equal(result.input.furniture.priceCny, null)
  assert.equal(result.input.spaceContext.physicalFit, null)
  assert.equal(result.input.spaceContext.collision, false)
  assert.equal(result.diagnostics.productFactConflicts.length, 1)
})

test('Current placement diagnostics do not become global physicalFit', () => {
  const result = buildPurchaseDecisionInput({
    furniture: DEMO_DESK_FURNITURE,
    spatialAnalysis: { byFurnitureId: { [DEMO_DESK_FURNITURE.id]: { outOfBounds: true, collisionDetected: true, collidingFurnitureIds: [], collidingWallIds: [] } } },
  })
  assert.equal(result.input.spaceContext.physicalFit, null)
  assert.equal(result.input.spaceContext.collision, true)
  assert.equal(result.diagnostics.spatial.outOfBounds, true)
})

test('User profile defaults to MEDIUM and accepts only partial legal overrides', () => {
  const profile = adaptUserProfile({ budgetCaution: 'HIGH', unknownKey: 'LOW', spaceSensitivity: 'INVALID' })
  assert.equal(profile.budgetCaution, 'HIGH')
  assert.equal(profile.spaceSensitivity, 'MEDIUM')
  assert.equal(profile.unknownKey, undefined)
  assert.equal(Object.values(profile).filter((value) => value === 'MEDIUM').length, 8)
})
