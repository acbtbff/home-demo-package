export const AgentDecisionType = Object.freeze({ PURCHASE: 'PURCHASE', MOVE: 'MOVE' })
export const AgentConfidence = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' })
export const AgentAllowedDecisions = Object.freeze({
  PURCHASE: Object.freeze(['BUY', 'WAIT', 'DONT_BUY']),
  MOVE: Object.freeze(['TAKE', 'SELL', 'GIVE_AWAY', 'DISCARD', 'WAIT']),
})

export const AgentInputSchemaVersion = 'furniture-agent-conflict-v0.3.1'
