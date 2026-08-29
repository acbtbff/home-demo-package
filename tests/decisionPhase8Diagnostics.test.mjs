import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAgentOutput } from '../src/decision/agent/validateAgentOutput.js'

const agentInput = (overrides = {}) => ({
  decisionType: 'MOVE',
  allowedDecisions: ['TAKE', 'SELL'],
  hardConstraints: { takeAllowed: true, sentimentalProtection: false },
  evidence: [
    { ruleId: 'M_TAKE', signal: 'SUPPORTS_TAKE' },
    { ruleId: 'M_SELL', signal: 'SUPPORTS_SELL' },
  ],
  ...overrides,
})

const validOutput = (overrides = {}) => ({
  decision: 'TAKE',
  confidence: 'MEDIUM',
  primaryReasonRuleIds: ['M_TAKE'],
  tradeoffRuleIds: [],
  primaryReasons: [],
  tradeoffs: [],
  missingInformation: [],
  nextAction: '',
  ...overrides,
})

test('valid Agent Output passes and permits empty list fields', () => {
  const result = validateAgentOutput(validOutput(), agentInput())
  assert.equal(result.valid, true)
  assert.deepEqual(result.issues, [])
})

test('missing fields produce MISSING_REQUIRED_FIELD issues with paths', () => {
  const result = validateAgentOutput({}, agentInput())
  assert.equal(result.valid, false)
  assert.ok(result.issues.filter(({ code }) => code === 'MISSING_REQUIRED_FIELD').length >= 8)
  assert.ok(result.issues.some(({ path, code }) => path === 'nextAction' && code === 'MISSING_REQUIRED_FIELD'))
})

test('decision outside allowedDecisions produces DECISION_NOT_ALLOWED', () => {
  const result = validateAgentOutput(validOutput({ decision: 'DISCARD', primaryReasonRuleIds: ['M_TAKE'] }), agentInput())
  assert.ok(result.issues.some(({ path, code }) => path === 'decision' && code === 'DECISION_NOT_ALLOWED'))
})

test('fabricated rule IDs produce field-specific unknown rule diagnostics', () => {
  const result = validateAgentOutput(validOutput({ primaryReasonRuleIds: ['M_FABRICATED'], tradeoffRuleIds: ['M_UNKNOWN_TRADEOFF'] }), agentInput())
  assert.ok(result.issues.some(({ path, code }) => path === 'primaryReasonRuleIds[0]' && code === 'UNKNOWN_PRIMARY_RULE_ID'))
  assert.ok(result.issues.some(({ path, code }) => path === 'tradeoffRuleIds[0]' && code === 'UNKNOWN_TRADEOFF_RULE_ID'))
})

test('primary reason must support the selected decision', () => {
  const result = validateAgentOutput(validOutput({ primaryReasonRuleIds: ['M_SELL'] }), agentInput())
  assert.ok(result.issues.some(({ path, code }) => path === 'primaryReasonRuleIds' && code === 'PRIMARY_REASON_DOES_NOT_SUPPORT_DECISION'))
})

test('TAKE is blocked by the hard constraint', () => {
  const result = validateAgentOutput(validOutput(), agentInput({ hardConstraints: { takeAllowed: false, sentimentalProtection: false } }))
  assert.ok(result.issues.some(({ path, code }) => path === 'decision' && code === 'TAKE_BLOCKED_BY_HARD_CONSTRAINT'))
})

test('confidence is strict and case-sensitive', () => {
  const result = validateAgentOutput(validOutput({ confidence: 'high' }), agentInput())
  assert.ok(result.issues.some(({ path, code }) => path === 'confidence' && code === 'INVALID_CONFIDENCE'))
})

test('invalid field types and nextAction are diagnosed without relaxing validation', () => {
  const result = validateAgentOutput(validOutput({ primaryReasons: null, nextAction: null }), agentInput())
  assert.ok(result.issues.some(({ path, code }) => path === 'primaryReasons' && code === 'INVALID_FIELD_TYPE'))
  assert.ok(result.issues.some(({ path, code }) => path === 'nextAction' && code === 'INVALID_NEXT_ACTION'))
})
