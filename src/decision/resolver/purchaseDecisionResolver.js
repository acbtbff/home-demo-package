import { detectModifierConflicts } from './modifierConflictDetector.js'
import { ResolutionSource, ResolutionStatus } from './resolutionTypes.js'

const CORE_BUY_RULES = new Set(['P_SR01_HIGH_CONTINUED_USE', 'P_SR04_REPEATED_FRICTION'])
const SUBSTANTIVE_AGAINST_BUY_RULES = new Set(['P_SR03_ADEQUATE_SUBSTITUTE', 'P_SR05_SPACE_COST', 'P_SR06_BUDGET_PRESSURE'])

function emptyConflictSummary() {
  return { hasDirectionConflict: false, hasPreferenceConflict: false, conflictingRuleIds: [] }
}

function result({ resolutionStatus, decision = null, needsAgentReasoning = false, source, activeSignals = [], conflictSummary = emptyConflictSummary(), rationaleRuleIds = [], unresolvedReason = null }) {
  return { resolutionStatus, decision, needsAgentReasoning, source, activeSignals, conflictSummary, rationaleRuleIds, unresolvedReason }
}

function directionSummary(evidence) {
  const signals = [...new Set(evidence.map(({ signal }) => signal))]
  return { signals, conflict: signals.length > 1 }
}

export function resolvePurchaseDecision({ hardRuleResult = {}, evidence = [], modifiers = [] } = {}) {
  if (hardRuleResult.outcome === 'DONT_BUY') {
    return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'DONT_BUY', source: ResolutionSource.HARD_RULE, rationaleRuleIds: (hardRuleResult.triggeredRules ?? []).map(({ id }) => id) })
  }
  if (hardRuleResult.outcome === 'UNKNOWN') {
    return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'UNKNOWN', source: ResolutionSource.HARD_RULE, rationaleRuleIds: (hardRuleResult.triggeredRules ?? []).map(({ id }) => id), unresolvedReason: 'CRITICAL_INFORMATION_MISSING' })
  }

  const { signals, conflict } = directionSummary(evidence)
  const modifierConflict = detectModifierConflicts(modifiers)
  const relevantRuleIds = new Set(evidence.map(({ ruleId }) => ruleId))
  const preferenceConflict = modifierConflict.conflicts.filter(({ targetRuleId }) => relevantRuleIds.has(targetRuleId))
  const conflictSummary = { hasDirectionConflict: conflict, hasPreferenceConflict: preferenceConflict.length > 0, conflictingRuleIds: [...new Set([...evidence.filter(({ signal }) => signals.includes(signal)).map(({ ruleId }) => ruleId), ...preferenceConflict.map(({ targetRuleId }) => targetRuleId)])] }
  if (conflict || preferenceConflict.length > 0) {
    const candidateDirections = new Set(signals.map((signal) => ({ SUPPORTS_BUY: 'BUY', AGAINST_BUY: 'DONT_BUY', SUPPORTS_WAIT: 'WAIT' }[signal])).filter(Boolean))
    if (candidateDirections.size < 2) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'INSUFFICIENT_SOFT_EVIDENCE' })
    return result({ resolutionStatus: ResolutionStatus.NEEDS_AGENT, needsAgentReasoning: true, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: conflict ? 'MATERIAL_DIRECTION_CONFLICT' : 'MATERIAL_PREFERENCE_CONFLICT' })
  }

  const coreBuy = evidence.filter(({ ruleId, signal }) => CORE_BUY_RULES.has(ruleId) && signal === 'SUPPORTS_BUY')
  const againstBuy = evidence.filter(({ ruleId, signal }) => SUBSTANTIVE_AGAINST_BUY_RULES.has(ruleId) && signal === 'AGAINST_BUY')
  const waits = evidence.filter(({ signal }) => signal === 'SUPPORTS_WAIT')
  if (coreBuy.length > 0) {
    const dampenedCore = coreBuy.every(({ ruleId }) => modifiers.some(({ targetRuleId, effect }) => targetRuleId === ruleId && effect === 'DAMPEN'))
    if (dampenedCore) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, needsAgentReasoning: false, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, rationaleRuleIds: coreBuy.map(({ ruleId }) => ruleId), unresolvedReason: 'CORE_EVIDENCE_DAMPENED' })
    return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'BUY', source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId) })
  }
  if (againstBuy.length > 0) return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'DONT_BUY', source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId) })
  if (waits.length > 0) return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'WAIT', source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId) })
  return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'INSUFFICIENT_SOFT_EVIDENCE' })
}
