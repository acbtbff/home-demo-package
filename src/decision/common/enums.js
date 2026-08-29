/** Shared Phase 1 enums. Unknown facts use null or UNKNOWN, never sentinel numbers. */

export const LifecycleStatus = Object.freeze({
  WISHLIST: 'WISHLIST', OWNED: 'OWNED', SOLD: 'SOLD', DISPOSED: 'DISPOSED', UNKNOWN: 'UNKNOWN',
})
export const OwnershipType = Object.freeze({ PERSONAL: 'PERSONAL', NON_PERSONAL: 'NON_PERSONAL', UNKNOWN: 'UNKNOWN' })
export const PurchaseDecision = Object.freeze({ BUY: 'BUY', WAIT: 'WAIT', DONT_BUY: 'DONT_BUY', UNKNOWN: 'UNKNOWN' })
export const MoveDecision = Object.freeze({ TAKE: 'TAKE', SELL: 'SELL', GIVE_AWAY: 'GIVE_AWAY', DISCARD: 'DISCARD', WAIT: 'WAIT' })
export const Confidence = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' })
export const PreferenceLevel = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' })
export const DataSource = Object.freeze({ VERIFIED: 'VERIFIED', ESTIMATED: 'ESTIMATED', UNKNOWN: 'UNKNOWN' })
export const BurdenLevel = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', VERY_HIGH: 'VERY_HIGH' })
export const enumValues = (enumeration) => Object.values(enumeration)

export function normalizeEnum(value, enumeration) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim().toUpperCase()
  return enumValues(enumeration).includes(normalized) ? normalized : null
}
export function normalizeLifecycleStatus(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim().toUpperCase()
  if (normalized === 'DISCARDED' || normalized === 'GIVEN_AWAY') return LifecycleStatus.DISPOSED
  return normalizeEnum(normalized, LifecycleStatus)
}
export function normalizeOwnershipType(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim().toUpperCase()
  if (normalized === 'USER') return OwnershipType.PERSONAL
  if (normalized === 'LANDLORD' || normalized === 'NONE') return OwnershipType.NON_PERSONAL
  return normalizeEnum(normalized, OwnershipType)
}
export function isPersonalOwnership(value) { return normalizeOwnershipType(value) === OwnershipType.PERSONAL }
