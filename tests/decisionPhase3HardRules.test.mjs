import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePurchaseHardRules } from '../src/decision/purchase/purchaseHardRules.js'
import { evaluateMoveHardRules } from '../src/decision/move/moveHardRules.js'
import { createPurchaseDecisionInput } from '../src/decision/purchase/purchaseInputSchema.js'
import { createMoveDecisionInput } from '../src/decision/move/moveInputSchema.js'

const purchase = (overrides = {}) => createPurchaseDecisionInput({ furniture: { dimensions: { width: 1, depth: 1, height: 1 } }, ...overrides })
const move = (overrides = {}) => createMoveDecisionInput({ furniture: { dimensions: { width: 1, depth: 1, height: 1 }, lifecycleStatus: 'OWNED', ownershipType: 'PERSONAL' }, ...overrides })

test('Purchase explicit physical impossibility stops as DONT_BUY', () => {
  const result = evaluatePurchaseHardRules(purchase({ spaceContext: { physicalFit: 'IMPOSSIBLE' } }))
  assert.equal(result.outcome, 'DONT_BUY')
  assert.equal(result.status, 'STOP')
  assert.equal(result.triggeredRules[0].id, 'P_HR01_PHYSICAL_FIT_IMPOSSIBLE')
})

test('Purchase current collision/out-of-bounds do not become global impossibility', () => {
  const result = evaluatePurchaseHardRules(purchase({ spaceContext: { collision: true }, diagnostics: { outOfBounds: true } }))
  assert.equal(result.outcome, 'CONTINUE')
})

test('Purchase installation and severe obstruction rules are deterministic', () => {
  assert.equal(evaluatePurchaseHardRules(purchase({ furniture: { installationRequired: true }, spaceContext: { installationFeasibility: false } })).outcome, 'DONT_BUY')
  assert.equal(evaluatePurchaseHardRules(purchase({ spaceContext: { installationFeasibility: null } })).outcome, 'CONTINUE')
  assert.equal(evaluatePurchaseHardRules(purchase({ spaceContext: { doorObstruction: true } })).outcome, 'DONT_BUY')
})

test('Purchase critical missing requires missing dimensions, no fit, and non-returnability', () => {
  const missing = evaluatePurchaseHardRules(purchase({ furniture: { dimensions: { width: null }, returnable: false } }))
  assert.equal(missing.outcome, 'UNKNOWN')
  assert.ok(missing.missingInformation.some(({ field }) => field === 'furniture.dimensions.width'))
  assert.equal(evaluatePurchaseHardRules(purchase({ furniture: { dimensions: { width: null } } })).outcome, 'CONTINUE')
  assert.equal(evaluatePurchaseHardRules(purchase({ furniture: { dimensions: { width: null }, returnable: false }, spaceContext: { physicalFit: true } })).outcome, 'CONTINUE')
  assert.equal(evaluatePurchaseHardRules(purchase({ economicsContext: { expectedResaleValueCny: null } })).outcome, 'CONTINUE')
})

test('Move physical fit and obstruction exclude TAKE only', () => {
  const impossible = evaluateMoveHardRules(move({ newHomeContext: { physicalFit: 'IMPOSSIBLE' } }))
  assert.equal(impossible.outcome, 'EXCLUDE_TAKE')
  assert.equal(impossible.takeAllowed, false)
  assert.equal(evaluateMoveHardRules(move({ newHomeContext: { collision: true } })).outcome, 'CONTINUE')
  assert.equal(evaluateMoveHardRules(move({ newHomeContext: { doorObstruction: true } })).outcome, 'EXCLUDE_TAKE')
})

test('Move safety/core failures exclude TAKE, but poor condition alone does not', () => {
  assert.equal(evaluateMoveHardRules(move({ furniture: { safetyRisk: 'HIGH' } })).outcome, 'EXCLUDE_TAKE')
  assert.equal(evaluateMoveHardRules(move({ furniture: { coreFunctionStatus: 'FAILED' } })).outcome, 'EXCLUDE_TAKE')
  assert.equal(evaluateMoveHardRules(move({ furniture: { dimensions: { width: 1, depth: 1, height: 1 }, condition: 'POOR' } })).outcome, 'CONTINUE')
})

test('Move critical missing is conservative and resale null is not decisive', () => {
  const result = evaluateMoveHardRules(move({ furniture: { dimensions: { width: null } } }))
  assert.equal(result.outcome, 'WAIT')
  assert.equal(result.takeAllowed, null)
  assert.equal(evaluateMoveHardRules(move({ economicsContext: { estimatedResaleValueCny: null } })).outcome, 'CONTINUE')
})

test('Sentimental protection is independent from favorite and cannot override hard constraints', () => {
  assert.equal(evaluateMoveHardRules(move({ furniture: { sentimentalAttachment: true } })).sentimentalProtection, true)
  assert.equal(evaluateMoveHardRules(move({ furniture: { isFavorite: true } })).sentimentalProtection, false)
  const blocked = evaluateMoveHardRules(move({ furniture: { sentimentalAttachment: true }, newHomeContext: { physicalFit: 'IMPOSSIBLE' } }))
  assert.equal(blocked.outcome, 'EXCLUDE_TAKE')
  assert.equal(blocked.sentimentalProtection, false)
})
