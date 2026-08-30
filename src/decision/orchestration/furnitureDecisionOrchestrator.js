import { buildMoveDecisionInput } from '../adapters/moveDecisionAdapter.js'
import { buildPurchaseDecisionInput } from '../adapters/purchaseDecisionAdapter.js'
import { buildAgentInput } from '../agent/buildAgentInput.js'
import { reasonConflict } from '../agent/conflictReasoner.js'
import { collectMoveEvidence } from '../move/collectMoveEvidence.js'
import { evaluateMoveHardRules } from '../move/moveHardRules.js'
import { applyMovePreferenceWeighting } from '../preferences/movePreferenceWeighting.js'
import { applyPurchasePreferenceWeighting } from '../preferences/purchasePreferenceWeighting.js'
import { collectPurchaseEvidence } from '../purchase/collectPurchaseEvidence.js'
import { evaluatePurchaseHardRules } from '../purchase/purchaseHardRules.js'
import { resolveMoveDecision } from '../resolver/moveDecisionResolver.js'
import { resolvePurchaseDecision } from '../resolver/purchaseDecisionResolver.js'
import { ResolutionStatus } from '../resolver/resolutionTypes.js'

export const FinalDecisionSource = Object.freeze({
  HARD_RULE: 'HARD_RULE',
  DETERMINISTIC_RESOLVER: 'DETERMINISTIC_RESOLVER',
  AGENT: 'AGENT',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  INELIGIBLE: 'INELIGIBLE',
  INVALID_INPUT: 'INVALID_INPUT',
  AGENT_ERROR: 'AGENT_ERROR',
})

function sourceForResolver(resolverResult) {
  if (resolverResult.resolutionStatus === ResolutionStatus.INSUFFICIENT_EVIDENCE) return FinalDecisionSource.INSUFFICIENT_EVIDENCE
  return resolverResult.source === 'HARD_RULE' ? FinalDecisionSource.HARD_RULE : FinalDecisionSource.DETERMINISTIC_RESOLVER
}

function finalResult({ decisionType, candidateId, resolverResult, hardRuleResult, evidence, modifiers, adapterDiagnostics, evidenceDiagnostics, preferenceDiagnostics, agentResult = null, agentCalled = false, source, eligibility = null }) {
  return {
    schemaVersion: 'furniture-final-decision-v0.1.0',
    decisionType,
    candidateId: candidateId ?? null,
    resolutionStatus: resolverResult?.resolutionStatus ?? (eligibility?.eligible === false ? 'INELIGIBLE' : 'INVALID_INPUT'),
    decision: agentResult?.decision ?? resolverResult?.decision ?? null,
    confidence: agentResult?.confidence ?? null,
    source,
    agentCalled,
    rationaleRuleIds: agentResult?.primaryReasonRuleIds ?? resolverResult?.rationaleRuleIds ?? [],
    missingInformation: agentResult?.missingInformation ?? hardRuleResult?.missingInformation ?? [],
    nextAction: agentResult?.nextAction ?? null,
    unresolvedReason: resolverResult?.unresolvedReason ?? eligibility?.reason ?? null,
    hardRuleResult: hardRuleResult ?? null,
    activeEvidence: evidence ?? [],
    preferenceModifiers: modifiers ?? [],
    agentResult,
    eligibility,
    diagnostics: {
      adapter: adapterDiagnostics ?? null,
      evidence: evidenceDiagnostics ?? null,
      preferences: preferenceDiagnostics ?? null,
    },
  }
}

async function finishWithOptionalAgent({ decisionType, decisionInput, hardRuleResult, evidence, modifiers, resolverResult, agentProvider, adapterDiagnostics, evidenceDiagnostics, preferenceDiagnostics }) {
  if (resolverResult.resolutionStatus !== ResolutionStatus.NEEDS_AGENT || resolverResult.needsAgentReasoning !== true) {
    return finalResult({ decisionType, candidateId: decisionInput.furniture?.id, resolverResult, hardRuleResult, evidence, modifiers, adapterDiagnostics, evidenceDiagnostics, preferenceDiagnostics, source: sourceForResolver(resolverResult) })
  }

  const agentInput = buildAgentInput({ decisionInput, hardRuleResult, evidence, modifiers, resolverResult })
  const reasoned = await reasonConflict({ agentInput, provider: agentProvider })
  if (!reasoned.ok) {
    return {
      ...finalResult({ decisionType, candidateId: decisionInput.furniture?.id, resolverResult, hardRuleResult, evidence, modifiers, adapterDiagnostics, evidenceDiagnostics, preferenceDiagnostics, agentCalled: true, source: FinalDecisionSource.AGENT_ERROR }),
      agentError: reasoned.error,
    }
  }
  return finalResult({ decisionType, candidateId: decisionInput.furniture?.id, resolverResult: { ...resolverResult, resolutionStatus: ResolutionStatus.RESOLVED }, hardRuleResult, evidence, modifiers, adapterDiagnostics, evidenceDiagnostics, preferenceDiagnostics, agentResult: reasoned.result, agentCalled: true, source: FinalDecisionSource.AGENT })
}

export async function evaluatePurchaseDecision({ agentProvider, additionalEvidence = [], ...adapterInput } = {}) {
  const adapted = buildPurchaseDecisionInput(adapterInput)
  const hardRuleResult = evaluatePurchaseHardRules(adapted.input)
  const collected = collectPurchaseEvidence(adapted.input)
  const evidence = [...collected.evidence, ...structuredClone(additionalEvidence)]
  const weighted = applyPurchasePreferenceWeighting({ evidence, userProfile: adapted.input.userProfile })
  const resolverResult = resolvePurchaseDecision({ hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers })
  return finishWithOptionalAgent({ decisionType: 'PURCHASE', decisionInput: adapted.input, hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers, resolverResult, agentProvider, adapterDiagnostics: adapted.diagnostics, evidenceDiagnostics: collected.diagnostics, preferenceDiagnostics: weighted.diagnostics })
}

export async function evaluateMoveDecision({ agentProvider, additionalEvidence = [], ...adapterInput } = {}) {
  const adapted = buildMoveDecisionInput(adapterInput)
  if (!adapted.eligible) return finalResult({ decisionType: 'MOVE', candidateId: adapterInput.furniture?.id, eligibility: { eligible: false, reason: adapted.reason }, source: FinalDecisionSource.INELIGIBLE })
  const hardRuleResult = evaluateMoveHardRules(adapted.input)
  const collected = collectMoveEvidence(adapted.input)
  const evidence = [...collected.evidence, ...structuredClone(additionalEvidence)]
  const weighted = applyMovePreferenceWeighting({ evidence, userProfile: adapted.input.userProfile })
  const resolverResult = resolveMoveDecision({ hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers })
  return finishWithOptionalAgent({ decisionType: 'MOVE', decisionInput: adapted.input, hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers, resolverResult, agentProvider, adapterDiagnostics: adapted.diagnostics, evidenceDiagnostics: collected.diagnostics, preferenceDiagnostics: weighted.diagnostics })
}

export async function evaluateFurnitureDecision(input = {}) {
  if (input?.decisionType === 'PURCHASE') return evaluatePurchaseDecision(input)
  if (input?.decisionType === 'MOVE') return evaluateMoveDecision(input)
  return finalResult({ decisionType: input?.decisionType ?? null, candidateId: input?.furniture?.id, source: FinalDecisionSource.INVALID_INPUT })
}
