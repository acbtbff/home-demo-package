export function createHttpAgentProvider({ fetchImpl = globalThis.fetch, endpoint = '/api/decision/agent-reason', onRequest = null } = {}) {
  return {
    async generateStructuredDecision({ input } = {}) {
      if (typeof fetchImpl !== 'function') throw Object.assign(new Error('Provider unavailable'), { code: 'PROVIDER_UNAVAILABLE' })
      onRequest?.()
      const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ agentInput: input }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw Object.assign(new Error(payload?.error?.code ?? 'PROVIDER_UNAVAILABLE'), { code: payload?.error?.code ?? 'PROVIDER_UNAVAILABLE', status: response.status })
      return payload
    },
  }
}
