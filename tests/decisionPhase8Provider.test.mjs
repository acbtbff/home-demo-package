import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpenAINextDecisionProvider } from '../server/openaiNextDecisionProvider.mjs'

const input = { schemaVersion: 'furniture-agent-conflict-v0.3.1', decisionType: 'MOVE', allowedDecisions: ['TAKE', 'SELL'], evidence: [] }

test('OpenAI Next provider uses configured Chat Completions transport', async () => {
  let request
  const provider = createOpenAINextDecisionProvider({ env: { OPENAI_NEXT_API_KEY: 'test-key', OPENAI_NEXT_BASE_URL: 'https://example.test/v1', OPENAI_NEXT_MODEL: 'gpt-5.4-mini', OPENAI_NEXT_API_MODE: 'chat_completions' }, fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ decision: 'SELL' }) } }] }) } } })
  const result = await provider.generateStructuredDecision({ systemInstruction: 'system', input })
  assert.equal(request.url, 'https://example.test/v1/chat/completions')
  assert.equal(JSON.parse(request.options.body).model, 'gpt-5.4-mini')
  assert.equal(result.decision, 'SELL')
})

test('OpenAI Next provider fails closed without API key', async () => {
  const provider = createOpenAINextDecisionProvider({ env: {}, fetchImpl: async () => { throw new Error('must not call') } })
  await assert.rejects(() => provider.generateStructuredDecision({ systemInstruction: 'system', input }), (error) => error.code === 'PROVIDER_CONFIG_ERROR')
})

test('OpenAI Next provider maps auth errors without exposing upstream payload', async () => {
  const provider = createOpenAINextDecisionProvider({ env: { OPENAI_NEXT_API_KEY: 'test-key' }, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'secret upstream detail' } }) }) })
  await assert.rejects(() => provider.generateStructuredDecision({ systemInstruction: 'system', input }), (error) => error.code === 'PROVIDER_AUTH_ERROR' && !error.message.includes('secret'))
})
