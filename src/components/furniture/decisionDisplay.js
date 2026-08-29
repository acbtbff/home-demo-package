export const DECISION_TYPE_LABELS = Object.freeze({ PURCHASE: '购买决策', MOVE: '搬家决策' })

export const DECISION_LABELS = Object.freeze({
  TAKE: '建议带走', SELL: '建议出售', GIVE_AWAY: '建议赠送', DISCARD: '建议丢弃', WAIT: '建议暂缓判断',
  BUY: '建议购买', DONT_BUY: '不建议购买',
})

export const SOURCE_LABELS = Object.freeze({
  AGENT: 'AI 综合判断', HARD_RULE: '明确条件判断', DETERMINISTIC_RESOLVER: '规则综合判断',
  INSUFFICIENT_EVIDENCE: '信息不足', INELIGIBLE: '不适用', AGENT_ERROR: '暂时无法生成',
})

export const CONFIDENCE_LABELS = Object.freeze({ HIGH: '高置信度', MEDIUM: '中等置信度', LOW: '低置信度' })

export function getDecisionType(furniture = {}) {
  return furniture?.lifecycle?.status === 'OWNED' ? 'MOVE' : 'PURCHASE'
}

export function formatDecisionLabel(decision) {
  return DECISION_LABELS[decision] ?? '暂时无法判断'
}

export function formatSourceLabel(source) {
  return SOURCE_LABELS[source] ?? '规则综合判断'
}

export function formatConfidenceLabel(confidence) {
  return confidence ? (CONFIDENCE_LABELS[confidence] ?? null) : null
}

export function formatNextAction(nextAction) {
  if (typeof nextAction === 'string') return nextAction
  if (!nextAction || typeof nextAction !== 'object' || Array.isArray(nextAction)) return null
  for (const key of ['label', 'text', 'description', 'action', 'title']) if (typeof nextAction[key] === 'string' && nextAction[key].trim()) return nextAction[key]
  return null
}

export function collectDecisionReasons(result = {}) {
  if (Array.isArray(result.agentResult?.primaryReasons) && result.agentResult.primaryReasons.length) return result.agentResult.primaryReasons.slice(0, 3)
  const ids = new Set(result.rationaleRuleIds ?? [])
  const evidenceReasons = (result.activeEvidence ?? []).filter((item) => ids.size === 0 || ids.has(item.ruleId)).map((item) => item.reason).filter(Boolean)
  const hardReasons = (result.hardRuleResult?.triggeredRules ?? []).map((item) => item.reason).filter(Boolean)
  return [...new Set([...hardReasons, ...evidenceReasons])].slice(0, 3)
}

export function collectDecisionTradeoffs(result = {}) {
  return Array.isArray(result.agentResult?.tradeoffs) ? result.agentResult.tradeoffs.slice(0, 3) : []
}
