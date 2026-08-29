export const VISUAL_MODEL_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
})

export function createVisualModelContract({ furnitureId = null, strategy = null, asset = null } = {}) {
  return {
    furnitureId,
    strategy,
    status: asset ? VISUAL_MODEL_STATUS.AVAILABLE : VISUAL_MODEL_STATUS.UNAVAILABLE,
    assetId: asset?.id ?? null,
    visual: asset ? { modelUrl: asset.modelUrl } : null,
    producesSpatialFacts: false,
  }
}
