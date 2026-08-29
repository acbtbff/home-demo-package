export const EvidenceCategory = Object.freeze({
  UTILITY: 'UTILITY', SPACE: 'SPACE', ECONOMICS: 'ECONOMICS',
  LIFECYCLE: 'LIFECYCLE', PREFERENCE: 'PREFERENCE', RISK: 'RISK', LOGISTICS: 'LOGISTICS',
})

export const PurchaseEvidenceSignal = Object.freeze({
  SUPPORTS_BUY: 'SUPPORTS_BUY', AGAINST_BUY: 'AGAINST_BUY', SUPPORTS_WAIT: 'SUPPORTS_WAIT',
})

export const MoveEvidenceSignal = Object.freeze({
  SUPPORTS_TAKE: 'SUPPORTS_TAKE', AGAINST_TAKE: 'AGAINST_TAKE',
  SUPPORTS_SELL: 'SUPPORTS_SELL', SUPPORTS_GIVE_AWAY: 'SUPPORTS_GIVE_AWAY', SUPPORTS_DISCARD: 'SUPPORTS_DISCARD',
})

const allCategories = Object.values(EvidenceCategory)
const allSignals = new Set([...Object.values(PurchaseEvidenceSignal), ...Object.values(MoveEvidenceSignal)])

export function createEvidence({ ruleId, domain, category, signal, reason, evidencePaths = [] }) {
  if (!ruleId || !['PURCHASE', 'MOVE'].includes(domain)) throw new TypeError('Evidence requires ruleId and PURCHASE/MOVE domain')
  if (!allCategories.includes(category) || !allSignals.has(signal)) throw new TypeError('Invalid Evidence category or signal')
  if (typeof reason !== 'string' || reason.length === 0) throw new TypeError('Evidence requires a reason')
  if (!Array.isArray(evidencePaths) || evidencePaths.some((path) => typeof path !== 'string')) throw new TypeError('evidencePaths must be strings')
  return Object.freeze({ ruleId, domain, category, signal, reason, evidencePaths: Object.freeze([...evidencePaths]) })
}

export function createEvidenceDiagnostics(ruleId, reason) {
  return { ruleId, reason }
}
