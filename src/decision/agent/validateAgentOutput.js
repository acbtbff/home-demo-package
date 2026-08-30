import { AgentConfidence, AgentDecisionType } from './agentTypes.js'

const ALLOWED_KEYS = new Set(['decision', 'confidence', 'primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation', 'nextAction'])
const REQUIRED_FIELDS = ['decision', 'confidence', 'primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation', 'nextAction']
const ARRAY_FIELDS = ['primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation']

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function validateAgentOutput(output, agentInput) {
  const issues = []
  const errors = []
  const addIssue = (path, code, message) => {
    issues.push({ path, code, message })
    errors.push(`${path}: ${message}`)
  }

  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    addIssue('$', 'INVALID_OUTPUT_TYPE', 'Agent output must be an object.')
    return { valid: false, code: 'INVALID_AGENT_OUTPUT', issues, errors }
  }

  for (const key of Object.keys(output)) if (!ALLOWED_KEYS.has(key)) addIssue(key, 'UNEXPECTED_FIELD', 'Field is not part of the Agent output contract.')
  for (const key of REQUIRED_FIELDS) if (!hasOwn(output, key)) addIssue(key, 'MISSING_REQUIRED_FIELD', 'Required field is missing.')

  if (hasOwn(output, 'decision')) {
    if (typeof output.decision !== 'string' || output.decision.length === 0) addIssue('decision', 'INVALID_DECISION', 'Decision must be a non-empty string.')
    else if (!Array.isArray(agentInput?.allowedDecisions) || !agentInput.allowedDecisions.includes(output.decision)) addIssue('decision', 'DECISION_NOT_ALLOWED', 'Decision must belong to allowedDecisions.')
  }

  if (hasOwn(output, 'confidence') && (typeof output.confidence !== 'string' || !Object.values(AgentConfidence).includes(output.confidence))) addIssue('confidence', 'INVALID_CONFIDENCE', 'Confidence must be exactly HIGH, MEDIUM, or LOW.')

  for (const key of ARRAY_FIELDS) {
    if (!hasOwn(output, key)) continue
    if (!Array.isArray(output[key])) {
      addIssue(key, 'INVALID_FIELD_TYPE', 'Field must be an array.')
      continue
    }
    for (const [index, value] of output[key].entries()) if (typeof value !== 'string') addIssue(`${key}[${index}]`, 'INVALID_FIELD_TYPE', 'Array items must be strings.')
  }

  const knownRuleIds = new Set((agentInput?.evidence ?? []).map(({ ruleId }) => ruleId))
  if (Array.isArray(output.primaryReasonRuleIds)) for (const [index, ruleId] of output.primaryReasonRuleIds.entries()) if (typeof ruleId === 'string' && !knownRuleIds.has(ruleId)) addIssue(`primaryReasonRuleIds[${index}]`, 'UNKNOWN_PRIMARY_RULE_ID', 'Rule ID is not present in current evidence.')
  if (Array.isArray(output.tradeoffRuleIds)) for (const [index, ruleId] of output.tradeoffRuleIds.entries()) if (typeof ruleId === 'string' && !knownRuleIds.has(ruleId)) addIssue(`tradeoffRuleIds[${index}]`, 'UNKNOWN_TRADEOFF_RULE_ID', 'Rule ID is not present in current evidence.')

  const supportingSignals = agentInput?.decisionType === AgentDecisionType.PURCHASE
    ? { BUY: new Set(['SUPPORTS_BUY']), DONT_BUY: new Set(['AGAINST_BUY']), WAIT: new Set(['SUPPORTS_WAIT']) }
    : { TAKE: new Set(['SUPPORTS_TAKE']), SELL: new Set(['SUPPORTS_SELL']), GIVE_AWAY: new Set(['SUPPORTS_GIVE_AWAY']), DISCARD: new Set(['SUPPORTS_DISCARD']), WAIT: new Set(['AGAINST_TAKE']) }
  const acceptableSignals = supportingSignals[output.decision] ?? new Set()
  if (typeof output.decision === 'string' && Array.isArray(output.primaryReasonRuleIds)) {
    const supportingEvidence = (agentInput?.evidence ?? []).filter(({ ruleId, signal }) => output.primaryReasonRuleIds.includes(ruleId) && acceptableSignals.has(signal))
    if (acceptableSignals.size === 0 || !supportingEvidence.length) addIssue('primaryReasonRuleIds', 'PRIMARY_REASON_DOES_NOT_SUPPORT_DECISION', 'Primary reason rule IDs must include Evidence supporting the selected decision.')
  }

  if (hasOwn(output, 'nextAction')) {
    const validNextAction = typeof output.nextAction === 'string' || (output.nextAction !== null && typeof output.nextAction === 'object' && !Array.isArray(output.nextAction))
    if (!validNextAction) addIssue('nextAction', 'INVALID_NEXT_ACTION', 'nextAction must be a string or non-null object.')
  }

  if (agentInput?.hardConstraints?.takeAllowed === false && output.decision === 'TAKE') addIssue('decision', 'TAKE_BLOCKED_BY_HARD_CONSTRAINT', 'TAKE is forbidden by hardConstraints.')

  return { valid: issues.length === 0, code: issues.length === 0 ? undefined : 'INVALID_AGENT_OUTPUT', issues, errors }
}
