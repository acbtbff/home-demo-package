/**
 * Furniture and Room share the same Three.js world scale.
 * One world unit is exactly one metre; centimetres are presentation-only.
 */
export const WORLD_UNIT_METERS = 1
export const WORLD_SCALE_METERS_PER_UNIT = WORLD_UNIT_METERS
export const WORLD_UNITS = 'meters'

export const WORLD_SCALE_CONTRACT = Object.freeze({
  units: WORLD_UNITS,
  metersPerWorldUnit: WORLD_UNIT_METERS,
  worldUnitMeters: WORLD_UNIT_METERS,
  threeJsWorldUnitMeters: WORLD_UNIT_METERS,
  threeJsWorldUnit: '1 meter',
})

export const COORDINATE_CONTRACT = Object.freeze({
  upAxis: 'y',
  floorAxes: Object.freeze(['x', 'z']),
  furnitureRotation: 'rotationY',
  furniturePivot: 'bottom-center',
})
