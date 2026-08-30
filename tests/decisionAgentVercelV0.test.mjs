import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { handleAgentReason } from '../api/decision/agent-reason.js'
import { OpenAIProviderError } from '../server/openaiNextDecisionProvider.mjs'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { evaluateMoveDecision } from '../src/decision/orchestration/furnitureDecisionOrchestrator.js'
import { createHttpAgentProvider } from '../src/decision/agent/providers/httpAgentProvider.js'

const evidence = [
  { ruleId: 'M_TAKE', signal: 'SUPPORTS_TAKE', domain: 'MOVE', category: 'UTILITY', reason: 'continued use', evidencePaths: [] },
  { ruleId: 'M_WAIT', signal: 'AGAINST_TAKE', domain: 'MOVE', category: 'LOGISTICS', reason: 'moving burden', evidencePaths: [] },
]
const agentInput = {
  schemaVersion: 'furniture-agent-conflict-v0.3.1', decisionType: 'MOVE', candidateId: 'desk', allowedDecisions: ['TAKE', 'WAIT'], relevantFacts: {},
  hardConstraints: { triggeredRules: [], takeAllowed: true, sentimentalProtection: false }, evidence, preferenceModifiers: [],
  conflictSummary: { hasDirectionConflict: true, hasPreferenceConflict: false, conflictingRuleIds: ['M_TAKE', 'M_WAIT'] }, userProfile: {},
  unresolvedContext: { resolutionStatus: 'NEEDS_AGENT', needsAgentReasoning: true, unresolvedReason: 'MATERIAL_DIRECTION_CONFLICT' },
}
const validOutput = { decision: 'TAKE', confidence: 'MEDIUM', primaryReasonRuleIds: ['M_TAKE'], tradeoffRuleIds: ['M_WAIT'], primaryReasons: ['still useful'], tradeoffs: ['moving burden'], missingInformation: [], nextAction: 'plan transport' }

function responseRecorder() {
  return { statusCode: null, body: null, headers: {}, status(code) { this.statusCode = code; return this }, setHeader(key, value) { this.headers[key] = value; return this }, json(body) { this.body = body; return body } }
}

test('Vercel handler returns 400 for invalid input', async () => {
  const res = responseRecorder()
  await handleAgentReason({ method: 'POST', body: { agentInput: {} } }, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error.code, 'INVALID_AGENT_INPUT')
})

test('Vercel handler returns 409 when Agent is not required', async () => {
  const res = responseRecorder()
  await handleAgentReason({ method: 'POST', body: { agentInput: { ...agentInput, unresolvedContext: { resolutionStatus: 'RESOLVED', needsAgentReasoning: false } } } }, res)
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.error.code, 'AGENT_NOT_REQUIRED')
})

test('Vercel handler maps Provider errors and never creates a fallback decision', async () => {
  const res = responseRecorder()
  await handleAgentReason({ method: 'POST', body: { agentInput } }, res, { providerFactory: () => ({ generateStructuredDecision: async () => { throw new OpenAIProviderError('PROVIDER_RATE_LIMIT') } }) })
  assert.equal(res.statusCode, 429)
  assert.equal(res.body.error.code, 'PROVIDER_RATE_LIMIT')
  assert.equal(res.body.decision, undefined)
})

test('Vercel handler validates and returns valid Provider output', async () => {
  const res = responseRecorder()
  await handleAgentReason({ method: 'POST', body: { agentInput } }, res, { providerFactory: () => ({ generateStructuredDecision: async () => validOutput }) })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, validOutput)
})

const ownedDesk = createFurniture({ id: 'owned-desk', name: 'Desk', semantic: { category: 'TABLE', archetype: 'DESK' }, physical: { dimensionsM: { width: 1.4, depth: 0.7, height: 0.75 } }, ownership: { type: 'USER' }, lifecycle: { status: 'OWNED' } })

test('deterministic MOVE path does not request Provider', async () => {
  let calls = 0
  const result = await evaluateMoveDecision({ furniture: ownedDesk, userContext: { usageFrequency: 'HIGH', expectedFutureUse: 'HIGH', substituteAvailable: false, substituteAdequacy: 'LOW' }, agentProvider: { generateStructuredDecision: async () => { calls += 1 } } })
  assert.equal(result.decision, 'TAKE')
  assert.equal(result.agentCalled, false)
  assert.equal(calls, 0)
})

test('NEEDS_AGENT path requests only /api/decision/agent-reason once', async () => {
  let calls = 0
  const provider = createHttpAgentProvider({ fetchImpl: async (url, options) => { calls += 1; assert.equal(url, '/api/decision/agent-reason'); assert.equal(JSON.parse(options.body).agentInput.unresolvedContext.resolutionStatus, 'NEEDS_AGENT'); return { ok: true, status: 200, json: async () => validOutput } } })
  const result = await evaluateMoveDecision({ furniture: ownedDesk, additionalEvidence: evidence, agentProvider: provider })
  assert.equal(calls, 1)
  assert.equal(result.source, 'AGENT')
  assert.equal(result.decision, 'TAKE')
})

test('production routes and secret boundary remain explicit', async () => {
  const [vercel, app, room, furniture, bundleProvider] = await Promise.all([
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'), readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/RoomPage.jsx', import.meta.url), 'utf8'), readFile(new URL('../src/pages/FurniturePage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/decision/agent/providers/httpAgentProvider.js', import.meta.url), 'utf8'),
  ])
  assert.match(vercel, /\(\?!api\/\)/)
  assert.match(app, /\/room/); assert.match(app, /\/furniture/); assert.match(app, /\/floorplan/)
  assert.match(room, /selectedFurniture/); assert.ok(furniture.length > 0)
  assert.doesNotMatch(`${room}\n${furniture}\n${bundleProvider}`, /OPENAI_NEXT_API_KEY|Bearer\s/)
  assert.doesNotMatch(bundleProvider, /fake|mock|fallback/i)
})
