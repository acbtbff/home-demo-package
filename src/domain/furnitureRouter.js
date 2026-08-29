import { normalizeFurnitureSemantic } from './furnitureSemantic.js'
import {
  CAPABILITY_STATUS,
  FURNITURE_CAPABILITY_REGISTRY_V0,
  MODEL_STRATEGIES,
  getFurnitureCapability,
} from './furnitureCapabilityRegistry.js'

export { MODEL_STRATEGIES, CAPABILITY_STATUS }

export const MODEL_STRATEGY_VALIDATION_STATUS = Object.freeze({
  PARAMETRIC: 'VALIDATED',
  LIBRARY: 'VALIDATED',
  GENERATED: 'VALIDATION_PENDING',
})

export const GENERATED_ROUTE_STATUS = Object.freeze({
  interface: 'INTERFACE_RESERVED',
  validation: 'VALIDATION_PENDING',
})

export const MODEL_STRATEGY_STATUS = Object.freeze({
  ...MODEL_STRATEGY_VALIDATION_STATUS,
  GENERATED_INTERFACE: GENERATED_ROUTE_STATUS.interface,
})

export const FURNITURE_PIPELINE_STATUS = Object.freeze({
  PARAMETRIC: 'VALIDATED',
  LIBRARY: 'VALIDATED',
  GENERATED: 'INTERFACE_RESERVED / VALIDATION_PENDING',
})

// Compatibility projection for existing consumers. Routing itself reads the
// registry; this is not a second source of truth.
const LEGACY_ROUTER_KEYS = [
  'DOUBLE_BED', 'DESK', 'ROUND_COFFEE_TABLE', 'NIGHTSTAND', 'DESK_PEDESTAL',
  'CHEST_OF_DRAWERS', 'OPEN_BOOKSHELF', 'GARMENT_RACK', 'AREA_RUG',
  'OFFICE_CHAIR', 'TWO_SEAT_SOFA', 'FLOOR_LAMP', 'DESK_LAMP', 'TABLE_LAMP',
  'LADDER_SPECIAL',
]
export const MODEL_STRATEGY_BY_ARCHETYPE = Object.freeze(
  Object.fromEntries(LEGACY_ROUTER_KEYS.map((archetype) => [archetype, FURNITURE_CAPABILITY_REGISTRY_V0[archetype].preferredStrategy])),
)
export const FURNITURE_MODEL_ROUTER_V0 = MODEL_STRATEGY_BY_ARCHETYPE

export function routeFurnitureModelStrategy(semanticInput) {
  const semantic = normalizeFurnitureSemantic(semanticInput)
  return getFurnitureCapability(semantic).preferredStrategy
}

export function createModelStrategy(semanticInput, resolved = null) {
  return {
    preferred: routeFurnitureModelStrategy(semanticInput),
    resolved,
  }
}
