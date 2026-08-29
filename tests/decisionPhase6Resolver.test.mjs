import assert from 'node:assert/strict'
import test from 'node:test'
import { createEvidence } from '../src/decision/common/evidence.js'
import { detectModifierConflicts } from '../src/decision/resolver/modifierConflictDetector.js'
import { resolvePurchaseDecision } from '../src/decision/resolver/purchaseDecisionResolver.js'
import { resolveMoveDecision } from '../src/decision/resolver/moveDecisionResolver.js'

const p = (ruleId, signal) => createEvidence({ ruleId, domain: 'PURCHASE', category: 'UTILITY', signal, reason: 'fixture', evidencePaths: ['fixture'] })
const m = (ruleId, signal, category = 'UTILITY') => createEvidence({ ruleId, domain: 'MOVE', category, signal, reason: 'fixture', evidencePaths: ['fixture'] })
const modifier = (profileKey, targetRuleId, effect) => ({ profileKey, profileValue: profileKey.endsWith('Preference') ? 'HIGH' : 'LOW', targetRuleId, effect, reason: 'fixture' })

test('modifier conflict detector identifies amplify and dampen without cancelling', () => {
  const result = detectModifierConflicts([modifier('immediacyPreference', 'P_SR09_HIGH_UNCERTAINTY', 'DAMPEN'), modifier('uncertaintyTolerance', 'P_SR09_HIGH_UNCERTAINTY', 'AMPLIFY')])
  assert.equal(result.hasConflict, true)
  assert.deepEqual(result.conflicts[0].effects, [{ profileKey: 'immediacyPreference', effect: 'DAMPEN' }, { profileKey: 'uncertaintyTolerance', effect: 'AMPLIFY' }])
})

test('Purchase hard outcomes always win', () => {
  const result = resolvePurchaseDecision({ hardRuleResult: { outcome: 'DONT_BUY', triggeredRules: [{ id: 'P_HR01_PHYSICAL_FIT_IMPOSSIBLE' }] }, evidence: [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY')] })
  assert.deepEqual({ decision: result.decision, resolutionStatus: result.resolutionStatus, source: result.source, needsAgentReasoning: result.needsAgentReasoning }, { decision: 'DONT_BUY', resolutionStatus: 'RESOLVED', source: 'HARD_RULE', needsAgentReasoning: false })
  assert.equal(resolvePurchaseDecision({ hardRuleResult: { outcome: 'UNKNOWN', triggeredRules: [{ id: 'P_HR02_CRITICAL_FIT_INFORMATION_MISSING' }] }, evidence: [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY')] }).decision, 'UNKNOWN')
})

test('Purchase resolves core evidence, substantive negatives, wait, conflicts and insufficient evidence', () => {
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY')] }).decision, 'BUY')
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY'), p('P_SR08_FAVORITE_VALUE', 'SUPPORTS_BUY')] }).decision, 'BUY')
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR03_ADEQUATE_SUBSTITUTE', 'AGAINST_BUY')] }).decision, 'DONT_BUY')
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR09_HIGH_UNCERTAINTY', 'SUPPORTS_WAIT')] }).decision, 'WAIT')
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR08_FAVORITE_VALUE', 'SUPPORTS_BUY')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR10_HIGH_REVERSIBILITY', 'SUPPORTS_BUY')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  const conflict = resolvePurchaseDecision({ evidence: [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY'), p('P_SR03_ADEQUATE_SUBSTITUTE', 'AGAINST_BUY')] })
  assert.equal(conflict.resolutionStatus, 'NEEDS_AGENT'); assert.equal(conflict.needsAgentReasoning, true)
  assert.equal(resolvePurchaseDecision({ evidence: [p('P_SR04_REPEATED_FRICTION', 'SUPPORTS_BUY')], modifiers: [modifier('frictionSensitivity', 'P_SR04_REPEATED_FRICTION', 'DAMPEN')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
})

test('Purchase preference conflicts route to Agent and never flip signal', () => {
  const result = resolvePurchaseDecision({ evidence: [p('P_SR09_HIGH_UNCERTAINTY', 'SUPPORTS_WAIT')], modifiers: [modifier('immediacyPreference', 'P_SR09_HIGH_UNCERTAINTY', 'DAMPEN'), modifier('uncertaintyTolerance', 'P_SR09_HIGH_UNCERTAINTY', 'AMPLIFY')] })
  assert.equal(result.resolutionStatus, 'INSUFFICIENT_EVIDENCE'); assert.equal(result.conflictSummary.hasPreferenceConflict, true); assert.deepEqual(result.activeSignals, ['SUPPORTS_WAIT'])
})

test('Move hard WAIT resolves without Agent; EXCLUDE_TAKE never restores TAKE', () => {
  const wait = resolveMoveDecision({ hardRuleResult: { outcome: 'WAIT', triggeredRules: [{ id: 'M_HR04_DECISIVE_INFORMATION_MISSING' }] } })
  assert.equal(wait.decision, 'WAIT'); assert.equal(wait.source, 'HARD_RULE'); assert.equal(wait.needsAgentReasoning, false)
  const excluded = resolveMoveDecision({ hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false, triggeredRules: [{ id: 'M_HR01_PHYSICAL_FIT_IMPOSSIBLE' }] } })
  assert.equal(excluded.decision, null); assert.equal(excluded.takeAllowed, false); assert.equal(excluded.resolutionStatus, 'INSUFFICIENT_EVIDENCE'); assert.equal(excluded.needsAgentReasoning, false)
})

test('Move resolves core TAKE, SELL, and routes non-take ambiguity/conflicts', () => {
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_TAKE')] }).decision, 'TAKE')
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR10_FAVORITE_VALUE', 'SUPPORTS_TAKE')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  const sentimentalEvidenceOnly = resolveMoveDecision({ evidence: [m('M_SR06_SENTIMENTAL_VALUE', 'SUPPORTS_TAKE', 'PREFERENCE')] })
  assert.equal(sentimentalEvidenceOnly.resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(sentimentalEvidenceOnly.sentimentalProtection, false)
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR05_RESALE_OPPORTUNITY', 'SUPPORTS_SELL', 'ECONOMICS')] }).decision, 'SELL')
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR04_LOW_USAGE_HIGH_BURDEN', 'AGAINST_TAKE', 'LOGISTICS')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_TAKE'), m('M_SR04_LOW_USAGE_HIGH_BURDEN', 'AGAINST_TAKE', 'LOGISTICS')] }).resolutionStatus, 'NEEDS_AGENT')
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_TAKE'), m('M_SR05_RESALE_OPPORTUNITY', 'SUPPORTS_SELL', 'ECONOMICS')] }).resolutionStatus, 'NEEDS_AGENT')
})

test('sentimentalProtection comes only from the Phase 3 hard-rule result', () => {
  const protectedResult = resolveMoveDecision({
    hardRuleResult: { outcome: 'CONTINUE', sentimentalProtection: true },
    evidence: [m('M_SR06_SENTIMENTAL_VALUE', 'SUPPORTS_TAKE', 'PREFERENCE')],
  })
  assert.equal(protectedResult.sentimentalProtection, true)

  const softOnly = resolveMoveDecision({
    hardRuleResult: { outcome: 'CONTINUE', sentimentalProtection: false },
    evidence: [m('M_SR06_SENTIMENTAL_VALUE', 'SUPPORTS_TAKE', 'PREFERENCE')],
  })
  assert.equal(softOnly.sentimentalProtection, false)

  const physicallyExcluded = resolveMoveDecision({
    hardRuleResult: {
      outcome: 'EXCLUDE_TAKE',
      takeAllowed: false,
      sentimentalProtection: false,
      triggeredRules: [{ id: 'M_HR01_PHYSICAL_FIT_IMPOSSIBLE' }],
    },
    evidence: [m('M_SR06_SENTIMENTAL_VALUE', 'SUPPORTS_TAKE', 'PREFERENCE')],
  })
  assert.equal(physicallyExcluded.takeAllowed, false)
  assert.equal(physicallyExcluded.sentimentalProtection, false)
  assert.notEqual(physicallyExcluded.decision, 'TAKE')
})

test('Move hard exclusion plus explicit SELL is deterministic unless sentimental protection conflicts', () => {
  const result = resolveMoveDecision({ hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false, triggeredRules: [{ id: 'M_HR01_PHYSICAL_FIT_IMPOSSIBLE' }] }, evidence: [m('M_SR05_RESALE_OPPORTUNITY', 'SUPPORTS_SELL', 'ECONOMICS')] })
  assert.equal(result.decision, 'SELL'); assert.equal(result.takeAllowed, false); assert.equal(result.source, 'DETERMINISTIC_EVIDENCE')
  const protectedResult = resolveMoveDecision({ hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false, sentimentalProtection: true }, evidence: [m('M_SR05_RESALE_OPPORTUNITY', 'SUPPORTS_SELL', 'ECONOMICS')] })
  assert.equal(protectedResult.decision, null); assert.equal(protectedResult.resolutionStatus, 'NEEDS_AGENT'); assert.equal(protectedResult.unresolvedReason, 'SENTIMENTAL_PROTECTION_CONFLICT')
})

test('Move long-term evidence remains deterministic when amplified or dampened', () => {
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR11_HIGH_FUTURE_REUSE', 'SUPPORTS_TAKE', 'LIFECYCLE')], modifiers: [modifier('longTermOwnershipPreference', 'M_SR11_HIGH_FUTURE_REUSE', 'AMPLIFY')] }).decision, 'TAKE')
  assert.equal(resolveMoveDecision({ evidence: [m('M_SR11_HIGH_FUTURE_REUSE', 'SUPPORTS_TAKE', 'LIFECYCLE')], modifiers: [modifier('longTermOwnershipPreference', 'M_SR11_HIGH_FUTURE_REUSE', 'DAMPEN')] }).resolutionStatus, 'INSUFFICIENT_EVIDENCE')
})
