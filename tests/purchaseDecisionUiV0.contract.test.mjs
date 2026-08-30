import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPurchaseDecisionInput } from '../src/decision/adapters/purchaseDecisionAdapter.js'
import { preparePurchaseDecision, runPurchaseDecision } from '../src/decision/purchase/runPurchaseDecision.js'

function wishlistFurniture(overrides = {}) {
  return {
    id: 'wishlist-chair', name: '心愿椅', semantic: { category: 'CHAIR' },
    physical: { dimensionsM: { width: 0.6, depth: 0.6, height: 1.1 } },
    ownership: { type: 'NONE' }, lifecycle: { status: 'WISHLIST' }, isFavorite: false,
    product: { price: 899 }, ...overrides,
  }
}

const decisiveNeed = { needStrength: 'HIGH', usageFrequency: 'DAILY', substituteAvailable: false }

test('Wishlist Furniture builds a valid Purchase Input from real facts', () => {
  const { input } = buildPurchaseDecisionInput({ furniture: wishlistFurniture(), userSituation: decisiveNeed })
  assert.equal(input.furniture.lifecycleStatus, 'WISHLIST')
  assert.equal(input.furniture.ownershipType, 'NON_PERSONAL')
  assert.deepEqual(input.furniture.dimensions, { width: 0.6, depth: 0.6, height: 1.1 })
})

test('USER + OWNED is not a Purchase Decision candidate', () => {
  const result = preparePurchaseDecision({ furniture: wishlistFurniture({ ownership: { type: 'USER' }, lifecycle: { status: 'OWNED' } }) })
  assert.equal(result.status, 'INELIGIBLE')
})

test('critical missing information never calls Agent', async () => {
  let calls = 0
  const furniture = wishlistFurniture({ physical: { dimensionsM: {} }, product: null })
  const result = await runPurchaseDecision({ furniture, productFacts: { returnable: false } }, { fetchImpl: async () => { calls += 1; throw new Error('must not call') } })
  assert.equal(result.status, 'MISSING_INFORMATION')
  assert.equal(result.missingInformation.length, 3)
  assert.equal(calls, 0)
})

test('hard-rule deterministic result never calls Agent', async () => {
  let calls = 0
  const result = await runPurchaseDecision({ furniture: wishlistFurniture(), overrides: { spaceContext: { physicalFit: 'IMPOSSIBLE' } } }, { fetchImpl: async () => { calls += 1 } })
  assert.equal(result.status, 'RESOLVED')
  assert.equal(result.resolverResult.decision, 'DONT_BUY')
  assert.equal(calls, 0)
})

test('soft-evidence deterministic result never calls Agent', async () => {
  let calls = 0
  const result = await runPurchaseDecision({ furniture: wishlistFurniture(), userSituation: decisiveNeed }, { fetchImpl: async () => { calls += 1 } })
  assert.equal(result.status, 'RESOLVED')
  assert.equal(result.resolverResult.decision, 'BUY')
  assert.equal(calls, 0)
})

test('NEEDS_AGENT posts exactly once to the shared endpoint', async () => {
  const requests = []
  const furniture = wishlistFurniture({ isFavorite: true })
  const fetchImpl = async (url, options) => {
    requests.push({ url, options })
    return { ok: true, async json() { return { decision: 'BUY', confidence: 'MEDIUM', primaryReasonRuleIds: ['P_SR08_FAVORITE_VALUE'], tradeoffRuleIds: ['P_SR03_ADEQUATE_SUBSTITUTE'], primaryReasons: ['用户明确收藏了这件家具。'], tradeoffs: ['现有替代品也很够用。'], missingInformation: [], nextAction: '确认退货条件后再决定。' } } }
  }
  const result = await runPurchaseDecision({ furniture, userSituation: { substituteAvailable: true, substituteAdequacy: 'HIGH' } }, { fetchImpl })
  assert.equal(result.status, 'RESOLVED')
  assert.equal(result.agentOutput.decision, 'BUY')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/api/decision/agent-reason')
})

test('Agent failure never creates a fake decision', async () => {
  const furniture = wishlistFurniture({ isFavorite: true })
  const result = await runPurchaseDecision({ furniture, userSituation: { substituteAvailable: true, substituteAdequacy: 'HIGH' } }, { fetchImpl: async () => ({ ok: false, status: 503 }) })
  assert.equal(result.status, 'AGENT_FAILED')
  assert.equal(result.agentOutput, undefined)
  assert.equal(result.resolverResult.decision, null)
})

test('Spatial Facts come from runtime analysis through the existing adapter', () => {
  const furniture = wishlistFurniture()
  const spatialAnalysis = { byFurnitureId: { [furniture.id]: { collisionDetected: true, outOfBounds: false, collidingFurnitureIds: ['desk'], collidingWallIds: [] } } }
  const result = preparePurchaseDecision({ furniture, spatialAnalysis, userSituation: decisiveNeed })
  assert.equal(result.input.spaceContext.collision, true)
  assert.deepEqual(result.diagnostics.spatial.collidingFurnitureIds, ['desk'])
})

test('Purchase result neither rewrites dimension truth nor auto-purchases the item', async () => {
  const furniture = wishlistFurniture()
  const before = structuredClone(furniture)
  const result = await runPurchaseDecision({ furniture, userSituation: decisiveNeed })
  assert.equal(result.resolverResult.decision, 'BUY')
  assert.deepEqual(result.input.furniture.dimensions, before.physical.dimensionsM)
  assert.deepEqual(furniture, before)
  assert.equal(furniture.lifecycle.status, 'WISHLIST')
  assert.equal(furniture.ownership.type, 'NONE')
})
