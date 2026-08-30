import { buildAgentInput } from '../agent/buildAgentInput.js'
import { validateAgentOutput } from '../agent/validateAgentOutput.js'
import { buildPurchaseDecisionInput } from '../adapters/purchaseDecisionAdapter.js'
import { applyPurchasePreferenceWeighting } from '../preferences/purchasePreferenceWeighting.js'
import { resolvePurchaseDecision } from '../resolver/purchaseDecisionResolver.js'
import { collectPurchaseEvidence } from './collectPurchaseEvidence.js'
import { findPurchaseCriticalMissing } from './purchaseCriticalMissing.js'
import { evaluatePurchaseHardRules } from './purchaseHardRules.js'
import { validatePurchaseDecisionInput } from './purchaseInputSchema.js'

export function isPurchaseDecisionCandidate(furniture) {
  return furniture?.ownership?.type === 'NONE' && furniture?.lifecycle?.status === 'WISHLIST'
}

export function preparePurchaseDecision(context = {}) {
  if (!isPurchaseDecisionCandidate(context.furniture)) return { status: 'INELIGIBLE', input: null, missingInformation: [], evidence: [], resolverResult: null }
  const { input, diagnostics } = buildPurchaseDecisionInput(context)
  const validation = validatePurchaseDecisionInput(input)
  if (!validation.valid) return { status: 'INVALID_INPUT', input, diagnostics, validation, missingInformation: [], evidence: [], resolverResult: null }
  const missingInformation = findPurchaseCriticalMissing(input)
  const hardRuleResult = evaluatePurchaseHardRules(input)
  if (missingInformation.length > 0 || hardRuleResult.outcome === 'UNKNOWN') return { status: 'MISSING_INFORMATION', input, diagnostics, validation, missingInformation, hardRuleResult, evidence: [], modifiers: [], resolverResult: null }
  const collected = collectPurchaseEvidence(input)
  const weighted = applyPurchasePreferenceWeighting({ evidence: collected.evidence, userProfile: input.userProfile })
  const resolverResult = resolvePurchaseDecision({ hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers })
  const status = resolverResult.resolutionStatus === 'RESOLVED' ? 'RESOLVED' : resolverResult.resolutionStatus === 'NEEDS_AGENT' ? 'NEEDS_AGENT' : 'INSUFFICIENT_EVIDENCE'
  return { status, input, diagnostics, validation, missingInformation: [], hardRuleResult, evidence: weighted.evidence, modifiers: weighted.modifiers, evidenceDiagnostics: collected.diagnostics, resolverResult }
}

export async function requestPurchaseAgentDecision(prepared, { fetchImpl = fetch } = {}) {
  if (prepared?.status !== 'NEEDS_AGENT') return { ok: false, error: { code: 'AGENT_NOT_REQUIRED' } }
  const agentInput = buildAgentInput({ decisionInput: prepared.input, hardRuleResult: prepared.hardRuleResult, evidence: prepared.evidence, modifiers: prepared.modifiers, resolverResult: prepared.resolverResult })
  try {
    const response = await fetchImpl('/api/decision/agent-reason', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentInput) })
    if (!response.ok) return { ok: false, error: { code: 'AGENT_REQUEST_FAILED', status: response.status } }
    const output = await response.json()
    const validation = validateAgentOutput(output, agentInput)
    if (!validation.valid) return { ok: false, error: { code: 'INVALID_AGENT_OUTPUT', details: validation.errors } }
    return { ok: true, output, agentInput }
  } catch (error) {
    return { ok: false, error: { code: 'AGENT_REQUEST_FAILED', message: error instanceof Error ? error.message : String(error) } }
  }
}

export async function runPurchaseDecision(context = {}, options = {}) {
  const prepared = preparePurchaseDecision(context)
  if (prepared.status !== 'NEEDS_AGENT') return prepared
  const agent = await requestPurchaseAgentDecision(prepared, options)
  return agent.ok ? { ...prepared, status: 'RESOLVED', agentOutput: agent.output } : { ...prepared, status: 'AGENT_FAILED', agentError: agent.error }
}
