import { assertAgentProvider } from './agentProvider.js'
import { CONFLICT_REASONER_SYSTEM_INSTRUCTION } from './conflictReasonerPrompt.js'
import { validateAgentInput } from './buildAgentInput.js'
import { validateAgentOutput } from './validateAgentOutput.js'

export async function reasonConflict({ agentInput, provider } = {}) {
  const routingStatus = agentInput?.unresolvedContext?.resolutionStatus
  if (routingStatus === 'RESOLVED') return { ok: false, error: { code: 'AGENT_NOT_REQUIRED' } }
  if (routingStatus === 'INSUFFICIENT_EVIDENCE') return { ok: false, error: { code: 'INSUFFICIENT_EVIDENCE' } }
  if (routingStatus === 'NEEDS_AGENT' && (!Array.isArray(agentInput?.allowedDecisions) || agentInput.allowedDecisions.length < 2)) return { ok: false, error: { code: 'AGENT_NOT_REQUIRED', details: ['at least two candidate decisions are required'] } }
  const inputValidation = validateAgentInput(agentInput)
  if (!inputValidation.valid) return { ok: false, error: { code: 'INVALID_AGENT_INPUT', details: inputValidation.errors } }
  if (agentInput.unresolvedContext.resolutionStatus !== 'NEEDS_AGENT' || agentInput.unresolvedContext.needsAgentReasoning !== true) return { ok: false, error: { code: 'AGENT_NOT_REQUIRED' } }
  let output
  try {
    assertAgentProvider(provider)
    output = await provider.generateStructuredDecision({ systemInstruction: CONFLICT_REASONER_SYSTEM_INSTRUCTION, input: structuredClone(agentInput), outputSchema: 'furniture-agent-output-v0.3.1' })
  } catch (error) {
    return { ok: false, error: { code: 'PROVIDER_ERROR', message: error?.message ?? 'Provider failed' } }
  }
  const outputValidation = validateAgentOutput(output, agentInput)
  if (!outputValidation.valid) return { ok: false, error: { code: 'INVALID_AGENT_OUTPUT', details: outputValidation.errors, validationIssues: outputValidation.issues } }
  return { ok: true, result: structuredClone(output) }
}
