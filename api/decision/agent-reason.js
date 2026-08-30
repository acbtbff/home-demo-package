import { validateAgentInput } from '../../src/decision/agent/buildAgentInput.js'
import { CONFLICT_REASONER_SYSTEM_INSTRUCTION } from '../../src/decision/agent/conflictReasonerPrompt.js'
import { validateAgentOutput } from '../../src/decision/agent/validateAgentOutput.js'
import { createOpenAINextDecisionProvider, OpenAIProviderError } from '../../server/openaiNextDecisionProvider.mjs'

const statusForCode = (code) => ({
  PROVIDER_CONFIG_ERROR: 503,
  PROVIDER_AUTH_ERROR: 502,
  PROVIDER_RATE_LIMIT: 429,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  INVALID_AGENT_OUTPUT: 502,
  AGENT_NOT_REQUIRED: 409,
  INVALID_AGENT_INPUT: 400,
}[code] ?? 502)

function send(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8')
  return res.json(body)
}

export async function handleAgentReason(req, res, { providerFactory = createOpenAINextDecisionProvider } = {}) {
  if (req.method !== 'POST') return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } })
  let payload = req.body
  if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
    try { payload = JSON.parse(payload.toString()) } catch { return send(res, 400, { error: { code: 'INVALID_AGENT_INPUT' } }) }
  }
  const agentInput = payload?.agentInput
  const inputValidation = validateAgentInput(agentInput, { requireNeedsAgent: false })
  if (!inputValidation.valid) return send(res, 400, { error: { code: 'INVALID_AGENT_INPUT', details: inputValidation.errors } })
  if (agentInput.unresolvedContext.resolutionStatus !== 'NEEDS_AGENT' || agentInput.unresolvedContext.needsAgentReasoning !== true || agentInput.allowedDecisions.length < 2) {
    return send(res, 409, { error: { code: 'AGENT_NOT_REQUIRED' } })
  }

  try {
    const provider = providerFactory()
    const output = await provider.generateStructuredDecision({
      systemInstruction: CONFLICT_REASONER_SYSTEM_INSTRUCTION,
      input: agentInput,
      outputSchema: 'furniture-agent-output-v0.3.1',
    })
    const outputValidation = validateAgentOutput(output, agentInput)
    if (!outputValidation.valid) {
      return send(res, 502, { error: { code: 'INVALID_AGENT_OUTPUT', details: outputValidation.errors }, validationIssues: outputValidation.issues ?? [] })
    }
    return send(res, 200, output)
  } catch (error) {
    const code = error instanceof OpenAIProviderError ? error.code : (error?.code || 'PROVIDER_UNAVAILABLE')
    const body = { error: { code } }
    if (error instanceof OpenAIProviderError) body.capabilities = { responsesApi: error.apiMode === 'responses', structuredOutputs: error.structuredOutputs }
    return send(res, statusForCode(code), body)
  }
}

export default async function handler(req, res) {
  return handleAgentReason(req, res)
}
