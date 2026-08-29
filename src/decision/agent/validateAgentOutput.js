import { AgentConfidence, AgentDecisionType } from './agentTypes.js'

const ALLOWED_KEYS = new Set(['decision', 'confidence', 'primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation', 'nextAction'])

export function validateAgentOutput(output, agentInput) {
  const errors = []
  if (!output || typeof output !== 'object' || Array.isArray(output)) return { valid: false, errors: ['output must be an object'] }
  for (const key of Object.keys(output)) if (!ALLOWED_KEYS.has(key)) errors.push(`unexpected output field: ${key}`)
  if (!agentInput?.allowedDecisions?.includes(output.decision)) errors.push('decision must belong to allowedDecisions')
  if (!Object.values(AgentConfidence).includes(output.confidence)) errors.push('confidence must be HIGH, MEDIUM, or LOW')
  for (const key of ['primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation']) if (!Array.isArray(output[key])) errors.push(`${key} must be an array`)
  const knownRuleIds = new Set((agentInput?.evidence ?? []).map(({ ruleId }) => ruleId))
  for (const key of ['primaryReasonRuleIds', 'tradeoffRuleIds']) for (const ruleId of output[key] ?? []) if (!knownRuleIds.has(ruleId)) errors.push(`${key} contains unknown ruleId: ${ruleId}`)
  const supportingSignals = agentInput?.decisionType === AgentDecisionType.PURCHASE
    ? { BUY: new Set(['SUPPORTS_BUY']), DONT_BUY: new Set(['AGAINST_BUY']), WAIT: new Set(['SUPPORTS_WAIT']) }
    : { TAKE: new Set(['SUPPORTS_TAKE']), SELL: new Set(['SUPPORTS_SELL']), GIVE_AWAY: new Set(['SUPPORTS_GIVE_AWAY']), DISCARD: new Set(['SUPPORTS_DISCARD']), WAIT: new Set(['AGAINST_TAKE']) }
  const acceptableSignals = supportingSignals[output.decision] ?? new Set()
  const supportingEvidence = (agentInput?.evidence ?? []).filter(({ ruleId, signal }) => output.primaryReasonRuleIds?.includes(ruleId) && acceptableSignals.has(signal))
  if (acceptableSignals.size === 0 || !supportingEvidence.length) errors.push('primaryReasonRuleIds must include Evidence supporting the selected decision')
  if (typeof output.nextAction !== 'string' && (!output.nextAction || typeof output.nextAction !== 'object')) errors.push('nextAction must be a string or object')
  if (agentInput?.hardConstraints?.takeAllowed === false && output.decision === 'TAKE') errors.push('TAKE is forbidden by hardConstraints')
  return { valid: errors.length === 0, errors }
}
