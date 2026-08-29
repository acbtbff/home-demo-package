import assert from 'node:assert/strict'
import test from 'node:test'
import { PurchaseEvidenceSignal, MoveEvidenceSignal } from '../src/decision/common/evidence.js'
import { collectPurchaseEvidence } from '../src/decision/purchase/collectPurchaseEvidence.js'
import { collectMoveEvidence } from '../src/decision/move/collectMoveEvidence.js'
import { createPurchaseDecisionInput } from '../src/decision/purchase/purchaseInputSchema.js'
import { createMoveDecisionInput } from '../src/decision/move/moveInputSchema.js'

test('Purchase soft evidence is discrete and requires sufficient facts', () => {
  const input = createPurchaseDecisionInput({ needContext: { usageFrequency: 'DAILY', needStrength: 'HIGH', substituteAdequacy: 'LOW', functionalGap: true }, furniture: { isFavorite: true, returnable: true, trialAvailable: true } })
  const result = collectPurchaseEvidence(input)
  assert.ok(result.evidence.some(({ ruleId, signal }) => ruleId === 'P_SR01_HIGH_CONTINUED_USE' && signal === PurchaseEvidenceSignal.SUPPORTS_BUY))
  assert.ok(result.evidence.some(({ ruleId, signal }) => ruleId === 'P_SR08_FAVORITE_VALUE' && signal === PurchaseEvidenceSignal.SUPPORTS_BUY))
  assert.ok(result.evidence.some(({ ruleId }) => ruleId === 'P_SR10_HIGH_REVERSIBILITY'))
  assert.equal(Object.hasOwn(input, 'decision'), false)
  assert.equal(result.evidence.some(({ ruleId }) => ruleId === 'P_SR01_HIGH_CONTINUED_USE' && input.needContext.usageFrequency === 'DAILY' && input.needContext.needStrength === null), false)
})

test('Purchase substitute adequacy and favorite false semantics', () => {
  const adequate = collectPurchaseEvidence(createPurchaseDecisionInput({ needContext: { substituteAvailable: true, substituteAdequacy: 'HIGH' } }))
  assert.ok(adequate.evidence.some(({ ruleId, signal }) => ruleId === 'P_SR03_ADEQUATE_SUBSTITUTE' && signal === PurchaseEvidenceSignal.AGAINST_BUY))
  const low = collectPurchaseEvidence(createPurchaseDecisionInput({ needContext: { substituteAvailable: true, substituteAdequacy: 'LOW' }, furniture: { isFavorite: false } }))
  assert.equal(low.evidence.some(({ ruleId }) => ruleId === 'P_SR03_ADEQUATE_SUBSTITUTE'), false)
  assert.equal(low.evidence.some(({ ruleId }) => ruleId === 'P_SR08_FAVORITE_VALUE'), false)
})

test('Purchase numeric values and short stay do not create invented evidence', () => {
  const result = collectPurchaseEvidence(createPurchaseDecisionInput({ furniture: { priceCny: 999 }, economicsContext: { expectedResaleValueCny: 600 }, lifecycleContext: { expectedStayMonths: 2 } }))
  assert.equal(result.evidence.some(({ ruleId }) => ['P_SR02_LOW_FREQUENCY_VALID', 'P_SR06_BUDGET_PRESSURE', 'P_SR07_SHORT_STAY_GUARD'].includes(ruleId)), false)
})

test('Move soft evidence covers utility, replacement, logistics, favorite and sentimental signals', () => {
  const input = createMoveDecisionInput({
    furniture: { isFavorite: true, sentimentalAttachment: true },
    usageContext: { usageFrequency: 'DAILY', expectedFutureUse: 'HIGH', substituteAvailable: false, functionalImportance: 'HIGH' },
    logisticsContext: { sizeClass: 'LARGE', handlingBurden: 'HIGH' },
    economicsContext: { futureReuseProbability: 'HIGH' },
  })
  const result = collectMoveEvidence(input)
  for (const ruleId of ['M_SR01_HIGH_CONTINUED_USE', 'M_SR06_SENTIMENTAL_VALUE', 'M_SR07_LONG_TERM_FUTURE_USE', 'M_SR10_FAVORITE_VALUE', 'M_SR11_HIGH_FUTURE_REUSE']) assert.ok(result.evidence.some(({ ruleId: actual }) => actual === ruleId))
  assert.equal(result.evidence.some(({ signal }) => signal === MoveEvidenceSignal.SUPPORTS_TAKE && Object.hasOwn({ }, 'decision')), false)
})

test('Move low usage plus large high burden supports against-take, but low usage alone does not', () => {
  const result = collectMoveEvidence(createMoveDecisionInput({ usageContext: { usageFrequency: 'RARE' }, logisticsContext: { sizeClass: 'LARGE', movingBurdenLevel: 'HIGH' } }))
  assert.ok(result.evidence.some(({ ruleId, signal }) => ruleId === 'M_SR04_LOW_USAGE_HIGH_BURDEN' && signal === MoveEvidenceSignal.AGAINST_TAKE))
  const lowOnly = collectMoveEvidence(createMoveDecisionInput({ usageContext: { usageFrequency: 'RARE' } }))
  assert.equal(lowOnly.evidence.some(({ ruleId }) => ruleId === 'M_SR04_LOW_USAGE_HIGH_BURDEN'), false)
})

test('Move adequate replacement and functional emergency value use explicit qualitative facts', () => {
  const replacement = collectMoveEvidence(createMoveDecisionInput({ usageContext: { substituteAvailable: true, substituteAdequacy: 'HIGH' } }))
  assert.ok(replacement.evidence.some(({ ruleId, signal }) => ruleId === 'M_SR03_ADEQUATE_REPLACEMENT' && signal === MoveEvidenceSignal.AGAINST_TAKE))
  const emergency = collectMoveEvidence(createMoveDecisionInput({ usageContext: { usageFrequency: 'LOW', functionalImportance: 'HIGH' }, logisticsContext: { movingBurdenLevel: 'MEDIUM' } }))
  assert.ok(emergency.evidence.some(({ ruleId, signal }) => ruleId === 'M_SR12_LOW_USAGE_EMERGENCY_VALUE' && signal === MoveEvidenceSignal.SUPPORTS_TAKE))
})

test('Collision and out-of-bounds diagnostics never create against-take evidence', () => {
  const result = collectMoveEvidence(createMoveDecisionInput({ newHomeContext: { collision: true }, diagnostics: { outOfBounds: true } }))
  assert.equal(result.evidence.some(({ signal }) => signal === MoveEvidenceSignal.AGAINST_TAKE), false)
})
