import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MEASUREMENT_SOURCES,
  PACKING_ORIENTATIONS,
  PHYSICAL_STATE_KINDS,
  VERIFICATION_STATUSES,
  createFurnitureAsset,
  createFurnitureAssetFromFurniture,
  evaluatePhysicalStateReadiness,
  getFurniturePhysicalState,
} from '../src/domain/furnitureAsset.js'

test('furniture asset keeps assembled and folded facts as separate physical states', () => {
  const asset = createFurnitureAsset({
    id: 'folding-table-1',
    name: 'Folding table',
    semantic: { archetype: 'DINING_TABLE' },
    physicalStates: [
      {
        id: 'assembled',
        kind: PHYSICAL_STATE_KINDS.ASSEMBLED,
        dimensionsM: { width: 1.2, depth: 0.7, height: 0.75 },
        weightKg: 18,
        handling: { allowedOrientations: [PACKING_ORIENTATIONS.UPRIGHT] },
      },
      {
        id: 'folded',
        kind: PHYSICAL_STATE_KINDS.FOLDED,
        dimensionsM: { width: 1.2, depth: 0.12, height: 0.75 },
        weightKg: 18,
        handling: { allowedOrientations: [PACKING_ORIENTATIONS.UPRIGHT, PACKING_ORIENTATIONS.SIDE_LEFT] },
      },
    ],
  })

  assert.equal(asset.defaultPhysicalStateId, 'assembled')
  assert.equal(asset.capabilities.foldable, true)
  assert.equal(getFurniturePhysicalState(asset, 'assembled').volumeM3, 0.63)
  assert.equal(getFurniturePhysicalState(asset, 'folded').volumeM3, 0.108)
})

test('packing readiness distinguishes missing facts from unverified facts', () => {
  const asset = createFurnitureAsset({
    id: 'chair-1',
    semantic: { archetype: 'OFFICE_CHAIR' },
    physicalStates: [{
      id: 'assembled',
      dimensionsM: { width: 0.62, depth: 0.62, height: 0.92 },
      provenance: {
        dimensions: {
          source: MEASUREMENT_SOURCES.AI_ESTIMATED,
          confidence: 0.78,
          verificationStatus: VERIFICATION_STATUSES.UNVERIFIED,
        },
      },
    }],
  })
  const readiness = evaluatePhysicalStateReadiness(getFurniturePhysicalState(asset))

  assert.equal(readiness.readyForSpatialPlanning, true)
  assert.equal(readiness.readyForPayloadPlanning, false)
  assert.equal(readiness.readyForPackingOptimization, false)
  assert.deepEqual(readiness.missingFields, ['weightKg', 'handling.allowedOrientations'])
  assert.ok(readiness.unverifiedFacts.includes('dimensions'))
})

test('existing Furniture migrates without inventing missing logistics facts', () => {
  const asset = createFurnitureAssetFromFurniture({
    id: 'desk-1',
    name: 'Desk',
    semantic: { category: 'TABLE', archetype: 'DESK' },
    physical: {
      dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 },
      weightKg: null,
      foldable: null,
      disassemblable: null,
      modular: null,
    },
    product: { url: 'https://example.invalid/desk' },
  })

  const state = getFurniturePhysicalState(asset)
  assert.deepEqual(state.dimensionsM, { width: 1.2, depth: 0.6, height: 0.75 })
  assert.equal(state.weightKg, null)
  assert.equal(state.provenance.dimensions.source, MEASUREMENT_SOURCES.IMPORTED)
  assert.equal(state.provenance.dimensions.verificationStatus, VERIFICATION_STATUSES.UNVERIFIED)
})
