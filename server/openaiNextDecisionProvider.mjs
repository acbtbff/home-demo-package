const DEFAULT_BASE_URL = 'https://api.openai-next.com/v1'
const DEFAULT_MODEL = 'openai/gpt-5.5-mini'
const DEFAULT_API_MODE = 'chat_completions'
const API_MODES = new Set(['chat_completions', 'responses'])
const JSON_ONLY_INSTRUCTION = '\n\nONLY return one valid JSON object. No markdown. No code fences. No additional prose.'

export const AGENT_OUTPUT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    decision: { type: 'string' },
    confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    primaryReasonRuleIds: { type: 'array', items: { type: 'string' } },
    tradeoffRuleIds: { type: 'array', items: { type: 'string' } },
    primaryReasons: { type: 'array', items: { type: 'string' } },
    tradeoffs: { type: 'array', items: { type: 'string' } },
    missingInformation: { type: 'array', items: { type: 'string' } },
    nextAction: { type: 'string' },
  },
  required: ['decision', 'confidence', 'primaryReasonRuleIds', 'tradeoffRuleIds', 'primaryReasons', 'tradeoffs', 'missingInformation', 'nextAction'],
})

const KNOWN_ERROR_CODES = new Set([
  'PROVIDER_CONFIG_ERROR',
  'PROVIDER_AUTH_ERROR',
  'PROVIDER_RATE_LIMIT',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'INVALID_AGENT_OUTPUT',
  'UNKNOWN_PROVIDER_ERROR',
])

export class OpenAIProviderError extends Error {
  constructor(code, { status = null, structuredOutputs = null, apiMode = null } = {}) {
    super(code)
    this.name = 'OpenAIProviderError'
    this.code = KNOWN_ERROR_CODES.has(code) ? code : 'UNKNOWN_PROVIDER_ERROR'
    this.status = status
    this.structuredOutputs = structuredOutputs
    this.apiMode = apiMode
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string' && content.text.trim()) return content.text
    }
  }
  return null
}

function schemaForInput(input) {
  const allowedDecisions = Array.isArray(input?.allowedDecisions) ? input.allowedDecisions.filter((value) => typeof value === 'string') : []
  return {
    ...AGENT_OUTPUT_JSON_SCHEMA,
    properties: {
      ...AGENT_OUTPUT_JSON_SCHEMA.properties,
      decision: allowedDecisions.length > 0 ? { type: 'string', enum: allowedDecisions } : AGENT_OUTPUT_JSON_SCHEMA.properties.decision,
    },
  }
}

function providerEndpoint(baseUrl, apiMode) {
  const endpoint = apiMode === 'chat_completions' ? 'chat/completions' : 'responses'
  return `${String(baseUrl).replace(/\/+$/, '')}/${endpoint}`
}

export function createOpenAINextDecisionProvider({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
  return {
    async generateStructuredDecision({ systemInstruction, input } = {}) {
      const apiKey = env.OPENAI_NEXT_API_KEY
      const baseUrl = env.OPENAI_NEXT_BASE_URL || DEFAULT_BASE_URL
      const model = env.OPENAI_NEXT_MODEL || DEFAULT_MODEL
      const apiMode = env.OPENAI_NEXT_API_MODE || DEFAULT_API_MODE
      if (typeof apiKey !== 'string' || apiKey.trim() === '' || typeof baseUrl !== 'string' || baseUrl.trim() === '' || typeof model !== 'string' || model.trim() === '' || !API_MODES.has(apiMode)) {
        throw new OpenAIProviderError('PROVIDER_CONFIG_ERROR')
      }
      if (typeof fetchImpl !== 'function') throw new OpenAIProviderError('PROVIDER_CONFIG_ERROR')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      let response
      try {
        const requestBody = apiMode === 'chat_completions'
          ? {
            model,
            messages: [
              { role: 'system', content: `${systemInstruction || ''}${JSON_ONLY_INSTRUCTION}` },
              { role: 'user', content: JSON.stringify(input) },
            ],
          }
          : {
            model,
            instructions: systemInstruction,
            input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }],
            text: { format: { type: 'json_schema', name: 'furniture_agent_output', strict: true, schema: schemaForInput(input) } },
          }
        response = await fetchImpl(providerEndpoint(baseUrl, apiMode), {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        })
      } catch (error) {
        if (error?.name === 'AbortError') throw new OpenAIProviderError('PROVIDER_TIMEOUT')
        throw new OpenAIProviderError('PROVIDER_UNAVAILABLE')
      } finally {
        clearTimeout(timeout)
      }

      const payload = await response.json().catch(() => ({}))
      if (response.status === 401 || response.status === 403) throw new OpenAIProviderError('PROVIDER_AUTH_ERROR', { status: response.status, structuredOutputs: false, apiMode })
      if (response.status === 429) throw new OpenAIProviderError('PROVIDER_RATE_LIMIT', { status: response.status, structuredOutputs: null, apiMode })
      if (response.status >= 500) throw new OpenAIProviderError('PROVIDER_UNAVAILABLE', { status: response.status, structuredOutputs: null, apiMode })
      if (!response.ok) throw new OpenAIProviderError('UNKNOWN_PROVIDER_ERROR', { status: response.status, structuredOutputs: response.status === 400 ? false : null, apiMode })

      const text = apiMode === 'chat_completions'
        ? (typeof payload?.choices?.[0]?.message?.content === 'string'
          ? payload.choices[0].message.content
          : payload?.choices?.[0]?.message?.content?.find?.((part) => typeof part?.text === 'string')?.text || null)
        : extractOutputText(payload)
      if (!text) throw new OpenAIProviderError('INVALID_AGENT_OUTPUT', { status: response.status, structuredOutputs: apiMode === 'responses', apiMode })
      try {
        return JSON.parse(text)
      } catch {
        throw new OpenAIProviderError('INVALID_AGENT_OUTPUT', { status: response.status, structuredOutputs: apiMode === 'responses', apiMode })
      }
    },
  }
}

export const getOpenAINextDecisionProvider = createOpenAINextDecisionProvider
