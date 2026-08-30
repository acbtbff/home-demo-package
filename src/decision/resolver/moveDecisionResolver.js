import { detectModifierConflicts } from './modifierConflictDetector.js'
import { MoveAllowedDecisions, ResolutionSource, ResolutionStatus } from './resolutionTypes.js'

const CORE_TAKE_RULES = new Set(['M_SR01_HIGH_CONTINUED_USE', 'M_SR07_LONG_TERM_FUTURE_USE', 'M_SR11_HIGH_FUTURE_REUSE', 'M_SR12_LOW_USAGE_EMERGENCY_VALUE'])
const NON_TAKE_SIGNALS = new Set(['AGAINST_TAKE', 'SUPPORTS_SELL', 'SUPPORTS_GIVE_AWAY', 'SUPPORTS_DISCARD'])
const dispositionSignals = new Set(['SUPPORTS_SELL', 'SUPPORTS_GIVE_AWAY', 'SUPPORTS_DISCARD'])
const dispositionDecisions = new Map([
  ['SUPPORTS_SELL', 'SELL'],
  ['SUPPORTS_GIVE_AWAY', 'GIVE_AWAY'],
  ['SUPPORTS_DISCARD', 'DISCARD'],
])

function result({ resolutionStatus, decision = null, takeAllowed = null, needsAgentReasoning = false, source, activeSignals = [], conflictSummary, sentimentalProtection = false, rationaleRuleIds = [], unresolvedReason = null }) {
  return { resolutionStatus, decision, takeAllowed, allowedDecisions: [...MoveAllowedDecisions], needsAgentReasoning, source, activeSignals, conflictSummary, sentimentalProtection, rationaleRuleIds, unresolvedReason }
}

export function resolveMoveDecision({ hardRuleResult = {}, evidence = [], modifiers = [] } = {}) {
  // Protection is a Phase 3 Hard Rule boundary. M_SR06 is only Soft Evidence
  // and must never recreate or restore that boundary.
  const sentimentalProtection = hardRuleResult.sentimentalProtection === true
  const signals = [...new Set(evidence.map(({ signal }) => signal))]
  const dispositionSignalCount = signals.filter((signal) => dispositionSignals.has(signal)).length
  const directionConflict = (signals.includes('SUPPORTS_TAKE') && signals.some((signal) => NON_TAKE_SIGNALS.has(signal))) || dispositionSignalCount > 1
  const modifierConflictResult = detectModifierConflicts(modifiers)
  const relevantRuleIds = new Set(evidence.map(({ ruleId }) => ruleId))
  const preferenceConflictIds = modifierConflictResult.conflicts.filter(({ targetRuleId }) => relevantRuleIds.has(targetRuleId)).map(({ targetRuleId }) => targetRuleId)
  const conflictSummary = { hasDirectionConflict: directionConflict, hasPreferenceConflict: preferenceConflictIds.length > 0, conflictingRuleIds: [...new Set([...evidence.filter(({ signal }) => NON_TAKE_SIGNALS.has(signal) || signal === 'SUPPORTS_TAKE').map(({ ruleId }) => ruleId), ...preferenceConflictIds])] }

  if (hardRuleResult.outcome === 'WAIT') return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'WAIT', takeAllowed: null, source: ResolutionSource.HARD_RULE, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: (hardRuleResult.triggeredRules ?? []).map(({ id }) => id), unresolvedReason: null })

  const takeExcluded = hardRuleResult.outcome === 'EXCLUDE_TAKE' || hardRuleResult.takeAllowed === false
  if (takeExcluded) {
    const dispositions = evidence.filter(({ signal }) => dispositionSignals.has(signal))
    const distinctDispositions = [...new Set(dispositions.map(({ signal }) => dispositionDecisions.get(signal)))]
    if (distinctDispositions.length === 0) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, takeAllowed: false, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: [...(hardRuleResult.triggeredRules ?? []).map(({ id }) => id), ...evidence.map(({ ruleId }) => ruleId)], unresolvedReason: 'NON_TAKE_DISPOSITION_EVIDENCE_INSUFFICIENT' })
    if (distinctDispositions.length === 1 && !sentimentalProtection && preferenceConflictIds.length > 0) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, takeAllowed: false, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'INSUFFICIENT_SOFT_EVIDENCE' })
    if (distinctDispositions.length === 1 && !sentimentalProtection && !preferenceConflictIds.length) {
      const dispositionEvidence = dispositions.filter(({ signal }) => dispositionDecisions.get(signal) === distinctDispositions[0])
      return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: distinctDispositions[0], takeAllowed: false, source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: [...(hardRuleResult.triggeredRules ?? []).map(({ id }) => id), ...dispositionEvidence.map(({ ruleId }) => ruleId)] })
    }
    if (distinctDispositions.length > 1) return result({ resolutionStatus: ResolutionStatus.NEEDS_AGENT, takeAllowed: false, needsAgentReasoning: true, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: [...(hardRuleResult.triggeredRules ?? []).map(({ id }) => id), ...evidence.map(({ ruleId }) => ruleId)], unresolvedReason: 'NON_TAKE_DISPOSITION_REQUIRES_REASONING' })
    return result({ resolutionStatus: ResolutionStatus.NEEDS_AGENT, takeAllowed: false, needsAgentReasoning: true, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: [...(hardRuleResult.triggeredRules ?? []).map(({ id }) => id), ...evidence.map(({ ruleId }) => ruleId)], unresolvedReason: sentimentalProtection ? 'SENTIMENTAL_PROTECTION_CONFLICT' : 'NON_TAKE_DISPOSITION_REQUIRES_REASONING' })
  }

  const candidateDirections = new Set(evidence.map(({ signal }) => {
    if (signal === 'SUPPORTS_TAKE') return 'TAKE'
    if (signal === 'SUPPORTS_SELL') return 'SELL'
    if (signal === 'SUPPORTS_GIVE_AWAY') return 'GIVE_AWAY'
    if (signal === 'SUPPORTS_DISCARD') return 'DISCARD'
    return null
  }).filter(Boolean))
  if (candidateDirections.has('TAKE') && ![...candidateDirections].some((decision) => ['SELL', 'GIVE_AWAY', 'DISCARD'].includes(decision)) && evidence.some(({ signal }) => signal === 'AGAINST_TAKE')) candidateDirections.add('WAIT')
  if (directionConflict || preferenceConflictIds.length > 0) {
    if (candidateDirections.size < 2) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'INSUFFICIENT_SOFT_EVIDENCE' })
    return result({ resolutionStatus: ResolutionStatus.NEEDS_AGENT, needsAgentReasoning: true, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: directionConflict ? 'MATERIAL_DIRECTION_CONFLICT' : 'MATERIAL_PREFERENCE_CONFLICT' })
  }
  const coreTake = evidence.filter(({ ruleId, signal }) => CORE_TAKE_RULES.has(ruleId) && signal === 'SUPPORTS_TAKE')
  const againstTake = evidence.some(({ signal }) => signal === 'AGAINST_TAKE')
  if (coreTake.length > 0 && !againstTake && !evidence.some(({ signal }) => dispositionSignals.has(signal))) {
    const dampened = coreTake.every(({ ruleId }) => modifiers.some(({ targetRuleId, effect }) => targetRuleId === ruleId && effect === 'DAMPEN'))
    if (dampened) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: coreTake.map(({ ruleId }) => ruleId), unresolvedReason: 'CORE_EVIDENCE_DAMPENED' })
    return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: 'TAKE', takeAllowed: true, source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId) })
  }
  for (const signal of dispositionSignals) {
    const dispositionEvidence = evidence.filter((item) => item.signal === signal)
    if (dispositionEvidence.length > 0 && !sentimentalProtection) return result({ resolutionStatus: ResolutionStatus.RESOLVED, decision: dispositionDecisions.get(signal), takeAllowed: true, source: ResolutionSource.DETERMINISTIC_EVIDENCE, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId) })
  }
  if (againstTake) return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'NON_TAKE_DISPOSITION_EVIDENCE_INSUFFICIENT' })
  return result({ resolutionStatus: ResolutionStatus.INSUFFICIENT_EVIDENCE, source: ResolutionSource.UNRESOLVED, activeSignals: signals, conflictSummary, sentimentalProtection, rationaleRuleIds: evidence.map(({ ruleId }) => ruleId), unresolvedReason: 'INSUFFICIENT_SOFT_EVIDENCE' })
}
