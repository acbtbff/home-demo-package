export function assertAgentProvider(provider) {
  if (!provider || typeof provider.generateStructuredDecision !== 'function') throw new TypeError('provider.generateStructuredDecision is required')
  return provider
}
