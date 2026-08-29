export function createMockAgentProvider({ response = null, error = null } = {}) {
  let callCount = 0
  return {
    get callCount() { return callCount },
    async generateStructuredDecision() {
      callCount += 1
      if (error) throw error
      return structuredClone(response)
    },
  }
}
