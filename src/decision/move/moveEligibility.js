import { LifecycleStatus, OwnershipType, normalizeLifecycleStatus, normalizeOwnershipType } from '../common/enums.js'
/** Eligibility gate only; it never emits a Move Decision. */
export function evaluateMoveEligibility(furniture) {
  const lifecycleStatus = furniture?.lifecycleStatus == null ? null : normalizeLifecycleStatus(furniture.lifecycleStatus)
  const ownershipType = furniture?.ownershipType == null ? null : normalizeOwnershipType(furniture.ownershipType)
  const eligible = lifecycleStatus === LifecycleStatus.OWNED && ownershipType === OwnershipType.PERSONAL
  return { eligible, reason: eligible ? null : 'NOT_PERSONAL_OWNED' }
}
