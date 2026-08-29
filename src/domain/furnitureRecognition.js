import { categoryForArchetype, FURNITURE_ARCHETYPES } from './furnitureTaxonomy.js'

export const RECOGNITION_SOURCES = Object.freeze({ DEMO: 'DEMO', REMOTE: 'REMOTE' })

const DEMO_KEYWORDS = Object.freeze([
  ['OFFICE_CHAIR', ['chair', '椅', 'office-chair']],
  ['DESK', ['desk', 'table', '书桌', '桌']],
  ['LADDER_SPECIAL', ['ladder', '梯子']],
])

export function recognizeFurniturePhoto(input = {}) {
  const hint = String(input.demoHint ?? input.file?.name ?? '').toLowerCase()
  const match = DEMO_KEYWORDS.find(([, terms]) => terms.some((term) => hint.includes(term)))
  const archetype = match?.[0] ?? FURNITURE_ARCHETYPES.OTHER
  return {
    category: categoryForArchetype(archetype),
    archetype,
    confidence: match ? 0.94 : 0.2,
    source: RECOGNITION_SOURCES.DEMO,
  }
}

export function createRemoteVisionRecognitionProvider() {
  return {
    source: RECOGNITION_SOURCES.REMOTE,
    async recognize() {
      throw new Error('Remote vision recognition is not enabled in Furniture Intake V0')
    },
  }
}
