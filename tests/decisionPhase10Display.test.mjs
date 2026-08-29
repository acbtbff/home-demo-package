import assert from 'node:assert/strict'
import test from 'node:test'
import { collectDecisionReasons, formatConfidenceLabel, formatDecisionLabel, formatNextAction, formatSourceLabel, getDecisionType } from '../src/components/furniture/decisionDisplay.js'

test('decision labels map backend enums to Chinese UI labels', () => {
  assert.equal(formatDecisionLabel('TAKE'), '建议带走')
  assert.equal(formatDecisionLabel('SELL'), '建议出售')
  assert.equal(formatDecisionLabel('BUY'), '建议购买')
  assert.equal(formatDecisionLabel('DONT_BUY'), '不建议购买')
  assert.equal(formatDecisionLabel('WAIT'), '建议暂缓判断')
})

test('source and confidence mappings stay user-facing and null confidence stays hidden', () => {
  assert.equal(formatSourceLabel('AGENT'), 'AI 综合判断')
  assert.equal(formatSourceLabel('HARD_RULE'), '明确条件判断')
  assert.equal(formatConfidenceLabel(null), null)
  assert.equal(formatConfidenceLabel('LOW'), '低置信度')
})

test('decision type follows lifecycle for default UI entry without reproducing eligibility rules', () => {
  assert.equal(getDecisionType({ lifecycle: { status: 'OWNED' } }), 'MOVE')
  assert.equal(getDecisionType({ lifecycle: { status: 'WISHLIST' } }), 'PURCHASE')
})

test('reasons prefer Agent reasons then backend evidence and nextAction objects use safe labels', () => {
  assert.deepEqual(collectDecisionReasons({ agentResult: { primaryReasons: ['agent reason'] }, activeEvidence: [] }), ['agent reason'])
  assert.deepEqual(collectDecisionReasons({ rationaleRuleIds: ['R1'], activeEvidence: [{ ruleId: 'R1', reason: 'evidence reason' }] }), ['evidence reason'])
  assert.equal(formatNextAction({ label: '确认尺寸' }), '确认尺寸')
  assert.equal(formatNextAction({ arbitrary: 'secret-like' }), null)
})
