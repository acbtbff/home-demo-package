import { createModelStrategy } from './furnitureRouter.js'
import { normalizeFurnitureSemantic } from './furnitureSemantic.js'
import { WORLD_UNIT_METERS, WORLD_SCALE_METERS_PER_UNIT, WORLD_UNITS, WORLD_SCALE_CONTRACT, COORDINATE_CONTRACT } from './worldScale.js'

export { WORLD_UNIT_METERS, WORLD_SCALE_METERS_PER_UNIT, WORLD_UNITS, WORLD_SCALE_CONTRACT, COORDINATE_CONTRACT }

export const OWNERSHIP_TYPES = Object.freeze({
  USER: 'USER',
  LANDLORD: 'LANDLORD',
  NONE: 'NONE',
})

export const LIFECYCLE_STATUSES = Object.freeze({
  OWNED: 'OWNED',
  WISHLIST: 'WISHLIST',
  SOLD: 'SOLD',
  DISCARDED: 'DISCARDED',
  GIVEN_AWAY: 'GIVEN_AWAY',
})

const nullableString = (value) => value == null || value === '' ? null : String(value)
const nullableBoolean = (value) => typeof value === 'boolean' ? value : null
const nullablePositiveNumber = (value) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

const normalizeStatusToken = (value) => {
  if (value == null || value === '') return null
  const token = String(value)
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  return token || null
}

export function normalizeOwnershipType(value) {
  const token = normalizeStatusToken(value)
  return Object.values(OWNERSHIP_TYPES).includes(token) ? token : null
}

// Lifecycle is intentionally extensible: existing statuses are preserved.
export function normalizeLifecycleStatus(value) {
  return normalizeStatusToken(value)
}

export function isValidOwnershipLifecycle({ ownershipType, lifecycleStatus } = {}) {
  if (ownershipType == null || lifecycleStatus == null) return true
  return (
    (ownershipType === OWNERSHIP_TYPES.USER && lifecycleStatus === LIFECYCLE_STATUSES.OWNED)
    || (ownershipType === OWNERSHIP_TYPES.LANDLORD && lifecycleStatus === LIFECYCLE_STATUSES.OWNED)
    || (ownershipType === OWNERSHIP_TYPES.NONE && lifecycleStatus === LIFECYCLE_STATUSES.WISHLIST)
  )
}

export function assertValidOwnershipLifecycle(furniture) {
  const ownershipType = furniture?.ownership?.type ?? null
  const lifecycleStatus = furniture?.lifecycle?.status ?? null
  if (!isValidOwnershipLifecycle({ ownershipType, lifecycleStatus })) {
    throw new Error(`Invalid ownership/lifecycle combination: ${ownershipType} + ${lifecycleStatus}`)
  }
  return furniture
}

export function normalizeDimensionsM(value = {}) {
  return {
    width: nullablePositiveNumber(value.width),
    depth: nullablePositiveNumber(value.depth),
    height: nullablePositiveNumber(value.height),
  }
}

export function createFurniture(input = {}) {
  const semantic = normalizeFurnitureSemantic(input.semantic ?? input)
  const modelStrategy = input.modelStrategy ?? {}
  const defaultModelStrategy = createModelStrategy(semantic)

  const furniture = {
    id: nullableString(input.id),
    name: nullableString(input.name),
    // Phase 1 compatibility field: false means unmarked/neutral, not dislike.
    isFavorite: input.isFavorite === true,
    semantic,
    physical: {
      dimensionsM: normalizeDimensionsM(input.physical?.dimensionsM),
      weightKg: nullablePositiveNumber(input.physical?.weightKg),
      foldable: nullableBoolean(input.physical?.foldable),
      disassemblable: nullableBoolean(input.physical?.disassemblable),
      modular: nullableBoolean(input.physical?.modular),
      canServeAsMovingContainer: nullableBoolean(input.physical?.canServeAsMovingContainer),
    },
    ownership: {
      type: normalizeOwnershipType(input.ownership?.type ?? input.ownership),
    },
    lifecycle: {
      status: normalizeLifecycleStatus(input.lifecycle?.status),
      conditionLevel: nullableString(input.lifecycle?.conditionLevel),
      coreFunctionStatus: nullableString(input.lifecycle?.coreFunctionStatus),
      safetyRisk: nullableString(input.lifecycle?.safetyRisk),
    },
    appearance: {
      dominantColor: nullableString(input.appearance?.dominantColor),
      colorVariantId: nullableString(input.appearance?.colorVariantId),
    },
    modelStrategy: {
      ...defaultModelStrategy,
      preferred: modelStrategy.preferred ?? defaultModelStrategy.preferred,
      resolved: modelStrategy.resolved ?? null,
    },
  }

  return furniture
}

export function assertFurnitureHasNoPlacement(furniture) {
  const forbidden = ['position', 'rotationY', 'roomId']
  const present = forbidden.filter((field) => Object.prototype.hasOwnProperty.call(furniture, field))
  if (present.length > 0) throw new Error(`Furniture must not contain placement fields: ${present.join(', ')}`)
  return furniture
}
