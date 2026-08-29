import { normalizeFurnitureSemantic } from './furnitureSemantic.js'

export const ASSET_SOURCES = Object.freeze({
  LOCAL: 'LOCAL',
  PURCHASED: 'PURCHASED',
  GENERATED: 'GENERATED',
  INTERNAL: 'INTERNAL',
})

export const ASSET_STATUSES = Object.freeze({
  READY: 'READY',
  PLACEHOLDER: 'PLACEHOLDER',
  UNAVAILABLE: 'UNAVAILABLE',
})

export const LIBRARY_ASPECT_RATIO_POLICY = Object.freeze({
  // Relative deviation above this value is surfaced as a contract warning.
  // V0 does not attempt asset matching or silently change physical dimensions.
  maxRelativeDeviation: 0.35,
  severeAction: 'WARN_AND_REVIEW_ASSET',
})

function positiveDimensions(value) {
  const width = Number(value?.width)
  const depth = Number(value?.depth)
  const height = Number(value?.height)
  if (![width, depth, height].every((item) => Number.isFinite(item) && item > 0)) return null
  return { width, depth, height }
}

function aspectRatios(dimensions) {
  return {
    widthDepth: dimensions.width / dimensions.depth,
    widthHeight: dimensions.width / dimensions.height,
    depthHeight: dimensions.depth / dimensions.height,
  }
}

/**
 * Calculate LIBRARY calibration from an asset bounding box to canonical
 * Furniture dimensions. Bounding-box dimensions are inputs to visual
 * calibration only and never become Furniture physical facts.
 */
export function calculateLibraryVisualCalibration({ assetDimensionsM, targetDimensionsM, maxRelativeDeviation = LIBRARY_ASPECT_RATIO_POLICY.maxRelativeDeviation } = {}) {
  const asset = positiveDimensions(assetDimensionsM)
  const target = positiveDimensions(targetDimensionsM)
  if (!asset || !target) {
    return {
      scale: null,
      aspectRatioDeviation: null,
      severeAspectMismatch: false,
      canCalibrate: false,
    }
  }

  const assetAspect = aspectRatios(asset)
  const targetAspect = aspectRatios(target)
  const deviations = Object.keys(assetAspect).map((key) => Math.abs(assetAspect[key] - targetAspect[key]) / targetAspect[key])
  const aspectRatioDeviation = Math.max(...deviations)

  return {
    scale: [target.width / asset.width, target.height / asset.height, target.depth / asset.depth],
    aspectRatioDeviation,
    severeAspectMismatch: aspectRatioDeviation > maxRelativeDeviation,
    canCalibrate: true,
  }
}

export const getLibraryVisualCalibration = calculateLibraryVisualCalibration

export function createAssetContract(input = {}) {
  const semantic = normalizeFurnitureSemantic(input.archetype ?? input.semanticMatch ?? input)
  return Object.freeze({
    id: input.id ?? input.assetId ?? null,
    archetype: semantic.archetype,
    modelUrl: input.modelUrl ?? input.visual?.modelUrl ?? null,
    referenceDimensionsM: Object.freeze({
      width: input.referenceDimensionsM?.width ?? null,
      depth: input.referenceDimensionsM?.depth ?? null,
      height: input.referenceDimensionsM?.height ?? null,
    }),
    styleFamily: input.styleFamily ?? null,
    source: input.source ?? ASSET_SOURCES.INTERNAL,
    status: input.status ?? ASSET_STATUSES.UNAVAILABLE,
    normalization: Object.freeze({
      rotationX: input.normalization?.rotationX ?? 0,
      rotationY: input.normalization?.rotationY ?? 0,
      rotationZ: input.normalization?.rotationZ ?? 0,
      rotationOrder: input.normalization?.rotationOrder ?? 'XYZ',
      offsetX: input.normalization?.offsetX ?? 0,
      offsetY: input.normalization?.offsetY ?? 0,
      offsetZ: input.normalization?.offsetZ ?? 0,
    }),
  })
}

export const OFFICE_CHAIR_LIBRARY_ASSET_V0 = createAssetContract({
  id: 'office-chair-local-v0',
  archetype: 'OFFICE_CHAIR',
  modelUrl: '/assets/furniture/office-chair.glb',
  referenceDimensionsM: { width: null, depth: null, height: null },
  styleFamily: 'COZY_V0',
  source: ASSET_SOURCES.LOCAL,
  status: ASSET_STATUSES.READY,
  normalization: {
    rotationX: -0.31798171,
    rotationY: -0.31996933,
    rotationZ: 0.00456702,
    rotationOrder: 'YXZ',
  },
})

export const OFFICE_CHAIR_COZY_GEOMETRY_ASSET_V0 = createAssetContract({
  id: 'office-chair-cozy-v0',
  archetype: 'OFFICE_CHAIR',
  modelUrl: '/assets/furniture/office-chair-cozy-v0.glb',
  referenceDimensionsM: { width: null, depth: null, height: null },
  styleFamily: 'COZY_V0',
  source: ASSET_SOURCES.INTERNAL,
  status: ASSET_STATUSES.READY,
  normalization: {
    rotationX: OFFICE_CHAIR_LIBRARY_ASSET_V0.normalization.rotationX,
    rotationY: OFFICE_CHAIR_LIBRARY_ASSET_V0.normalization.rotationY,
    rotationZ: OFFICE_CHAIR_LIBRARY_ASSET_V0.normalization.rotationZ,
    rotationOrder: OFFICE_CHAIR_LIBRARY_ASSET_V0.normalization.rotationOrder,
  },
})

export const TWO_SEAT_SOFA_LIBRARY_ASSET_V0 = createAssetContract({
  id: 'two-seat-sofa-local-v0',
  archetype: 'TWO_SEAT_SOFA',
  modelUrl: '/assets/furniture/two-seat-sofa.glb',
  referenceDimensionsM: { width: 1.72, depth: 0.86, height: 0.82 },
  styleFamily: 'COZY_V0',
  source: ASSET_SOURCES.LOCAL,
  status: ASSET_STATUSES.READY,
  normalization: {
    rotationX: -0.26055822,
    rotationY: -0.26162195,
    rotationZ: 0,
    rotationOrder: 'YXZ',
  },
})

export const FLOOR_LAMP_LIBRARY_ASSET_V0 = createAssetContract({
  id: 'floor-lamp-local-v0',
  archetype: 'FLOOR_LAMP',
  modelUrl: '/assets/furniture/floor-lamp.glb',
  referenceDimensionsM: { width: null, depth: null, height: null },
  styleFamily: 'COZY_V0',
  source: ASSET_SOURCES.LOCAL,
  status: ASSET_STATUSES.READY,
  normalization: {
    rotationY: -0.63847124,
  },
})

// GENERATED V0 remains a deliberate integration slot. The prior photo-to-3D
// experiment is not part of this handoff package, so the asset is explicitly
// UNAVAILABLE rather than silently replaced by a fake model.
export const LADDER_SPECIAL_GENERATED_ASSET_PENDING_V0 = createAssetContract({
  id: 'ladder-special-generated-pending-v0',
  archetype: 'LADDER_SPECIAL',
  modelUrl: null,
  referenceDimensionsM: { width: null, depth: null, height: null },
  styleFamily: 'COZY_V0',
  source: ASSET_SOURCES.GENERATED,
  status: ASSET_STATUSES.UNAVAILABLE,
})

export const DEFAULT_ASSET_REGISTRY_V0 = Object.freeze([
  OFFICE_CHAIR_LIBRARY_ASSET_V0,
  TWO_SEAT_SOFA_LIBRARY_ASSET_V0,
  FLOOR_LAMP_LIBRARY_ASSET_V0,
  LADDER_SPECIAL_GENERATED_ASSET_PENDING_V0,
])

export function resolveFurnitureAsset(furnitureOrArchetype, registry = DEFAULT_ASSET_REGISTRY_V0) {
  const semantic = normalizeFurnitureSemantic(furnitureOrArchetype?.semantic ?? furnitureOrArchetype)
  const entries = Array.isArray(registry) ? registry : []
  const asset = entries.find((entry) => (
    entry?.archetype === semantic.archetype
    && entry.status === ASSET_STATUSES.READY
    && Boolean(entry.modelUrl)
  )) ?? null

  return {
    semantic,
    asset,
    status: asset ? ASSET_STATUSES.READY : ASSET_STATUSES.UNAVAILABLE,
    visualModelAvailable: Boolean(asset),
    fallback: asset ? null : 'GEOMETRY_PROXY',
  }
}
