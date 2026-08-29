import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpenAINextDecisionProvider } from '../server/openaiNextDecisionProvider.mjs'

const input = {
  schemaVersion: 'furniture-agent-conflict-v0.3.1',
  decisionType: 'MOVE',
  allowedDecisions: ['TAKE', 'SELL'],
  evidence: [],
}

test('OpenAI Next provider uses Chat Completions with dynamic candidates in the user-selected transport', async () => {
  let request
  const provider = createOpenAINextDecisionProvider({
    env: { OPENAI_NEXT_API_KEY: 'test-key', OPENAI_NEXT_BASE_URL: 'https://example.test/v1', OPENAI_NEXT_MODEL: 'openai/gpt-5.5-mini', OPENAI_NEXT_API_MODE: 'chat_completions' },
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, async json() { return { choices: [{ message: { content: JSON.stringify({ decision: 'SELL', confidence: 'MEDIUM', primaryReasonRuleIds: [], tradeoffRuleIds: [], primaryReasons: [], tradeoffs: [], missingInformation: [], nextAction: 'x' }) } }] } } }
    },
  })
  const result = await provider.generateStructuredDecision({ systemInstruction: 'system', input, outputSchema: 'furniture-agent-output-v0.3.1' })
  const body = JSON.parse(request.options.body)
  assert.equal(request.url, 'https://example.test/v1/chat/completions')
  assert.equal(request.options.method, 'POST')
  assert.equal(body.model, 'openai/gpt-5.5-mini')
  assert.equal(body.messages[0].role, 'system')
  assert.match(body.messages[0].content, /ONLY return one valid JSON object/)
  assert.equal(body.messages[1].role, 'user')
  assert.equal(body.response_format, undefined)
  assert.equal(body.tools, undefined)
  assert.equal(result.decision, 'SELL')
})

test('OpenAI Next provider preserves Responses transport when explicitly selected', async () => {
  let request
  const provider = createOpenAINextDecisionProvider({
    env: { OPENAI_NEXT_API_KEY: 'test-key', OPENAI_NEXT_BASE_URL: 'https://example.test/v1', OPENAI_NEXT_MODEL: 'openai/gpt-5.5-mini', OPENAI_NEXT_API_MODE: 'responses' },
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, async json() { return { output_text: JSON.stringify({ decision: 'TAKE', confidence: 'LOW', primaryReasonRuleIds: [], tradeoffRuleIds: [], primaryReasons: [], tradeoffs: [], missingInformation: [], nextAction: 'x' }) } } }
    },
  })
  await provider.generateStructuredDecision({ systemInstruction: 'system', input })
  const body = JSON.parse(request.options.body)
  assert.equal(request.url, 'https://example.test/v1/responses')
  assert.equal(body.instructions, 'system')
  assert.equal(body.text.format.type, 'json_schema')
  assert.deepEqual(body.text.format.schema.properties.decision.enum, ['TAKE', 'SELL'])
})

test('OpenAI Next provider fails closed when server configuration is missing', async () => {
  const provider = createOpenAINextDecisionProvider({ env: {}, fetchImpl: async () => { throw new Error('must not call') } })
  await assert.rejects(() => provider.generateStructuredDecision({ systemInstruction: 'system', input }), (error) => error.code === 'PROVIDER_CONFIG_ERROR')
})

test('OpenAI Next provider maps upstream auth errors without exposing raw payload', async () => {
  const provider = createOpenAINextDecisionProvider({
    env: { OPENAI_NEXT_API_KEY: 'test-key', OPENAI_NEXT_API_MODE: 'chat_completions' },
    fetchImpl: async () => ({ ok: false, status: 401, async json() { return { error: { message: 'secret upstream detail' } } } }),
  })
  await assert.rejects(() => provider.generateStructuredDecision({ systemInstruction: 'system', input }), (error) => error.code === 'PROVIDER_AUTH_ERROR' && error.status === 401 && !error.message.includes('secret'))
})
