import assert from 'node:assert/strict'
import test from 'node:test'
import { createMockAgentProvider } from '../src/decision/agent/providers/mockAgentProvider.js'
import { evaluateFurnitureDecision, evaluateMoveDecision, evaluatePurchaseDecision } from '../src/decision/orchestration/furnitureDecisionOrchestrator.js'

const furniture = ({ id = 'fixture', status = 'WISHLIST', ownership = 'USER', favorite = false } = {}) => ({
  id,
  name: 'Fixture furniture',
  semantic: { category: 'TABLE', archetype: 'DESK' },
  physical: { dimensionsM: { width: 1, depth: 0.5, height: 0.75 } },
  lifecycle: { status, conditionLevel: null, coreFunctionStatus: null, safetyRisk: null },
  ownership: { type: ownership },
  isFavorite: favorite,
})

const moveEvidence = (ruleId, signal) => ({ ruleId, signal, domain: 'MOVE', category: 'UTILITY', reason: 'fixture evidence', evidencePaths: [] })

const purchaseAgentOutput = { decision: 'BUY', confidence: 'MEDIUM', primaryReasonRuleIds: ['P_SR01_HIGH_CONTINUED_USE'], tradeoffRuleIds: ['P_SR09_HIGH_UNCERTAINTY'], primaryReasons: ['continued need'], tradeoffs: ['uncertainty'], missingInformation: [], nextAction: 'review' }
const moveAgentOutput = { decision: 'TAKE', confidence: 'LOW', primaryReasonRuleIds: ['M_SR07_LONG_TERM_FUTURE_USE'], tradeoffRuleIds: ['M_SELL'], primaryReasons: ['future use'], tradeoffs: ['resale'], missingInformation: [], nextAction: 'move it' }

test('Purchase hard DONT_BUY does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: purchaseAgentOutput })
  const result = await evaluatePurchaseDecision({ furniture: furniture(), overrides: { spaceContext: { physicalFit: 'IMPOSSIBLE' } }, agentProvider: provider })
  assert.equal(result.decision, 'DONT_BUY'); assert.equal(result.source, 'HARD_RULE'); assert.equal(provider.callCount, 0)
})

test('Purchase deterministic BUY does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: purchaseAgentOutput })
  const result = await evaluatePurchaseDecision({ furniture: furniture(), overrides: { needContext: { usageFrequency: 'DAILY', needStrength: 'HIGH', substituteAvailable: false } }, agentProvider: provider })
  assert.equal(result.decision, 'BUY'); assert.equal(result.source, 'DETERMINISTIC_RESOLVER'); assert.equal(provider.callCount, 0)
})

test('Purchase insufficient evidence does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: purchaseAgentOutput })
  const result = await evaluatePurchaseDecision({ furniture: furniture(), agentProvider: provider })
  assert.equal(result.resolutionStatus, 'INSUFFICIENT_EVIDENCE'); assert.equal(result.decision, null); assert.equal(provider.callCount, 0)
})

test('Purchase BUY vs WAIT conflict calls Agent exactly once', async () => {
  const provider = createMockAgentProvider({ response: purchaseAgentOutput })
  const result = await evaluatePurchaseDecision({ furniture: furniture(), overrides: { needContext: { usageFrequency: 'DAILY', needStrength: 'HIGH', substituteAvailable: false, substituteAdequacy: 'LOW' }, spaceContext: { physicalFit: 'UNCERTAIN' } }, agentProvider: provider })
  assert.equal(result.decision, 'BUY'); assert.equal(result.source, 'AGENT'); assert.equal(result.agentCalled, true); assert.equal(provider.callCount, 1)
})

test('Move ineligible non-personal furniture does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: moveAgentOutput })
  const result = await evaluateMoveDecision({ furniture: furniture({ status: 'OWNED', ownership: 'LANDLORD' }), agentProvider: provider })
  assert.equal(result.resolutionStatus, 'INELIGIBLE'); assert.equal(result.source, 'INELIGIBLE'); assert.equal(provider.callCount, 0)
})

test('Move hard WAIT does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: moveAgentOutput })
  const result = await evaluateMoveDecision({ furniture: furniture({ status: 'OWNED' }), overrides: { furniture: { dimensions: { width: null, depth: null, height: null } } }, agentProvider: provider })
  assert.equal(result.decision, 'WAIT'); assert.equal(result.source, 'HARD_RULE'); assert.equal(provider.callCount, 0)
})

test('Move deterministic TAKE does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: moveAgentOutput })
  const result = await evaluateMoveDecision({ furniture: furniture({ status: 'OWNED' }), overrides: { usageContext: { usageFrequency: 'DAILY', expectedFutureUse: 'HIGH', substituteAvailable: false, substituteAdequacy: 'LOW' }, logisticsContext: { handlingBurden: 'LOW', movingBurdenLevel: 'LOW' } }, agentProvider: provider })
  assert.equal(result.decision, 'TAKE'); assert.equal(result.source, 'DETERMINISTIC_RESOLVER'); assert.equal(provider.callCount, 0)
})

test('Move AGAINST_TAKE without disposition evidence is insufficient and does not call Agent', async () => {
  const provider = createMockAgentProvider({ response: moveAgentOutput })
  const result = await evaluateMoveDecision({ furniture: furniture({ status: 'OWNED' }), overrides: { usageContext: { substituteAvailable: true, substituteAdequacy: 'HIGH' } }, agentProvider: provider })
  assert.equal(result.resolutionStatus, 'INSUFFICIENT_EVIDENCE'); assert.equal(result.unresolvedReason, 'NON_TAKE_DISPOSITION_EVIDENCE_INSUFFICIENT'); assert.equal(provider.callCount, 0)
})

test('Move TAKE vs SELL conflict calls Agent exactly once', async () => {
  const provider = createMockAgentProvider({ response: moveAgentOutput })
  const result = await evaluateMoveDecision({ furniture: furniture({ status: 'OWNED' }), additionalEvidence: [moveEvidence('M_SELL', 'SUPPORTS_SELL')], overrides: { usageContext: { expectedFutureUse: 'HIGH' } }, agentProvider: provider })
  assert.equal(result.decision, 'TAKE'); assert.equal(result.source, 'AGENT'); assert.equal(provider.callCount, 1); assert.equal(result.agentCalled, true)
})

test('unified furniture decision entry point routes by decisionType', async () => {
  const result = await evaluateFurnitureDecision({ decisionType: 'PURCHASE', furniture: furniture() })
  assert.equal(result.decisionType, 'PURCHASE')
})
