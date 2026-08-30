import { findMoveCriticalMissing } from './moveCriticalMissing.js'

const isExplicitImpossible = (value) => value === 'IMPOSSIBLE'
const isSevereFunctionalImpact = (value) => ['CRITICAL', 'BLOCKED'].includes(value)
const isExplicitSafetyRisk = (value) => value === true || ['HIGH', 'SEVERE', 'CRITICAL', 'UNSAFE', 'DANGEROUS'].includes(String(value ?? '').toUpperCase())
const isExplicitCoreFailure = (value) => ['FAILED', 'UNUSABLE', 'NON_FUNCTIONAL', 'BROKEN', 'INOPERABLE'].includes(String(value ?? '').toUpperCase())
const triggered = (id, reason, evidencePaths) => ({ id, reason, evidencePaths })

/**
 * Move hard rules only constrain TAKE. They never choose SELL, GIVE_AWAY, or
 * DISCARD. `collision` and `outOfBounds` remain current-placement diagnostics.
 */
export function evaluateMoveHardRules(input = {}) {
  const physicalFitRule = isExplicitImpossible(input.newHomeContext?.physicalFit)
    ? triggered('M_HR01_PHYSICAL_FIT_IMPOSSIBLE', '已明确确认家具无法适配新房空间', ['newHomeContext.physicalFit'])
    : null
  if (physicalFitRule) return { status: 'STOP', outcome: 'EXCLUDE_TAKE', takeAllowed: false, triggeredRules: [physicalFitRule], missingInformation: [], sentimentalProtection: false }

  const safetyRule = isExplicitSafetyRisk(input.furniture?.safetyRisk)
    ? triggered('M_HR02_SEVERE_DAMAGE_OR_SAFETY', '存在明确安全风险', ['furniture.safetyRisk'])
    : isExplicitCoreFailure(input.furniture?.coreFunctionStatus)
      ? triggered('M_HR02_SEVERE_DAMAGE_OR_SAFETY', '家具核心功能明确失效', ['furniture.coreFunctionStatus'])
      : null
  if (safetyRule) return { status: 'STOP', outcome: 'EXCLUDE_TAKE', takeAllowed: false, triggeredRules: [safetyRule], missingInformation: [], sentimentalProtection: false }

  const obstructionRule = input.newHomeContext?.doorObstruction === true
    ? triggered('M_HR03_SEVERE_BASIC_SPATIAL_OBSTRUCTION', '家具会阻塞唯一或基本出入口', ['newHomeContext.doorObstruction'])
    : isSevereFunctionalImpact(input.newHomeContext?.functionalAreaImpact)
      ? triggered('M_HR03_SEVERE_BASIC_SPATIAL_OBSTRUCTION', '家具会导致基本空间功能无法使用', ['newHomeContext.functionalAreaImpact'])
      : null
  if (obstructionRule) return { status: 'STOP', outcome: 'EXCLUDE_TAKE', takeAllowed: false, triggeredRules: [obstructionRule], missingInformation: [], sentimentalProtection: false }

  const missingInformation = findMoveCriticalMissing(input)
  const sentimentalProtection = input.furniture?.sentimentalAttachment === true
  if (missingInformation.length > 0) return { status: 'STOP', outcome: 'WAIT', takeAllowed: null, triggeredRules: [triggered('M_HR04_DECISIVE_INFORMATION_MISSING', '缺少会阻止搬入可行性判断的关键事实', missingInformation.map(({ field }) => field))], missingInformation, sentimentalProtection }
  return { status: 'CONTINUE', outcome: 'CONTINUE', takeAllowed: true, triggeredRules: [], missingInformation: [], sentimentalProtection }
}
