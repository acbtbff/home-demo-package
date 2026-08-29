import { createFurniture } from './furnitureSchema.js'
import { routeFurnitureModelStrategy } from './furnitureRouter.js'
import { normalizeFurnitureSemantic } from './furnitureSemantic.js'

export const INTAKE_STATES = Object.freeze({
  UPLOADING: 'UPLOADING', RECOGNIZING: 'RECOGNIZING', CONFIRMING: 'CONFIRMING',
  CREATING: 'CREATING', CREATED: 'CREATED', ERROR: 'ERROR',
})

export const OWNERSHIP_LIFECYCLE_OPTIONS = Object.freeze({
  USER: { ownershipType: 'USER', lifecycleStatus: 'OWNED', label: '我的家具' },
  LANDLORD: { ownershipType: 'LANDLORD', lifecycleStatus: 'OWNED', label: '房东家具' },
  WISHLIST: { ownershipType: 'NONE', lifecycleStatus: 'WISHLIST', label: '想购买' },
})

export function centimetersToMeters(value) {
  const centimeters = Number(value)
  if (!Number.isFinite(centimeters) || centimeters <= 0) return null
  return centimeters / 100
}

export function dimensionsCmToMeters({ width, depth, height } = {}) {
  return { width: centimetersToMeters(width), depth: centimetersToMeters(depth), height: centimetersToMeters(height) }
}

export function createFurnitureFromIntake({ id, name, archetype, category, dimensionsCm, ownershipKey = 'USER', photo } = {}) {
  const semantic = normalizeFurnitureSemantic({ archetype, category })
  const dimensionsM = dimensionsCmToMeters(dimensionsCm)
  if (!Object.values(dimensionsM).every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('All furniture dimensions must be positive numbers in centimeters')
  }
  const ownership = OWNERSHIP_LIFECYCLE_OPTIONS[ownershipKey] ?? OWNERSHIP_LIFECYCLE_OPTIONS.USER
  const strategy = routeFurnitureModelStrategy(semantic) ?? 'GENERATED'
  return createFurniture({
    id, name: name || semantic.archetype,
    semantic, physical: { dimensionsM },
    ownership: { type: ownership.ownershipType },
    lifecycle: { status: ownership.lifecycleStatus },
    modelStrategy: { preferred: strategy, resolved: strategy },
    intakeMetadata: photo ? { fileName: photo.name ?? null, mimeType: photo.type ?? null, previewUrl: photo.previewUrl ?? null, recognitionSource: 'DEMO' } : null,
  })
}
