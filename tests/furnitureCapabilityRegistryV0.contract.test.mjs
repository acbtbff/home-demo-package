import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPABILITY_STATUS,
  FURNITURE_CAPABILITY_REGISTRY_V0,
  LIBRARY_ASSET_POOL_REGISTRY_V0,
  PARAMETRIC_GENERATOR_REGISTRY_V0,
  getFurnitureCapability,
  getFurnitureCapabilityReport,
} from '../src/domain/furnitureCapabilityRegistry.js'
import { MODEL_STRATEGIES, routeFurnitureModelStrategy } from '../src/domain/furnitureRouter.js'
import { resolveFurnitureModel } from '../src/domain/furnitureModelResolver.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { createGeometryProxyFromFurniture } from '../src/domain/spatialContracts.js'

test('registry has unique, complete capability entries', () => {
  const entries = Object.values(FURNITURE_CAPABILITY_REGISTRY_V0)
  assert.equal(new Set(entries.map((entry) => entry.archetype)).size, entries.length)
  for (const entry of entries) {
    assert.ok(entry.category)
    assert.ok(entry.archetype)
    assert.ok(Object.values(MODEL_STRATEGIES).includes(entry.preferredStrategy))
    assert.ok(Object.values(CAPABILITY_STATUS).includes(entry.capabilityStatus))
  }
})

test('ready capabilities have real handlers or ready assets', () => {
  for (const entry of Object.values(FURNITURE_CAPABILITY_REGISTRY_V0)) {
    if (entry.capabilityStatus !== CAPABILITY_STATUS.READY) continue
    if (entry.preferredStrategy === MODEL_STRATEGIES.PARAMETRIC) assert.equal(typeof entry.handler, 'function')
    if (entry.preferredStrategy === MODEL_STRATEGIES.LIBRARY) assert.ok(entry.assetPool.some((asset) => asset.status === 'READY' && asset.modelUrl))
  }
  assert.equal(getFurnitureCapability('DESK').generatorKey, 'DESK')
  assert.equal(getFurnitureCapability('OFFICE_CHAIR').assetPool, LIBRARY_ASSET_POOL_REGISTRY_V0.OFFICE_CHAIR)
  assert.equal(PARAMETRIC_GENERATOR_REGISTRY_V0.DESK.status, CAPABILITY_STATUS.READY)
})

test('planned and fallback-only capabilities are honest', () => {
  assert.equal(getFurnitureCapability('DOUBLE_BED').capabilityStatus, CAPABILITY_STATUS.PLANNED)
  assert.equal(getFurnitureCapability('DOUBLE_BED').handler, null)
  assert.equal(getFurnitureCapability('CABINET').capabilityStatus, CAPABILITY_STATUS.PLANNED)
  assert.equal(getFurnitureCapability('OTHER').capabilityStatus, CAPABILITY_STATUS.FALLBACK_ONLY)
  assert.equal(routeFurnitureModelStrategy('unknown long tail'), MODEL_STRATEGIES.GENERATED)
})

test('router and resolver are separated and preserve physical facts', () => {
  const furniture = createFurniture({
    id: 'registry-desk',
    semantic: { archetype: 'DESK' },
    physical: { dimensionsM: { width: 1.4, depth: 0.7, height: 0.8 } },
  })
  const before = structuredClone(furniture.physical.dimensionsM)
  const resolution = resolveFurnitureModel(furniture)
  assert.equal(resolution.strategy, MODEL_STRATEGIES.PARAMETRIC)
  assert.equal(resolution.status, 'AVAILABLE')
  assert.equal(resolution.generatorKey, 'DESK')
  assert.deepEqual(furniture.physical.dimensionsM, before)
  assert.deepEqual(createGeometryProxyFromFurniture(furniture).dimensionsM, before)

  const bed = createFurniture({ semantic: { archetype: 'DOUBLE_BED' }, physical: { dimensionsM: { width: 1.6, depth: 2, height: 0.45 } } })
  const bedResolution = resolveFurnitureModel(bed)
  assert.equal(bedResolution.strategy, MODEL_STRATEGIES.PARAMETRIC)
  assert.equal(bedResolution.status, 'PENDING')
  assert.equal(bedResolution.visualModelAvailable, false)
  assert.equal(bedResolution.fallback, 'PROXY_ONLY')
})

test('coverage report exposes status counts for developers', () => {
  const report = getFurnitureCapabilityReport()
  assert.equal(report.total, Object.keys(FURNITURE_CAPABILITY_REGISTRY_V0).length)
  assert.equal(report.counts.READY, 4)
  assert.ok(report.counts.PLANNED > 0)
  assert.ok(report.counts.FALLBACK_ONLY >= 2)
})
