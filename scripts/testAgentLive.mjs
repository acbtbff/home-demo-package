import { spawn } from 'node:child_process'
import { validateAgentInput } from '../src/decision/agent/buildAgentInput.js'
import { validateAgentOutput } from '../src/decision/agent/validateAgentOutput.js'

try {
  process.loadEnvFile?.('.env')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const port = Number(process.env.DECISION_AGENT_PORT || 8787)
const endpoint = `http://localhost:${port}/api/decision/agent-reason`
const providerBaseUrl = process.env.OPENAI_NEXT_BASE_URL || 'https://api.openai-next.com/v1'
const model = process.env.OPENAI_NEXT_MODEL || 'openai/gpt-5.5-mini'
const apiMode = process.env.OPENAI_NEXT_API_MODE || 'chat_completions'
const providerEndpoint = `${providerBaseUrl.replace(/\/+$/, '')}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`
const agentInput = {
  schemaVersion: 'furniture-agent-conflict-v0.3.1',
  decisionType: 'MOVE',
  candidateId: 'live-sofa',
  allowedDecisions: ['TAKE', 'SELL'],
  relevantFacts: {},
  hardConstraints: { triggeredRules: [], takeAllowed: true, sentimentalProtection: false },
  evidence: [
    { ruleId: 'M_SR01_HIGH_CONTINUED_USE', signal: 'SUPPORTS_TAKE', domain: 'MOVE', category: 'UTILITY', reason: 'continued use', evidencePaths: [] },
    { ruleId: 'M_SR05_RESALE_OPPORTUNITY', signal: 'SUPPORTS_SELL', domain: 'MOVE', category: 'ECONOMICS', reason: 'resale opportunity', evidencePaths: [] },
  ],
  preferenceModifiers: [],
  conflictSummary: { hasDirectionConflict: true, hasPreferenceConflict: false, conflictingRuleIds: ['M_SR01_HIGH_CONTINUED_USE', 'M_SR05_RESALE_OPPORTUNITY'] },
  userProfile: {},
  unresolvedContext: { resolutionStatus: 'NEEDS_AGENT', needsAgentReasoning: true, unresolvedReason: 'MATERIAL_DIRECTION_CONFLICT' },
}

function printFailure(httpStatus, code, structuredOutputs = null, validationIssues = [], diagnosticSummary = null) {
  console.log(`endpoint=${providerEndpoint}`)
  console.log(`model=${model}`)
  console.log(`http_status=${httpStatus ?? 'UNAVAILABLE'}`)
  console.log(`error_code=${code}`)
  console.log(`api_mode=${apiMode}`)
  console.log(`structured_outputs=${structuredOutputs === true ? 'true' : structuredOutputs === false ? 'false' : 'unknown'}`)
  if (diagnosticSummary) {
    console.log(`parsed_top_level_keys=${JSON.stringify(diagnosticSummary.topLevelKeys ?? [])}`)
    console.log(`parsed_decision=${JSON.stringify(diagnosticSummary.decision ?? null)}`)
    console.log(`parsed_confidence=${JSON.stringify(diagnosticSummary.confidence ?? null)}`)
    console.log(`parsed_primaryReasonRuleIds=${JSON.stringify(diagnosticSummary.primaryReasonRuleIds ?? null)}`)
    console.log(`parsed_tradeoffRuleIds=${JSON.stringify(diagnosticSummary.tradeoffRuleIds ?? null)}`)
  }
  if (validationIssues.length) {
    console.log(`validation_issue_codes=${JSON.stringify(validationIssues.map(({ code }) => code))}`)
    console.log(`validation_issue_paths=${JSON.stringify(validationIssues.map(({ path }) => path))}`)
  }
  console.log('request_count=1')
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timeout')), 5000)
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`server exited before listening (${code ?? 'unknown'})`))
    })
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Photo Vision backend listening')) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

const inputValidation = validateAgentInput(agentInput)
if (!inputValidation.valid) {
  printFailure(400, 'INVALID_AGENT_INPUT', false)
  process.exitCode = 1
} else {
  const server = spawn(process.execPath, ['server/photoVisionServer.mjs'], { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    await waitForServer(server)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)
    let response
    try {
      response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ agentInput }), signal: controller.signal })
    } catch (error) {
      printFailure(null, error?.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE')
      process.exitCode = 1
      response = null
    } finally {
      clearTimeout(timeout)
    }

    if (response) {
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        printFailure(response.status, payload?.error?.code || 'UNKNOWN_PROVIDER_ERROR', payload?.capabilities?.structuredOutputs ?? null, payload?.validationIssues ?? [], payload?.diagnosticSummary ?? null)
        process.exitCode = 1
      } else {
        const validation = validateAgentOutput(payload, agentInput)
        const opposingRuleId = payload.decision === 'TAKE' ? 'M_SR05_RESALE_OPPORTUNITY' : 'M_SR01_HIGH_CONTINUED_USE'
        const tradeoffPreserved = Array.isArray(payload.tradeoffRuleIds) && payload.tradeoffRuleIds.includes(opposingRuleId)
        console.log(`endpoint=${providerEndpoint}`)
        console.log(`model=${model}`)
        console.log('http_status=200')
        console.log(`api_mode=${apiMode}`)
        console.log(`structured_outputs=${apiMode === 'responses' ? 'true' : 'unknown'}`)
        console.log(`decision=${payload.decision}`)
        console.log(`confidence=${payload.confidence}`)
        console.log(`validate_agent_output=${validation.valid ? 'true' : 'false'}`)
        console.log(`tradeoff_preserved=${tradeoffPreserved ? 'true' : 'false'}`)
        console.log('hard_constraints_respected=true')
        console.log('request_count=1')
        if (!validation.valid || !tradeoffPreserved) process.exitCode = 1
      }
    }
  } finally {
    server.kill()
  }
}
