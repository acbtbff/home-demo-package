import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAgentInput } from '../src/decision/agent/buildAgentInput.js'
import { createMockAgentProvider } from '../src/decision/agent/providers/mockAgentProvider.js'
import { reasonConflict } from '../src/decision/agent/conflictReasoner.js'
import { validateAgentOutput } from '../src/decision/agent/validateAgentOutput.js'
import { resolveMoveDecision } from '../src/decision/resolver/moveDecisionResolver.js'
const p = (ruleId, signal, domain = 'PURCHASE', category = 'UTILITY') => ({ ruleId, signal, domain, category })
const purchaseEvidence = [p('P_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_BUY'), p('P_SR03_ADEQUATE_SUBSTITUTE', 'AGAINST_BUY')]
const moveEvidence = [p('M_SR01_HIGH_CONTINUED_USE', 'SUPPORTS_TAKE', 'MOVE')]
const purchaseInput = { decisionType: 'PURCHASE', furniture: { id: 'chair-1', name: 'Chair' }, needContext: { usageFrequency: 'DAILY' }, userProfile: {} }
const moveInput = { decisionType: 'MOVE', furniture: { id: 'sofa-1', name: 'Sofa' }, userProfile: {} }
const resolver = (resolutionStatus, extra = {}) => ({ resolutionStatus, needsAgentReasoning: resolutionStatus === 'NEEDS_AGENT', conflictSummary: { hasDirectionConflict: true, hasPreferenceConflict: false, conflictingRuleIds: [] }, ...extra })
const validOutput = (decision = 'BUY') => ({ decision, confidence: 'MEDIUM', primaryReasonRuleIds: [purchaseEvidence[0].ruleId], tradeoffRuleIds: [], primaryReasons: ['需求证据'], tradeoffs: [], missingInformation: [], nextAction: '继续评估' })

function fixtureEvidence(items) {
  return items.map(({ ruleId, signal, domain = 'PURCHASE', category = 'UTILITY' }) => ({
    ruleId, signal, domain, category, reason: 'fixture',
    evidencePaths: ruleId === 'P_SR01_HIGH_CONTINUED_USE' ? ['needContext.usageFrequency'] : ['fixture'],
  }))
}

test('buildAgentInput keeps only relevant facts and program-controlled allowed decisions', () => {
  const input = buildAgentInput({ decisionInput: purchaseInput, hardRuleResult: {}, evidence: fixtureEvidence(purchaseEvidence), modifiers: [], resolverResult: resolver('NEEDS_AGENT') })
  assert.deepEqual(input.allowedDecisions, ['BUY', 'DONT_BUY'])
  assert.equal(input.relevantFacts.needContext.usageFrequency, 'DAILY')
  assert.equal(input.hardConstraints.sentimentalProtection, false)
  assert.equal(input.unresolvedContext.resolutionStatus, 'NEEDS_AGENT')
})

test('Move takeAllowed=false excludes TAKE from Agent input', () => {
  const input = buildAgentInput({ decisionInput: moveInput, hardRuleResult: { takeAllowed: false, sentimentalProtection: false }, evidence: fixtureEvidence(moveEvidence), resolverResult: resolver('NEEDS_AGENT', { takeAllowed: false }) })
  assert.deepEqual(input.allowedDecisions, [])
  assert.equal(input.allowedDecisions.includes('TAKE'), false)
})

test('RESOLVED and INSUFFICIENT_EVIDENCE never call provider', async () => {
  const provider = createMockAgentProvider({ response: validOutput() })
  const resolved = await reasonConflict({ agentInput: buildAgentInput({ decisionInput: purchaseInput, evidence: fixtureEvidence(purchaseEvidence), resolverResult: resolver('RESOLVED') }), provider })
  const insufficient = await reasonConflict({ agentInput: buildAgentInput({ decisionInput: purchaseInput, evidence: [], resolverResult: resolver('INSUFFICIENT_EVIDENCE', { needsAgentReasoning: false }) }), provider })
  assert.equal(resolved.error.code, 'AGENT_NOT_REQUIRED'); assert.equal(insufficient.error.code, 'INSUFFICIENT_EVIDENCE'); assert.equal(provider.callCount, 0)
})

test('NEEDS_AGENT calls provider once and accepts valid Purchase output', async () => {
  const provider = createMockAgentProvider({ response: validOutput('BUY') })
  const input = buildAgentInput({ decisionInput: purchaseInput, evidence: fixtureEvidence(purchaseEvidence), resolverResult: resolver('NEEDS_AGENT') })
  const result = await reasonConflict({ agentInput: input, provider })
  assert.equal(result.ok, true); assert.equal(provider.callCount, 1)
})

test('Agent output cannot violate allowedDecisions or invent rule ids', () => {
  const input = buildAgentInput({ decisionInput: moveInput, hardRuleResult: { takeAllowed: false }, evidence: fixtureEvidence(moveEvidence), resolverResult: resolver('NEEDS_AGENT', { takeAllowed: false }) })
  const invalidDecision = validateAgentOutput({ ...validOutput('TAKE'), primaryReasonRuleIds: ['M_SR01_HIGH_CONTINUED_USE'] }, input)
  const invalidRule = validateAgentOutput({ decision: 'SELL', confidence: 'MEDIUM', primaryReasonRuleIds: ['M_SR99'], tradeoffRuleIds: [], primaryReasons: [], tradeoffs: [], missingInformation: [], nextAction: 'x' }, input)
  assert.equal(invalidDecision.valid, false); assert.equal(invalidRule.valid, false)
})

test('Provider failure and malformed output are controlled errors', async () => {
  const input = buildAgentInput({ decisionInput: purchaseInput, evidence: fixtureEvidence(purchaseEvidence), resolverResult: resolver('NEEDS_AGENT') })
  const failed = await reasonConflict({ agentInput: input, provider: createMockAgentProvider({ error: new Error('timeout') }) })
  const malformed = await reasonConflict({ agentInput: input, provider: createMockAgentProvider({ response: null }) })
  assert.equal(failed.error.code, 'PROVIDER_ERROR'); assert.equal(malformed.error.code, 'INVALID_AGENT_OUTPUT')
})

test('sentimental protection remains hard-boundary data and M_SR06 remains separate evidence', async () => {
  const evidence = [{ ruleId: 'M_SR06_SENTIMENTAL_VALUE', signal: 'SUPPORTS_TAKE', domain: 'MOVE', category: 'PREFERENCE', reason: 'fixture', evidencePaths: ['furniture.sentimentalAttachment'] }]
  const input = buildAgentInput({ decisionInput: moveInput, hardRuleResult: { takeAllowed: false, sentimentalProtection: false }, evidence, resolverResult: resolver('NEEDS_AGENT', { takeAllowed: false }) })
  assert.equal(input.hardConstraints.sentimentalProtection, false)
  assert.equal(input.evidence[0].ruleId, 'M_SR06_SENTIMENTAL_VALUE')
  assert.equal(input.allowedDecisions.includes('TAKE'), false)
})

test('Purchase candidates are exactly the Evidence-supported directions', () => {
  const cases = [
    [['SUPPORTS_BUY', 'AGAINST_BUY'], ['BUY', 'DONT_BUY']],
    [['SUPPORTS_BUY', 'SUPPORTS_WAIT'], ['BUY', 'WAIT']],
    [['AGAINST_BUY', 'SUPPORTS_WAIT'], ['DONT_BUY', 'WAIT']],
    [['SUPPORTS_BUY', 'SUPPORTS_WAIT', 'AGAINST_BUY'], ['BUY', 'WAIT', 'DONT_BUY']],
  ]
  for (const [signals, expected] of cases) {
    const evidence = fixtureEvidence(signals.map((signal, index) => p(`P_TEST_${index}`, signal)))
    assert.deepEqual(buildAgentInput({ decisionInput: purchaseInput, evidence, resolverResult: resolver('NEEDS_AGENT') }).allowedDecisions, expected)
  }
})

test('Move candidates never invent non-take dispositions', () => {
  const takeAgainst = buildAgentInput({ decisionInput: moveInput, evidence: fixtureEvidence([p('M_SR01', 'SUPPORTS_TAKE', 'MOVE'), p('M_SR04', 'AGAINST_TAKE', 'MOVE')]), resolverResult: resolver('NEEDS_AGENT') })
  assert.deepEqual(takeAgainst.allowedDecisions, ['TAKE', 'WAIT'])
  const takeSell = buildAgentInput({ decisionInput: moveInput, evidence: fixtureEvidence([p('M_SR01', 'SUPPORTS_TAKE', 'MOVE'), p('M_SR05', 'SUPPORTS_SELL', 'MOVE')]), resolverResult: resolver('NEEDS_AGENT') })
  assert.deepEqual(takeSell.allowedDecisions, ['TAKE', 'SELL'])
})

test('Agent output requires supporting Evidence for decision and primary reasons', () => {
  const evidence = fixtureEvidence([p('P_BUY', 'SUPPORTS_BUY'), p('P_NO', 'AGAINST_BUY')])
  const input = buildAgentInput({ decisionInput: purchaseInput, evidence, resolverResult: resolver('NEEDS_AGENT') })
  const base = { confidence: 'MEDIUM', tradeoffRuleIds: [], primaryReasons: [], tradeoffs: [], missingInformation: [], nextAction: 'x' }
  assert.equal(validateAgentOutput({ ...base, decision: 'BUY', primaryReasonRuleIds: ['P_NO'] }, input).valid, false)
  assert.equal(validateAgentOutput({ ...base, decision: 'BUY', primaryReasonRuleIds: ['P_BUY'] }, input).valid, true)

  const moveEvidence = fixtureEvidence([p('M_AGAINST', 'AGAINST_TAKE', 'MOVE')])
  const moveAgentInput = buildAgentInput({ decisionInput: moveInput, evidence: [
    ...moveEvidence,
    ...fixtureEvidence([p('M_TAKE', 'SUPPORTS_TAKE', 'MOVE')]),
  ], resolverResult: resolver('NEEDS_AGENT') })
  assert.equal(validateAgentOutput({ ...base, decision: 'WAIT', primaryReasonRuleIds: ['M_AGAINST'] }, moveAgentInput).valid, true)
})

test('reasonConflict refuses Agent calls with fewer than two candidates', async () => {
  const provider = createMockAgentProvider({ response: validOutput() })
  const input = buildAgentInput({ decisionInput: purchaseInput, evidence: fixtureEvidence([p('P_WAIT', 'SUPPORTS_WAIT')]), resolverResult: resolver('NEEDS_AGENT') })
  const result = await reasonConflict({ agentInput: input, provider })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'AGENT_NOT_REQUIRED')
  assert.equal(provider.callCount, 0)
})

test('Move non-take routing distinguishes missing disposition from real conflicts', () => {
  const onlyAgainst = resolveMoveDecision({ evidence: [p('M_AGAINST', 'AGAINST_TAKE', 'MOVE')] })
  assert.equal(onlyAgainst.resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(onlyAgainst.needsAgentReasoning, false)
  assert.equal(onlyAgainst.unresolvedReason, 'NON_TAKE_DISPOSITION_EVIDENCE_INSUFFICIENT')

  const excluded = resolveMoveDecision({ hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false }, evidence: [] })
  assert.equal(excluded.resolutionStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(excluded.takeAllowed, false)

  const dispositionConflict = resolveMoveDecision({ hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false }, evidence: [
    p('M_SELL', 'SUPPORTS_SELL', 'MOVE'),
    p('M_GIVE', 'SUPPORTS_GIVE_AWAY', 'MOVE'),
  ] })
  assert.equal(dispositionConflict.resolutionStatus, 'NEEDS_AGENT')
  const input = buildAgentInput({ decisionInput: moveInput, hardRuleResult: { outcome: 'EXCLUDE_TAKE', takeAllowed: false }, evidence: fixtureEvidence([
    p('M_SELL', 'SUPPORTS_SELL', 'MOVE'),
    p('M_GIVE', 'SUPPORTS_GIVE_AWAY', 'MOVE'),
  ]), resolverResult: dispositionConflict })
  assert.deepEqual(input.allowedDecisions, ['SELL', 'GIVE_AWAY'])
})
