import { AgentDecisionType, AgentInputSchemaVersion } from './agentTypes.js'

const clone = (value) => structuredClone(value ?? null)

function getPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function relevantFactsFromInput(input, evidence) {
  const paths = [...new Set(evidence.flatMap((item) => item.evidencePaths ?? []))]
  const relevantFacts = {}
  for (const path of paths) {
    const value = getPath(input, path)
    if (value === undefined) continue
    const segments = path.split('.')
    let target = relevantFacts
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) target[segment] = clone(value)
      else target = target[segment] ??= {}
    })
  }
  return relevantFacts
}

const PURCHASE_SIGNAL_TO_DECISION = Object.freeze({
  SUPPORTS_BUY: 'BUY',
  AGAINST_BUY: 'DONT_BUY',
  SUPPORTS_WAIT: 'WAIT',
})

const MOVE_SIGNAL_TO_DECISION = Object.freeze({
  SUPPORTS_TAKE: 'TAKE',
  SUPPORTS_SELL: 'SELL',
  SUPPORTS_GIVE_AWAY: 'GIVE_AWAY',
  SUPPORTS_DISCARD: 'DISCARD',
})

function candidateDecisions(decisionType, evidence, takeAllowed) {
  const mapping = decisionType === AgentDecisionType.PURCHASE ? PURCHASE_SIGNAL_TO_DECISION : MOVE_SIGNAL_TO_DECISION
  const candidates = []
  for (const { signal } of evidence) {
    const decision = mapping[signal]
    if (!decision || candidates.includes(decision)) continue
    if (decision === 'TAKE' && takeAllowed === false) continue
    candidates.push(decision)
  }

  // AGAINST_TAKE means that TAKE is burdened, but does not identify a
  // concrete disposition. In the presence of TAKE evidence, WAIT is the
  // only additional candidate that can be reasoned about safely.
  if (decisionType === AgentDecisionType.MOVE && takeAllowed !== false && candidates.includes('TAKE') && !candidates.some((decision) => ['SELL', 'GIVE_AWAY', 'DISCARD'].includes(decision)) && evidence.some(({ signal }) => signal === 'AGAINST_TAKE')) {
    candidates.push('WAIT')
  }
  return candidates
}

export function buildAgentInput({ decisionInput = {}, hardRuleResult = {}, evidence = [], modifiers = [], resolverResult = {} } = {}) {
  const decisionType = decisionInput.decisionType === AgentDecisionType.MOVE ? AgentDecisionType.MOVE : AgentDecisionType.PURCHASE
  const takeAllowed = decisionType === AgentDecisionType.MOVE
    ? (hardRuleResult.takeAllowed ?? resolverResult.takeAllowed ?? (hardRuleResult.outcome === 'EXCLUDE_TAKE' ? false : null))
    : null
  const allowedDecisions = candidateDecisions(decisionType, evidence, takeAllowed)
  return {
    schemaVersion: AgentInputSchemaVersion,
    decisionType,
    candidateId: decisionInput.furniture?.id ?? null,
    allowedDecisions,
    relevantFacts: relevantFactsFromInput(decisionInput, evidence),
    hardConstraints: {
      triggeredRules: clone(hardRuleResult.triggeredRules ?? []),
      takeAllowed,
      sentimentalProtection: hardRuleResult.sentimentalProtection === true,
    },
    evidence: clone(evidence),
    preferenceModifiers: clone(modifiers),
    conflictSummary: clone(resolverResult.conflictSummary ?? { hasDirectionConflict: false, hasPreferenceConflict: false, conflictingRuleIds: [] }),
    userProfile: clone(decisionInput.userProfile ?? {}),
    unresolvedContext: {
      resolutionStatus: resolverResult.resolutionStatus ?? null,
      needsAgentReasoning: resolverResult.needsAgentReasoning === true,
      unresolvedReason: resolverResult.unresolvedReason ?? null,
    },
  }
}

export function validateAgentInput(input) {
  const errors = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['input must be an object'] }
  if (input.schemaVersion !== AgentInputSchemaVersion) errors.push('schemaVersion must be furniture-agent-conflict-v0.3.1')
  if (!Object.values(AgentDecisionType).includes(input.decisionType)) errors.push('decisionType must be PURCHASE or MOVE')
  if (!Array.isArray(input.allowedDecisions) || input.allowedDecisions.length === 0) errors.push('allowedDecisions must be non-empty')
  if (!input.hardConstraints || typeof input.hardConstraints !== 'object') errors.push('hardConstraints must be an object')
  if (!Array.isArray(input.evidence)) errors.push('evidence must be an array')
  if (!Array.isArray(input.preferenceModifiers)) errors.push('preferenceModifiers must be an array')
  if (!input.unresolvedContext || input.unresolvedContext.resolutionStatus !== 'NEEDS_AGENT' || input.unresolvedContext.needsAgentReasoning !== true) errors.push('Agent input requires NEEDS_AGENT with needsAgentReasoning=true')
  if (input.decisionType === AgentDecisionType.MOVE && input.hardConstraints?.takeAllowed === false && input.allowedDecisions?.includes('TAKE')) errors.push('TAKE is forbidden when takeAllowed is false')
  return { valid: errors.length === 0, errors }
}
