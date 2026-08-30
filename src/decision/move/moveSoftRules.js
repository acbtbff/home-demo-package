import { EvidenceCategory, MoveEvidenceSignal, createEvidence } from '../common/evidence.js'

const token = (value) => String(value ?? '').toUpperCase()
const isHigh = (value) => token(value) === 'HIGH'
const isLow = (value) => ['LOW', 'RARE'].includes(token(value))
const isHighBurden = (value) => ['HIGH', 'VERY_HIGH'].includes(token(value))
const isKnownLowBurden = (value) => ['LOW', 'MEDIUM'].includes(token(value))
const evidence = (ruleId, category, signal, reason, evidencePaths) => createEvidence({ ruleId, domain: 'MOVE', category, signal, reason, evidencePaths })

export function evaluateMoveSoftRules(input = {}) {
  const result = []
  const skippedRules = []
  const furniture = input.furniture ?? {}
  const usage = input.usageContext ?? {}
  const home = input.newHomeContext ?? {}
  const economics = input.economicsContext ?? {}
  const logistics = input.logisticsContext ?? {}

  if ((token(usage.usageFrequency) === 'DAILY' || isHigh(usage.usageFrequency))
    && (isHigh(usage.expectedFutureUse))
    && (token(usage.substituteAdequacy) === 'LOW' || usage.substituteAvailable === false)) {
    result.push(evidence('M_SR01_HIGH_CONTINUED_USE', EvidenceCategory.UTILITY, MoveEvidenceSignal.SUPPORTS_TAKE, '家具使用频率高、未来仍有明确需求，且替代方案不足。', ['usageContext.usageFrequency', 'usageContext.expectedFutureUse', 'usageContext.substituteAdequacy']))
  } else skippedRules.push({ ruleId: 'M_SR01_HIGH_CONTINUED_USE', reason: 'INSUFFICIENT_FACTS' })

  skippedRules.push({ ruleId: 'M_SR02_HIGH_REPLACEMENT_BURDEN', reason: 'NEEDS_QUALITATIVE_REPLACEMENT_BURDEN_FACT' })

  if (usage.substituteAvailable === true && isHigh(usage.substituteAdequacy)) {
    result.push(evidence('M_SR03_ADEQUATE_REPLACEMENT', EvidenceCategory.UTILITY, MoveEvidenceSignal.AGAINST_TAKE, '新房已有充分替代方案，继续搬入该家具的使用价值降低。', ['usageContext.substituteAvailable', 'usageContext.substituteAdequacy']))
  } else if (['HIGH', 'ADEQUATE'].includes(token(home.existingReplacement))) {
    result.push(evidence('M_SR03_ADEQUATE_REPLACEMENT', EvidenceCategory.UTILITY, MoveEvidenceSignal.AGAINST_TAKE, '新房已有明确充分的替代方案。', ['newHomeContext.existingReplacement']))
  } else skippedRules.push({ ruleId: 'M_SR03_ADEQUATE_REPLACEMENT', reason: 'INSUFFICIENT_FACTS' })

  if (isLow(usage.usageFrequency) && ['LARGE', 'EXTRA_LARGE'].includes(token(logistics.sizeClass)) && (isHighBurden(logistics.handlingBurden) || isHighBurden(logistics.movingBurdenLevel))) {
    result.push(evidence('M_SR04_LOW_USAGE_HIGH_BURDEN', EvidenceCategory.LOGISTICS, MoveEvidenceSignal.AGAINST_TAKE, '家具使用频率低、尺寸等级较大且搬运负担明确较高。', ['usageContext.usageFrequency', 'logisticsContext.sizeClass', 'logisticsContext.handlingBurden', 'logisticsContext.movingBurdenLevel']))
  } else skippedRules.push({ ruleId: 'M_SR04_LOW_USAGE_HIGH_BURDEN', reason: 'INSUFFICIENT_FACTS' })

  skippedRules.push({ ruleId: 'M_SR05_RESALE_OPPORTUNITY', reason: 'NEEDS_QUALITATIVE_RESALE_VALUE_FACT' })

  if (furniture.sentimentalAttachment === true) result.push(evidence('M_SR06_SENTIMENTAL_VALUE', EvidenceCategory.PREFERENCE, MoveEvidenceSignal.SUPPORTS_TAKE, '用户明确表达该家具具有不可替代的特殊情感价值。', ['furniture.sentimentalAttachment']))
  else skippedRules.push({ ruleId: 'M_SR06_SENTIMENTAL_VALUE', reason: 'NO_EXPLICIT_SENTIMENTAL_FACT' })

  if (isHigh(usage.expectedFutureUse)) result.push(evidence('M_SR07_LONG_TERM_FUTURE_USE', EvidenceCategory.LIFECYCLE, MoveEvidenceSignal.SUPPORTS_TAKE, '已明确记录未来仍会持续使用该家具。', ['usageContext.expectedFutureUse']))
  else skippedRules.push({ ruleId: 'M_SR07_LONG_TERM_FUTURE_USE', reason: 'INSUFFICIENT_FACTS' })
  skippedRules.push({ ruleId: 'M_SR08_SHORT_STAY_GUARD', reason: 'SHORT_STAY_ALONE_DOES_NOT_CREATE_NEGATIVE_EVIDENCE' })
  skippedRules.push({ ruleId: 'M_SR09_SPACE_COST', reason: 'NEEDS_QUALITATIVE_SPATIAL_FACT_OR_FUTURE_THRESHOLD' })

  if (furniture.isFavorite === true) result.push(evidence('M_SR10_FAVORITE_VALUE', EvidenceCategory.PREFERENCE, MoveEvidenceSignal.SUPPORTS_TAKE, '用户主动将该家具标记为喜欢。', ['furniture.isFavorite']))
  else skippedRules.push({ ruleId: 'M_SR10_FAVORITE_VALUE', reason: 'NO_POSITIVE_FAVORITE_SIGNAL' })

  if (isHigh(economics.futureReuseProbability)) result.push(evidence('M_SR11_HIGH_FUTURE_REUSE', EvidenceCategory.LIFECYCLE, MoveEvidenceSignal.SUPPORTS_TAKE, '家具未来再利用概率明确较高。', ['economicsContext.futureReuseProbability']))
  else skippedRules.push({ ruleId: 'M_SR11_HIGH_FUTURE_REUSE', reason: 'INSUFFICIENT_FACTS' })

  const highFunctionalImportance = ['HIGH', 'CRITICAL'].includes(token(usage.functionalImportance))
  const burdenIsNotHigh = isKnownLowBurden(logistics.handlingBurden) || isKnownLowBurden(logistics.movingBurdenLevel)
  if (isLow(usage.usageFrequency) && highFunctionalImportance && burdenIsNotHigh) result.push(evidence('M_SR12_LOW_USAGE_EMERGENCY_VALUE', EvidenceCategory.UTILITY, MoveEvidenceSignal.SUPPORTS_TAKE, '虽然使用频率较低，但家具具有明确的关键或应急功能价值。', ['usageContext.usageFrequency', 'usageContext.functionalImportance', 'logisticsContext.handlingBurden', 'logisticsContext.movingBurdenLevel']))
  else skippedRules.push({ ruleId: 'M_SR12_LOW_USAGE_EMERGENCY_VALUE', reason: 'INSUFFICIENT_FACTS' })

  return { evidence: result, diagnostics: { skippedRules } }
}
