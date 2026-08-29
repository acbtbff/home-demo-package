import {
  categoryForArchetype,
  FURNITURE_ARCHETYPES,
  FURNITURE_CATEGORIES,
  isKnownFurnitureArchetype,
} from './furnitureTaxonomy.js'

const SEMANTIC_ALIASES = Object.freeze({
  TABLE: FURNITURE_ARCHETYPES.DESK,
  WORK_TABLE: FURNITURE_ARCHETYPES.DESK,
  WRITING_DESK: FURNITURE_ARCHETYPES.DESK,
  OFFICE_DESK: FURNITURE_ARCHETYPES.DESK,
  CHAIR: FURNITURE_ARCHETYPES.DINING_CHAIR,
  OFFICE_CHAIR: FURNITURE_ARCHETYPES.OFFICE_CHAIR,
  OFFICECHAIR: FURNITURE_ARCHETYPES.OFFICE_CHAIR,
  DINING_CHAIR: FURNITURE_ARCHETYPES.DINING_CHAIR,
  STOOL: FURNITURE_ARCHETYPES.STOOL,
  BED: FURNITURE_ARCHETYPES.SINGLE_BED,
  SINGLE_BED: FURNITURE_ARCHETYPES.SINGLE_BED,
  DOUBLE_BED: FURNITURE_ARCHETYPES.DOUBLE_BED,
  SOFA: FURNITURE_ARCHETYPES.TWO_SEAT_SOFA,
  COUCH: FURNITURE_ARCHETYPES.TWO_SEAT_SOFA,
  TWO_SEAT_SOFA: FURNITURE_ARCHETYPES.TWO_SEAT_SOFA,
  THREE_SEAT_SOFA: FURNITURE_ARCHETYPES.THREE_SEAT_SOFA,
  WARDROBE: FURNITURE_ARCHETYPES.WARDROBE,
  CLOSET: FURNITURE_ARCHETYPES.WARDROBE,
  BOOKSHELF: FURNITURE_ARCHETYPES.BOOKSHELF,
  BOOK_SHELF: FURNITURE_ARCHETYPES.BOOKSHELF,
  CABINET: FURNITURE_ARCHETYPES.CABINET,
  FRIDGE: FURNITURE_ARCHETYPES.REFRIGERATOR,
  REFRIGERATOR: FURNITURE_ARCHETYPES.REFRIGERATOR,
  WASHING_MACHINE: FURNITURE_ARCHETYPES.WASHING_MACHINE,
  FLOOR_LAMP: FURNITURE_ARCHETYPES.FLOOR_LAMP,
  LADDER: FURNITURE_ARCHETYPES.LADDER_SPECIAL,
  LADDER_SPECIAL: FURNITURE_ARCHETYPES.LADDER_SPECIAL,
})

function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

export function normalizeFurnitureSemantic(input) {
  const rawArchetype = typeof input === 'object' && input !== null
    ? input.archetype ?? input.semantic?.archetype ?? input.name
    : input
  const archetypeToken = normalizeToken(rawArchetype)
  const archetype = isKnownFurnitureArchetype(archetypeToken)
    ? archetypeToken
    : SEMANTIC_ALIASES[archetypeToken]

  if (archetype) {
    return {
      category: categoryForArchetype(archetype),
      archetype,
    }
  }

  const rawCategory = typeof input === 'object' && input !== null
    ? input.category ?? input.semantic?.category
    : null
  const categoryToken = normalizeToken(rawCategory)
  const category = Object.values(FURNITURE_CATEGORIES).includes(categoryToken)
    ? categoryToken
    : FURNITURE_CATEGORIES.OTHER

  return {
    category,
    archetype: FURNITURE_ARCHETYPES.OTHER,
  }
}

