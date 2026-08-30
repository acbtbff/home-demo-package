import { evaluatePurchaseSoftRules } from './purchaseSoftRules.js'

export function collectPurchaseEvidence(input = {}) {
  return evaluatePurchaseSoftRules(input)
}
