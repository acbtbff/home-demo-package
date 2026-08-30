import { evaluateMoveSoftRules } from './moveSoftRules.js'

export function collectMoveEvidence(input = {}) {
  return evaluateMoveSoftRules(input)
}
