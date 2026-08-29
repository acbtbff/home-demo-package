import { COZY_V0_PALETTE } from './cozyPalette.js'

const VARIANTS = Object.freeze({
  DESK: Object.freeze([
    Object.freeze({ id: 'natural-oak', label: '原木色', color: COZY_V0_PALETTE.LIGHT_WOOD }),
    Object.freeze({ id: 'cream', label: '奶白色', color: COZY_V0_PALETTE.CREAM }),
    Object.freeze({ id: 'sage', label: '鼠尾草绿', color: COZY_V0_PALETTE.SAGE }),
    Object.freeze({ id: 'dark-walnut', label: '深棕色', color: COZY_V0_PALETTE.DARK_WOOD }),
  ]),
  OFFICE_CHAIR: Object.freeze([
    Object.freeze({ id: 'cream', label: '米白色', color: COZY_V0_PALETTE.CREAM }),
    Object.freeze({ id: 'warm-gray', label: '浅灰色', color: COZY_V0_PALETTE.WARM_GRAY }),
    Object.freeze({ id: 'dusty-blue', label: '浅蓝色', color: COZY_V0_PALETTE.DUSTY_BLUE }),
    Object.freeze({ id: 'sage', label: '鼠尾草绿', color: COZY_V0_PALETTE.SAGE }),
    Object.freeze({ id: 'butter', label: '暖黄色', color: COZY_V0_PALETTE.BUTTER_YELLOW }),
  ]),
})

export const COLOR_VARIANT_POLICY = Object.freeze({
  DESK: 'TINTABLE',
  OFFICE_CHAIR: 'TINTABLE',
  TWO_SEAT_SOFA: 'UNSUPPORTED',
  FLOOR_LAMP: 'UNSUPPORTED',
})

export function getFurnitureColorVariants(furnitureOrArchetype) {
  const archetype = typeof furnitureOrArchetype === 'string'
    ? furnitureOrArchetype
    : furnitureOrArchetype?.semantic?.archetype
  return VARIANTS[archetype] ?? []
}

export function supportsFurnitureColorVariants(furnitureOrArchetype) {
  return getFurnitureColorVariants(furnitureOrArchetype).length > 0
}

export function resolveFurnitureColorVariant(furnitureOrArchetype, variantId = null) {
  const variants = getFurnitureColorVariants(furnitureOrArchetype)
  if (!variants.length) return null
  return variants.find((variant) => variant.id === variantId) ?? null
}

export function getDefaultFurnitureColorVariant(furnitureOrArchetype) {
  return getFurnitureColorVariants(furnitureOrArchetype)[0] ?? null
}

export const COLOR_VARIANTS_BY_ARCHETYPE = VARIANTS
