import { EvidenceCategory, PurchaseEvidenceSignal, createEvidence } from '../common/evidence.js'

const isHighFrequency = (value) => ['DAILY', 'HIGH'].includes(String(value ?? '').toUpperCase())
const isHigh = (value) => String(value ?? '').toUpperCase() === 'HIGH'
const isLow = (value) => String(value ?? '').toUpperCase() === 'LOW'
const isExplicitSeverity = (value) => ['LOW', 'MEDIUM', 'HIGH'].includes(String(value ?? '').toUpperCase())

const evidence = (ruleId, category, signal, reason, evidencePaths) => createEvidence({ ruleId, domain: 'PURCHASE', category, signal, reason, evidencePaths })

export function evaluatePurchaseSoftRules(input = {}) {
  const result = []
  const skippedRules = []
  const need = input.needContext ?? {}
  const product = input.furniture ?? {}
  const space = input.spaceContext ?? {}

  if (isHighFrequency(need.usageFrequency)
    && (isHigh(need.needStrength) || need.functionalGap === true)
    && (isLow(need.substituteAdequacy) || need.substituteAvailable === false)) {
    result.push(evidence('P_SR01_HIGH_CONTINUED_USE', EvidenceCategory.UTILITY, PurchaseEvidenceSignal.SUPPORTS_BUY, '该家具对应高频且明确的持续使用需求，现有方案满足度不足', ['needContext.usageFrequency', 'needContext.needStrength', 'needContext.substituteAdequacy', 'needContext.functionalGap']))
  } else skippedRules.push({ ruleId: 'P_SR01_HIGH_CONTINUED_USE', reason: 'INSUFFICIENT_FACTS' })

  // No product-confirmed qualitative low-cost/low-space taxonomy exists yet.
  skippedRules.push({ ruleId: 'P_SR02_LOW_FREQUENCY_VALID', reason: 'NEEDS_QUALITATIVE_COST_AND_SPACE_FACTS' })

  if (need.substituteAvailable === true && isHigh(need.substituteAdequacy)) {
    result.push(evidence('P_SR03_ADEQUATE_SUBSTITUTE', EvidenceCategory.UTILITY, PurchaseEvidenceSignal.AGAINST_BUY, '已有方案已经能够较充分满足当前需求', ['needContext.substituteAvailable', 'needContext.substituteAdequacy']))
  } else skippedRules.push({ ruleId: 'P_SR03_ADEQUATE_SUBSTITUTE', reason: 'INSUFFICIENT_FACTS' })

  if ((isHighFrequency(need.frictionFrequency) || String(need.frictionFrequency ?? '').toUpperCase() === 'WEEKLY') && isExplicitSeverity(need.frictionSeverity)) {
    result.push(evidence('P_SR04_REPEATED_FRICTION', EvidenceCategory.UTILITY, PurchaseEvidenceSignal.SUPPORTS_BUY, '当前存在持续重复的使用摩擦，该因素将在用户摩擦敏感度参与后进一步调整。', ['needContext.frictionFrequency', 'needContext.frictionSeverity']))
  } else skippedRules.push({ ruleId: 'P_SR04_REPEATED_FRICTION', reason: 'INSUFFICIENT_FACTS' })

  // Spatial numeric thresholds and an explicit non-critical taxonomy are not frozen.
  skippedRules.push({ ruleId: 'P_SR05_SPACE_COST', reason: 'NEEDS_QUALITATIVE_SPATIAL_FACT_OR_FUTURE_THRESHOLD' })
  skippedRules.push({ ruleId: 'P_SR06_BUDGET_PRESSURE', reason: 'NEEDS_QUALITATIVE_BUDGET_PRESSURE_FACT' })
  skippedRules.push({ ruleId: 'P_SR07_SHORT_STAY_GUARD', reason: 'SHORT_STAY_ALONE_DOES_NOT_CREATE_NEGATIVE_EVIDENCE' })

  if (product.isFavorite === true) {
    result.push(evidence('P_SR08_FAVORITE_VALUE', EvidenceCategory.PREFERENCE, PurchaseEvidenceSignal.SUPPORTS_BUY, '用户主动将该家具标记为喜欢。', ['furniture.isFavorite']))
  } else skippedRules.push({ ruleId: 'P_SR08_FAVORITE_VALUE', reason: 'NO_POSITIVE_FAVORITE_SIGNAL' })

  if (space.physicalFit === 'UNCERTAIN' || space.installationFeasibility === 'UNCERTAIN') {
    result.push(evidence('P_SR09_HIGH_UNCERTAINTY', EvidenceCategory.RISK, PurchaseEvidenceSignal.SUPPORTS_WAIT, '已明确记录空间或安装适配存在不确定性。', ['spaceContext.physicalFit', 'spaceContext.installationFeasibility']))
  } else skippedRules.push({ ruleId: 'P_SR09_HIGH_UNCERTAINTY', reason: 'NO_EXPLICIT_UNCERTAINTY_FACT' })

  const reversibilityPaths = []
  if (product.trialAvailable === true) reversibilityPaths.push('furniture.trialAvailable')
  if (product.returnable === true) reversibilityPaths.push('furniture.returnable')
  if (product.returnCostCny === 0) reversibilityPaths.push('furniture.returnCostCny')
  if (isHigh(input.economicsContext?.resaleLiquidity)) reversibilityPaths.push('economicsContext.resaleLiquidity')
  if (reversibilityPaths.length > 0) result.push(evidence('P_SR10_HIGH_REVERSIBILITY', EvidenceCategory.RISK, PurchaseEvidenceSignal.SUPPORTS_BUY, '已知退货、试用或高流动性事实降低了购买错误的撤回成本。', reversibilityPaths))
  else skippedRules.push({ ruleId: 'P_SR10_HIGH_REVERSIBILITY', reason: 'INSUFFICIENT_FACTS' })

  return { evidence: result, diagnostics: { skippedRules } }
}
