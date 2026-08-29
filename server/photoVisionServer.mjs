import http from 'node:http'
import { validatePhotoRoomDraft } from '../src/domain/photoRoomDraft.js'
import { validateFloorplanImageDraft } from '../src/domain/floorplanImageDraft.js'
import { FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA, FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT } from '../src/services/floorplanImagePrompt.js'
import { validateAgentInput } from '../src/decision/agent/buildAgentInput.js'
import { validateAgentOutput } from '../src/decision/agent/validateAgentOutput.js'
import { CONFLICT_REASONER_SYSTEM_INSTRUCTION } from '../src/decision/agent/conflictReasonerPrompt.js'
import { createOpenAINextDecisionProvider, OpenAIProviderError } from './openaiNextDecisionProvider.mjs'

try {
  process.loadEnvFile?.('.env')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const port = Number(process.env.PHOTO_VISION_PORT || 8787)
const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini'
const maxBodyBytes = 50 * 1024 * 1024

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(new Error('Request is too large (max 30 MB)'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function parseMultipart(body, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '')
  if (!boundaryMatch) throw new Error('multipart boundary is missing')
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`)
  const fields = {}
  const files = []
  let cursor = body.indexOf(boundary)
  while (cursor >= 0) {
    const partStart = cursor + boundary.length
    if (body[partStart] === 45 && body[partStart + 1] === 45) break
    const headerStart = partStart + 2
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd < 0) break
    const headers = body.subarray(headerStart, headerEnd).toString('utf8')
    const nextBoundary = body.indexOf(boundary, headerEnd + 4)
    if (nextBoundary < 0) break
    const content = body.subarray(headerEnd + 4, Math.max(headerEnd + 4, nextBoundary - 2))
    const disposition = /Content-Disposition:.*?name="([^"]+)"(?:; filename="([^"]*)")?/i.exec(headers)
    if (disposition) {
      const [, name, filename] = disposition
      if (filename !== undefined) {
        const type = /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1] || 'image/jpeg'
        files.push({ name, filename: filename || 'room-photo.jpg', type, data: content })
      } else fields[name] = content.toString('utf8')
    }
    cursor = nextBoundary
  }
  return { fields, files }
}

function parseJsonImages(body) {
  const payload = JSON.parse(body.toString('utf8'))
  const files = (payload.images || []).map((image, index) => {
    const match = /^data:([^;]+);base64,(.+)$/.exec(image.dataUrl || '')
    if (!match) throw new Error(`images[${index}] must be a base64 data URL`)
    return { name: 'images', filename: `room-photo-${index + 1}.jpg`, type: image.type || match[1], data: Buffer.from(match[2], 'base64') }
  })
  return { fields: { scaleAnchor: JSON.stringify(payload.scaleAnchor || {}), prompt: payload.prompt || 'Analyze this room.', responseSchema: JSON.stringify(payload.responseSchema || {}) }, files }
}

function jsonResponse(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' })
  response.end(JSON.stringify(value))
}

function decisionAgentErrorStatus(code) {
  if (code === 'PROVIDER_CONFIG_ERROR') return 503
  if (code === 'PROVIDER_AUTH_ERROR') return 502
  if (code === 'PROVIDER_RATE_LIMIT') return 429
  if (code === 'PROVIDER_TIMEOUT') return 504
  if (code === 'PROVIDER_UNAVAILABLE') return 503
  if (code === 'INVALID_AGENT_OUTPUT') return 502
  return 502
}

function decisionAgentErrorResponse(response, error) {
  const code = error?.code || 'UNKNOWN_PROVIDER_ERROR'
  const status = decisionAgentErrorStatus(code)
  jsonResponse(response, status, {
    error: { code },
    capabilities: { responsesApi: error instanceof OpenAIProviderError ? error.apiMode === 'responses' : null, structuredOutputs: error instanceof OpenAIProviderError ? error.structuredOutputs : null },
  })
}

function summarizeAgentOutput(output) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null
  return {
    topLevelKeys: Object.keys(output),
    decision: output.decision,
    confidence: output.confidence,
    primaryReasonRuleIds: output.primaryReasonRuleIds,
    tradeoffRuleIds: output.tradeoffRuleIds,
    missingInformation: output.missingInformation,
    nextAction: output.nextAction,
  }
}

async function handleDecisionAgentReason(response, body) {
  let payload
  try {
    payload = JSON.parse(body.toString('utf8'))
  } catch {
    jsonResponse(response, 400, { error: { code: 'INVALID_AGENT_INPUT' } })
    return
  }
  const agentInput = payload?.agentInput
  const inputValidation = validateAgentInput(agentInput)
  if (!inputValidation.valid) {
    jsonResponse(response, 400, { error: { code: 'INVALID_AGENT_INPUT', details: inputValidation.errors } })
    return
  }
  if (agentInput.unresolvedContext.resolutionStatus !== 'NEEDS_AGENT' || agentInput.unresolvedContext.needsAgentReasoning !== true || agentInput.allowedDecisions.length < 2) {
    jsonResponse(response, 409, { error: { code: 'AGENT_NOT_REQUIRED' } })
    return
  }

  try {
    const provider = createOpenAINextDecisionProvider()
    const output = await provider.generateStructuredDecision({ systemInstruction: CONFLICT_REASONER_SYSTEM_INSTRUCTION, input: agentInput, outputSchema: 'furniture-agent-output-v0.3.1' })
    const outputValidation = validateAgentOutput(output, agentInput)
    if (!outputValidation.valid) {
      const error = new OpenAIProviderError('INVALID_AGENT_OUTPUT', { status: 200, structuredOutputs: false, apiMode: 'chat_completions' })
      jsonResponse(response, 502, { error: { code: error.code, details: outputValidation.errors }, validationIssues: outputValidation.issues, diagnosticSummary: summarizeAgentOutput(output), capabilities: { responsesApi: false, structuredOutputs: false } })
      return
    }
    jsonResponse(response, 200, output)
  } catch (error) {
    decisionAgentErrorResponse(response, error)
  }
}

async function callVision({ files, scaleAnchor, prompt, responseSchema, schemaName = 'photo_room_draft', validate = validatePhotoRoomDraft }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured')
    error.statusCode = 503
    throw error
  }
  const content = [
    { type: 'input_text', text: `${prompt}\n\nScale anchor JSON: ${JSON.stringify(scaleAnchor)}` },
    ...files.map((file) => ({ type: 'input_image', image_url: `data:${file.type};base64,${file.data.toString('base64')}`, detail: 'high' })),
  ]
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_schema', name: schemaName, strict: true, schema: responseSchema } },
    }),
  })
  const payload = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const error = new Error(payload.error?.message || `Vision provider returned ${upstream.status}`)
    error.statusCode = 502
    throw error
  }
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('Vision provider returned no structured output')
  const draft = JSON.parse(text)
  const errors = validate(draft)
  if (errors.length) {
    const details = errors.map((error) => typeof error === 'string' ? error : `${error.path}: ${error.message}`).join('; ')
    throw new Error(`Invalid structured output from provider: ${details}`)
  }
  return { ...draft, source: { ...(draft.source || {}), provider: `openai:${model}`, imageCount: files.length } }
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' })
    response.end()
    return
  }
  const isPhotoRoomRequest = request.method === 'POST' && request.url === '/api/analyze-room'
  const isFloorplanRequest = request.method === 'POST' && request.url === '/api/analyze-floorplan'
  const isDecisionAgentRequest = request.method === 'POST' && request.url === '/api/decision/agent-reason'
  if (!isPhotoRoomRequest && !isFloorplanRequest && !isDecisionAgentRequest) {
    jsonResponse(response, 404, { error: 'Not found' })
    return
  }
  try {
    const body = await readBody(request)
    if (isDecisionAgentRequest) {
      await handleDecisionAgentReason(response, body)
      return
    }
    const contentType = request.headers['content-type'] || ''
    const { fields, files } = contentType.includes('application/json') ? parseJsonImages(body) : parseMultipart(body, contentType)
    if (isPhotoRoomRequest && (files.length < 4 || files.length > 8)) throw new Error('Provide 4-8 room images')
    if (isFloorplanRequest && files.length !== 1) throw new Error('Provide exactly one floor-plan image')
    const draft = isFloorplanRequest
      ? await callVision({
        files,
        scaleAnchor: null,
        prompt: FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT,
        responseSchema: FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA,
        schemaName: 'floorplan_image_draft',
        validate: validateFloorplanImageDraft,
      })
      : await callVision({
        files,
        scaleAnchor: JSON.parse(fields.scaleAnchor || '{}'),
        prompt: fields.prompt || 'Analyze this room.',
        responseSchema: JSON.parse(fields.responseSchema || '{}'),
      })
    jsonResponse(response, 200, draft)
  } catch (error) {
    jsonResponse(response, error.statusCode || 400, { error: error.message || 'Room analysis failed' })
  }
})

server.listen(port, () => console.log(`Photo Vision backend listening on http://localhost:${port}`))
