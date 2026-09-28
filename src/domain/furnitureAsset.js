import { normalizeFurnitureSemantic } from './furnitureSemantic.js'

export const FURNITURE_ASSET_SCHEMA_VERSION = 1

export const PHYSICAL_STATE_KINDS = Object.freeze({
  ASSEMBLED: 'ASSEMBLED',
  FOLDED: 'FOLDED',
  DISASSEMBLED: 'DISASSEMBLED',
})

export const MEASUREMENT_SOURCES = Object.freeze({
  USER_MEASURED: 'USER_MEASURED',
  MANUFACTURER_SPEC: 'MANUFACTURER_SPEC',
  AI_ESTIMATED: 'AI_ESTIMATED',
  IMPORTED: 'IMPORTED',
  UNKNOWN: 'UNKNOWN',
})

export const VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: 'UNVERIFIED',
  USER_CONFIRMED: 'USER_CONFIRMED',
  SOURCE_VERIFIED: 'SOURCE_VERIFIED',
})

export const PACKING_ORIENTATIONS = Object.freeze({
  UPRIGHT: 'UPRIGHT',
  SIDE_LEFT: 'SIDE_LEFT',
  SIDE_RIGHT: 'SIDE_RIGHT',
  FRONT: 'FRONT',
  BACK: 'BACK',
  INVERTED: 'INVERTED',
})

const nullableString = (value) => value == null || value === '' ? null : String(value)
const nullableBoolean = (value) => typeof value === 'boolean' ? value : null
const nullablePositiveNumber = (value) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}
const nullablePositiveInteger = (value) => {
  const number = nullablePositiveNumber(value)
  return number == null ? null : Math.max(1, Math.round(number))
}
const normalizeToken = (value) => String(value ?? '')
  .trim()
  .replace(/([a-z])([A-Z])/g, '$1_$2')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .toUpperCase()

const normalizeEnum = (value, options, fallback) => {
  const token = normalizeToken(value)
  return Object.values(options).includes(token) ? token : fallback
}

const normalizeDimensionsM = (value = {}) => ({
  width: nullablePositiveNumber(value.width),
  depth: nullablePositiveNumber(value.depth),
  height: nullablePositiveNumber(value.height),
})

const normalizeStringList = (value) => Array.from(new Set(
  (Array.isArray(value) ? value : [])
    .map((item) => nullableString(item)?.trim())
    .filter(Boolean),
))

const normalizeOrientations = (value) => {
  const orientations = (Array.isArray(value) ? value : [])
    .map((item) => normalizeEnum(item, PACKING_ORIENTATIONS, null))
    .filter(Boolean)
  return Array.from(new Set(orientations))
}

export function computePhysicalVolumeM3(dimensionsM = {}) {
  const dimensions = normalizeDimensionsM(dimensionsM)
  if (Object.values(dimensions).some((value) => value == null)) return null
  return Number((dimensions.width * dimensions.depth * dimensions.height).toFixed(6))
}

export function createFactProvenance(input = {}) {
  const confidence = Number(input.confidence)
  return {
    source: normalizeEnum(input.source, MEASUREMENT_SOURCES, MEASUREMENT_SOURCES.UNKNOWN),
    verificationStatus: normalizeEnum(
      input.verificationStatus,
      VERIFICATION_STATUSES,
      VERIFICATION_STATUSES.UNVERIFIED,
    ),
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
    reference: nullableString(input.reference),
    capturedAt: nullableString(input.capturedAt),
  }
}

export function createFurniturePhysicalState(input = {}) {
  const kind = normalizeEnum(input.kind, PHYSICAL_STATE_KINDS, PHYSICAL_STATE_KINDS.ASSEMBLED)
  const dimensionsM = normalizeDimensionsM(input.dimensionsM)
  const handling = input.handling ?? {}

  return {
    id: nullableString(input.id) ?? kind.toLowerCase(),
    kind,
    label: nullableString(input.label),
    dimensionsM,
    volumeM3: computePhysicalVolumeM3(dimensionsM),
    weightKg: nullablePositiveNumber(input.weightKg),
    handling: {
      allowedOrientations: normalizeOrientations(handling.allowedOrientations),
      stackable: nullableBoolean(handling.stackable),
      maxSupportedWeightKg: nullablePositiveNumber(handling.maxSupportedWeightKg),
      fragile: nullableBoolean(handling.fragile),
      requiresPeople: nullablePositiveInteger(handling.requiresPeople),
      requiredTools: normalizeStringList(handling.requiredTools),
    },
    provenance: {
      dimensions: createFactProvenance(input.provenance?.dimensions),
      weight: createFactProvenance(input.provenance?.weight),
      handling: createFactProvenance(input.provenance?.handling),
    },
  }
}

export function createFurnitureAsset(input = {}) {
  const physicalStates = (Array.isArray(input.physicalStates) ? input.physicalStates : [])
    .map(createFurniturePhysicalState)
  const defaultStateId = nullableString(input.defaultPhysicalStateId)
    ?? physicalStates.find((state) => state.kind === PHYSICAL_STATE_KINDS.ASSEMBLED)?.id
    ?? physicalStates[0]?.id
    ?? null

  return {
    schemaVersion: FURNITURE_ASSET_SCHEMA_VERSION,
    id: nullableString(input.id),
    name: nullableString(input.name),
    identity: {
      brand: nullableString(input.identity?.brand),
      model: nullableString(input.identity?.model),
      sku: nullableString(input.identity?.sku),
      productUrl: nullableString(input.identity?.productUrl),
    },
    semantic: normalizeFurnitureSemantic(input.semantic ?? input),
    capabilities: {
      foldable: nullableBoolean(input.capabilities?.foldable)
        ?? (physicalStates.some((state) => state.kind === PHYSICAL_STATE_KINDS.FOLDED) || null),
      disassemblable: nullableBoolean(input.capabilities?.disassemblable)
        ?? (physicalStates.some((state) => state.kind === PHYSICAL_STATE_KINDS.DISASSEMBLED) || null),
      modular: nullableBoolean(input.capabilities?.modular),
    },
    defaultPhysicalStateId: defaultStateId,
    physicalStates,
    notes: nullableString(input.notes),
  }
}

export function getFurniturePhysicalState(asset, stateId = asset?.defaultPhysicalStateId) {
  return asset?.physicalStates?.find((state) => state.id === stateId) ?? null
}

export function evaluatePhysicalStateReadiness(state) {
  const missingFields = []
  for (const field of ['width', 'depth', 'height']) {
    if (state?.dimensionsM?.[field] == null) missingFields.push(`dimensionsM.${field}`)
  }
  if (state?.weightKg == null) missingFields.push('weightKg')
  if (!state?.handling?.allowedOrientations?.length) missingFields.push('handling.allowedOrientations')

  const unverifiedFacts = []
  if (state?.provenance?.dimensions?.verificationStatus === VERIFICATION_STATUSES.UNVERIFIED) {
    unverifiedFacts.push('dimensions')
  }
  if (state?.provenance?.weight?.verificationStatus === VERIFICATION_STATUSES.UNVERIFIED) {
    unverifiedFacts.push('weight')
  }
  if (state?.provenance?.handling?.verificationStatus === VERIFICATION_STATUSES.UNVERIFIED) {
    unverifiedFacts.push('handling')
  }

  return {
    readyForSpatialPlanning: !missingFields.some((field) => field.startsWith('dimensionsM.')),
    readyForPayloadPlanning: !missingFields.includes('weightKg'),
    readyForPackingOptimization: missingFields.length === 0,
    missingFields,
    unverifiedFacts,
  }
}

export function createFurnitureAssetFromFurniture(furniture) {
  return createFurnitureAsset({
    id: furniture?.id,
    name: furniture?.name,
    semantic: furniture?.semantic,
    identity: {
      productUrl: furniture?.product?.url,
    },
    capabilities: {
      foldable: furniture?.physical?.foldable,
      disassemblable: furniture?.physical?.disassemblable,
      modular: furniture?.physical?.modular,
    },
    physicalStates: [{
      id: 'assembled',
      kind: PHYSICAL_STATE_KINDS.ASSEMBLED,
      dimensionsM: furniture?.physical?.dimensionsM,
      weightKg: furniture?.physical?.weightKg,
      provenance: {
        dimensions: { source: MEASUREMENT_SOURCES.IMPORTED },
        weight: { source: MEASUREMENT_SOURCES.IMPORTED },
        handling: { source: MEASUREMENT_SOURCES.IMPORTED },
      },
    }],
  })
}
