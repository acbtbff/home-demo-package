import { findPurchaseCriticalMissing } from './purchaseCriticalMissing.js'

const isExplicitImpossible = (value) => value === 'IMPOSSIBLE'
const isSevereFunctionalImpact = (value) => ['CRITICAL', 'BLOCKED'].includes(value)

function triggered(id, reason, evidencePaths) {
  return { id, reason, evidencePaths }
}

function stop(outcome, rule, missingInformation = []) {
  return { status: 'STOP', outcome, triggeredRules: [rule], missingInformation }
}

/**
 * Deterministic hard constraints only. `collision` is current-placement
 * collision, not global furniture-fit impossibility, and is intentionally ignored.
 */
export function evaluatePurchaseHardRules(input = {}) {
  const physicalFitRule = isExplicitImpossible(input.spaceContext?.physicalFit)
    ? triggered('P_HR01_PHYSICAL_FIT_IMPOSSIBLE', '已明确确认该家具无法适配当前空间', ['spaceContext.physicalFit'])
    : null
  if (physicalFitRule) return stop('DONT_BUY', physicalFitRule)

  const obstructionRule = input.spaceContext?.doorObstruction === true
    ? triggered('P_HR03_SEVERE_BASIC_SPATIAL_OBSTRUCTION', '家具会阻塞门的正常开启', ['spaceContext.doorObstruction'])
    : isSevereFunctionalImpact(input.spaceContext?.functionalAreaImpact)
      ? triggered('P_HR03_SEVERE_BASIC_SPATIAL_OBSTRUCTION', '家具会导致基本空间功能无法使用', ['spaceContext.functionalAreaImpact'])
      : null
  if (obstructionRule) return stop('DONT_BUY', obstructionRule)

  const installationRule = input.furniture?.installationRequired === true && input.spaceContext?.installationFeasibility === false
    ? triggered('P_HR04_INSTALLATION_INFEASIBLE', '安装条件明确不满足', ['furniture.installationRequired', 'spaceContext.installationFeasibility'])
    : null
  if (installationRule) return stop('DONT_BUY', installationRule)

  const missingInformation = findPurchaseCriticalMissing(input)
  if (missingInformation.length > 0) {
    return {
      status: 'STOP',
      outcome: 'UNKNOWN',
      triggeredRules: [triggered('P_HR02_CRITICAL_FIT_INFORMATION_MISSING', '缺少会阻止安全判断的关键空间适配事实', missingInformation.map(({ field }) => field))],
      missingInformation,
    }
  }
  return { status: 'CONTINUE', outcome: 'CONTINUE', triggeredRules: [], missingInformation: [] }
}
