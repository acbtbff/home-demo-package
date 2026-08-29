export const ResolutionStatus = Object.freeze({
  RESOLVED: 'RESOLVED',
  NEEDS_AGENT: 'NEEDS_AGENT',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
})

export const ResolutionSource = Object.freeze({
  HARD_RULE: 'HARD_RULE',
  DETERMINISTIC_EVIDENCE: 'DETERMINISTIC_EVIDENCE',
  UNRESOLVED: 'UNRESOLVED',
})

export const MoveAllowedDecisions = Object.freeze(['TAKE', 'SELL', 'GIVE_AWAY', 'DISCARD', 'WAIT'])
