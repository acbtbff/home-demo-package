import { MODEL_STRATEGIES } from '../domain/furnitureRouter.js'

export const FURNITURE_CATALOG_V0 = Object.freeze([
  Object.freeze({
    catalogId: 'desk-v0',
    name: 'Desk',
    category: 'TABLE',
    archetype: 'DESK',
    defaultDimensionsM: Object.freeze({ width: 1.2, depth: 0.6, height: 0.75 }),
    modelStrategy: MODEL_STRATEGIES.PARAMETRIC,
  }),
  Object.freeze({
    catalogId: 'two-seat-sofa-v0',
    name: 'Two Seat Sofa',
    category: 'SOFA',
    archetype: 'TWO_SEAT_SOFA',
    defaultDimensionsM: Object.freeze({ width: 1.65, depth: 0.82, height: 0.8 }),
    modelStrategy: MODEL_STRATEGIES.LIBRARY,
  }),
  Object.freeze({
    catalogId: 'office-chair-v0',
    name: 'Office Chair',
    category: 'CHAIR',
    archetype: 'OFFICE_CHAIR',
    defaultDimensionsM: Object.freeze({ width: 0.62, depth: 0.62, height: 0.92 }),
    dimensionSource: 'prototype/default; not measured from GLB',
    modelStrategy: MODEL_STRATEGIES.LIBRARY,
  }),
  Object.freeze({
    catalogId: 'floor-lamp-v0',
    name: 'Floor Lamp',
    category: 'LIGHTING',
    archetype: 'FLOOR_LAMP',
    defaultDimensionsM: Object.freeze({ width: 0.6, depth: 0.6, height: 1.65 }),
    dimensionSource: 'prototype/default; not measured from GLB',
    modelStrategy: MODEL_STRATEGIES.LIBRARY,
  }),
])

export function getFurnitureCatalogItem(catalogId) {
  return FURNITURE_CATALOG_V0.find((item) => item.catalogId === catalogId) ?? null
}
