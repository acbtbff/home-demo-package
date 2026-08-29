import { LifecycleStatus, OwnershipType, normalizeLifecycleStatus, normalizeOwnershipType } from '../common/enums.js'

export function normalizeDecisionLifecycleStatus(value) {
  if (value === null || value === undefined) return 'UNKNOWN'
  return normalizeLifecycleStatus(value) ?? 'UNKNOWN'
}

export function normalizeDecisionOwnershipType(value) {
  if (value === null || value === undefined) return OwnershipType.UNKNOWN
  return normalizeOwnershipType(value) ?? OwnershipType.UNKNOWN
}

const nullableDimension = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

export function adaptFurnitureToDecisionFurniture(furniture = {}) {
  const dimensions = furniture?.physical?.dimensionsM ?? {}
  return {
    id: furniture?.id ?? null,
    name: furniture?.name ?? null,
    category: furniture?.semantic?.category ?? null,
    lifecycleStatus: normalizeDecisionLifecycleStatus(furniture?.lifecycle?.status),
    ownershipType: normalizeDecisionOwnershipType(furniture?.ownership?.type),
    isFavorite: furniture?.isFavorite === true,
    sentimentalAttachment: null,
    dimensions: { width: nullableDimension(dimensions.width), depth: nullableDimension(dimensions.depth), height: nullableDimension(dimensions.height) },
    foldable: furniture?.physical?.foldable ?? null,
    modular: furniture?.physical?.modular ?? null,
    condition: furniture?.lifecycle?.conditionLevel ?? null,
    coreFunctionStatus: furniture?.lifecycle?.coreFunctionStatus ?? null,
    safetyRisk: furniture?.lifecycle?.safetyRisk ?? null,
  }
}

export function isDecisionOwnedPersonal(furniture) {
  return furniture?.lifecycleStatus === LifecycleStatus.OWNED && furniture?.ownershipType === OwnershipType.PERSONAL
}
