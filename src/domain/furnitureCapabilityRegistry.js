import { createParametricDeskSpec } from './parametricDesk.js'
import { normalizeFurnitureSemantic } from './furnitureSemantic.js'
import {
  FLOOR_LAMP_LIBRARY_ASSET_V0,
  OFFICE_CHAIR_LIBRARY_ASSET_V0,
  TWO_SEAT_SOFA_LIBRARY_ASSET_V0,
} from './furnitureAssets.js'
import {
  ARCHETYPE_TO_CATEGORY,
  FURNITURE_ARCHETYPES,
  FURNITURE_CATEGORIES,
} from './furnitureTaxonomy.js'

export const CAPABILITY_STATUS = Object.freeze({
  READY: 'READY',
  PLANNED: 'PLANNED',
  FALLBACK_ONLY: 'FALLBACK_ONLY',
})
export const FURNITURE_CAPABILITY_STATUS = CAPABILITY_STATUS

export const CAPABILITY_FALLBACKS = Object.freeze({
  PROXY_ONLY: 'PROXY_ONLY',
  GENERATED_PENDING: 'GENERATED_PENDING',
})

export const MODEL_STRATEGIES = Object.freeze({
  PARAMETRIC: 'PARAMETRIC',
  LIBRARY: 'LIBRARY',
  GENERATED: 'GENERATED',
})

/**
 * The only V0 parametric generator currently implemented.  A generator is a
 * visual handler: it must never be used to derive or mutate physical facts.
 */
export const PARAMETRIC_GENERATOR_REGISTRY_V0 = Object.freeze({
  DESK: Object.freeze({
    key: 'DESK',
    archetype: FURNITURE_ARCHETYPES.DESK,
    status: CAPABILITY_STATUS.READY,
    handler: createParametricDeskSpec,
  }),
})

export const LIBRARY_ASSET_POOL_REGISTRY_V0 = Object.freeze({
  [FURNITURE_ARCHETYPES.OFFICE_CHAIR]: Object.freeze([OFFICE_CHAIR_LIBRARY_ASSET_V0]),
  [FURNITURE_ARCHETYPES.TWO_SEAT_SOFA]: Object.freeze([TWO_SEAT_SOFA_LIBRARY_ASSET_V0]),
  [FURNITURE_ARCHETYPES.FLOOR_LAMP]: Object.freeze([FLOOR_LAMP_LIBRARY_ASSET_V0]),
})

const PARAMETRIC_PLANNED = new Set([
  'DINING_TABLE', 'COFFEE_TABLE', 'ROUND_COFFEE_TABLE', 'SINGLE_BED', 'DOUBLE_BED',
  'WARDROBE', 'BOOKSHELF', 'CABINET', 'NIGHTSTAND', 'DESK_PEDESTAL',
  'CHEST_OF_DRAWERS', 'OPEN_BOOKSHELF', 'GARMENT_RACK', 'AREA_RUG',
])

const LIBRARY_PLANNED = new Set([
  'DINING_CHAIR', 'STOOL', 'THREE_SEAT_SOFA', 'REFRIGERATOR', 'WASHING_MACHINE',
  'DESK_LAMP', 'TABLE_LAMP',
])

const strategyForArchetype = (archetype) => {
  if (archetype === FURNITURE_ARCHETYPES.OTHER || archetype === FURNITURE_ARCHETYPES.LADDER_SPECIAL) return MODEL_STRATEGIES.GENERATED
  if (archetype === FURNITURE_ARCHETYPES.DESK || PARAMETRIC_PLANNED.has(archetype)) return MODEL_STRATEGIES.PARAMETRIC
  if (LIBRARY_ASSET_POOL_REGISTRY_V0[archetype] || LIBRARY_PLANNED.has(archetype)) return MODEL_STRATEGIES.LIBRARY
  return MODEL_STRATEGIES.GENERATED
}

const entryForArchetype = (archetype) => {
  const preferredStrategy = strategyForArchetype(archetype)
  const generator = Object.values(PARAMETRIC_GENERATOR_REGISTRY_V0).find((item) => item.archetype === archetype) ?? null
  const assetPool = LIBRARY_ASSET_POOL_REGISTRY_V0[archetype] ?? Object.freeze([])
  const ready = Boolean(
    (preferredStrategy === MODEL_STRATEGIES.PARAMETRIC && generator?.handler)
    || (preferredStrategy === MODEL_STRATEGIES.LIBRARY && assetPool.some((asset) => asset.status === 'READY' && asset.modelUrl)),
  )
  const capabilityStatus = ready
    ? CAPABILITY_STATUS.READY
    : preferredStrategy === MODEL_STRATEGIES.GENERATED || archetype === FURNITURE_ARCHETYPES.OTHER
      ? CAPABILITY_STATUS.FALLBACK_ONLY
      : CAPABILITY_STATUS.PLANNED

  return Object.freeze({
    category: ARCHETYPE_TO_CATEGORY[archetype] ?? FURNITURE_CATEGORIES.OTHER,
    archetype,
    preferredStrategy,
    capabilityStatus,
    generatorKey: generator?.key ?? null,
    handler: generator?.handler ?? null,
    assetPool,
    fallback: capabilityStatus === CAPABILITY_STATUS.READY
      ? null
      : capabilityStatus === CAPABILITY_STATUS.FALLBACK_ONLY
        ? CAPABILITY_FALLBACKS.GENERATED_PENDING
        : CAPABILITY_FALLBACKS.PROXY_ONLY,
  })
}

export const FURNITURE_CAPABILITY_REGISTRY_V0 = Object.freeze(
  Object.fromEntries(Object.values(FURNITURE_ARCHETYPES).map((archetype) => [archetype, entryForArchetype(archetype)])),
)
export const FURNITURE_CAPABILITIES_V0 = FURNITURE_CAPABILITY_REGISTRY_V0
export const PARAMETRIC_GENERATOR_REGISTRY = PARAMETRIC_GENERATOR_REGISTRY_V0
export const LIBRARY_ASSET_POOL_REGISTRY = LIBRARY_ASSET_POOL_REGISTRY_V0

export function getFurnitureCapability(archetypeOrFurniture) {
  const semantic = normalizeFurnitureSemantic(archetypeOrFurniture)
  const archetype = semantic.archetype
  return FURNITURE_CAPABILITY_REGISTRY_V0[archetype]
    ?? FURNITURE_CAPABILITY_REGISTRY_V0[FURNITURE_ARCHETYPES.OTHER]
}

export const resolveFurnitureCapability = getFurnitureCapability

export function getFurnitureCapabilityEntries() {
  return Object.values(FURNITURE_CAPABILITY_REGISTRY_V0)
}

export function getFurnitureCapabilityReport() {
  const entries = getFurnitureCapabilityEntries()
  const byStatus = Object.fromEntries(Object.values(CAPABILITY_STATUS).map((status) => [status, 0]))
  for (const entry of entries) byStatus[entry.capabilityStatus] += 1
  return {
    total: entries.length,
    counts: byStatus,
    entries: entries.map(({ category, archetype, preferredStrategy, capabilityStatus, generatorKey, assetPool, fallback }) => ({
      category, archetype, preferredStrategy, capabilityStatus,
      generatorKey,
      assetIds: assetPool.map((asset) => asset.id),
      fallback,
    })),
  }
}
