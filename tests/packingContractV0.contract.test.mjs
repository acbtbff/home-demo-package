import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PACKING_ORIENTATIONS,
  PHYSICAL_STATE_KINDS,
  createFurnitureAsset,
} from '../src/domain/furnitureAsset.js'
import {
  PACKING_PLAN_STATUSES,
  createPackingItemFromFurnitureAsset,
  createPackingPlan,
  createPackingRequest,
  evaluatePackingRequestReadiness,
} from '../src/domain/packingContracts.js'

const vehicle = {
  id: 'van-medium',
  interiorDimensionsM: { width: 1.75, depth: 3.1, height: 1.8 },
  doorDimensionsM: { width: 1.45, height: 1.65 },
  maxPayloadKg: 900,
}

test('packing item explicitly selects one furniture physical state', () => {
  const asset = createFurnitureAsset({
    id: 'table-1',
    semantic: { archetype: 'DINING_TABLE' },
    physicalStates: [
      { id: 'assembled', kind: PHYSICAL_STATE_KINDS.ASSEMBLED, dimensionsM: { width: 1.4, depth: 0.8, height: 0.75 }, weightKg: 24 },
      { id: 'folded', kind: PHYSICAL_STATE_KINDS.FOLDED, dimensionsM: { width: 1.4, depth: 0.15, height: 0.75 }, weightKg: 24, handling: { allowedOrientations: [PACKING_ORIENTATIONS.SIDE_LEFT] } },
    ],
  })

  const item = createPackingItemFromFurnitureAsset(asset, 'folded')
  assert.equal(item.physicalStateId, 'folded')
  assert.deepEqual(item.dimensionsM, { width: 1.4, depth: 0.15, height: 0.75 })
  assert.deepEqual(item.allowedOrientations, [PACKING_ORIENTATIONS.SIDE_LEFT])
})

test('request readiness blocks missing facts and payload violations', () => {
  const request = createPackingRequest({
    id: 'move-1',
    vehicle: { ...vehicle, maxPayloadKg: 30 },
    items: [
      { id: 'cabinet', dimensionsM: { width: 1, depth: 0.5, height: 1.6 }, weightKg: 42 },
      { id: 'unknown-chair', dimensionsM: { width: 0.6, depth: 0.6, height: 0.9 }, weightKg: null },
    ],
  })
  const readiness = evaluatePackingRequestReadiness(request)

  assert.equal(readiness.ready, false)
  assert.ok(readiness.issues.includes('ITEM_1_WEIGHTKG'))
  assert.ok(readiness.issues.includes('PAYLOAD_EXCEEDED'))
})

test('packing plan is an output contract and does not pretend to solve packing', () => {
  const plan = createPackingPlan({
    requestId: 'move-1',
    status: PACKING_PLAN_STATUSES.FEASIBLE,
    placements: [{ itemId: 'table-1:folded', position: { x: 0, y: 0, z: 0 } }],
    metrics: { volumeUtilization: 0.42, totalWeightKg: 24, vehicleCount: 1 },
    explanations: ['Folded state selected before packing.'],
  })

  assert.equal(plan.status, PACKING_PLAN_STATUSES.FEASIBLE)
  assert.equal(plan.placements.length, 1)
  assert.equal(plan.metrics.volumeUtilization, 0.42)
})
