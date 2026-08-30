import { normalizeFurnitureSemantic } from './furnitureSemantic.js'
import { resolveFurnitureAsset } from './furnitureAssets.js'
import {
  CAPABILITY_FALLBACKS,
  CAPABILITY_STATUS,
  MODEL_STRATEGIES,
  getFurnitureCapability,
} from './furnitureCapabilityRegistry.js'

export const MODEL_RESOLUTION_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PENDING: 'PENDING',
})

export function resolveFurnitureModel(furnitureOrSemantic = {}, options = {}) {
  const semantic = normalizeFurnitureSemantic(furnitureOrSemantic?.semantic ?? furnitureOrSemantic)
  const capability = getFurnitureCapability(semantic)
  const strategy = furnitureOrSemantic?.modelStrategy?.resolved
    ?? capability.preferredStrategy
  const dimensionsM = furnitureOrSemantic?.physical?.dimensionsM ?? {}

  if (strategy === MODEL_STRATEGIES.PARAMETRIC) {
    if (capability.capabilityStatus === CAPABILITY_STATUS.READY && typeof capability.handler === 'function') {
      return {
        semantic,
        capability,
        strategy,
        status: MODEL_RESOLUTION_STATUS.AVAILABLE,
        representationType: 'PARAMETRIC',
        generatorKey: capability.generatorKey,
        generator: capability.handler,
        generatorInput: dimensionsM,
        asset: null,
        visualModelAvailable: true,
        fallback: null,
      }
    }
    return pendingResolution({ semantic, capability, strategy, representationType: 'PARAMETRIC' })
  }

  if (strategy === MODEL_STRATEGIES.LIBRARY) {
    const resolved = resolveFurnitureAsset(furnitureOrSemantic, options.assetPool ?? capability.assetPool)
    if (resolved.asset) {
      return {
        semantic,
        capability,
        strategy,
        status: MODEL_RESOLUTION_STATUS.AVAILABLE,
        representationType: 'LIBRARY',
        generatorKey: null,
        generator: null,
        generatorInput: null,
        asset: resolved.asset,
        visualModelAvailable: true,
        fallback: null,
      }
    }
    return pendingResolution({ semantic, capability, strategy, representationType: 'LIBRARY' })
  }

  return pendingResolution({ semantic, capability, strategy: MODEL_STRATEGIES.GENERATED, representationType: 'GENERATED' })
}

function pendingResolution({ semantic, capability, strategy, representationType }) {
  return {
    semantic,
    capability,
    strategy,
    status: MODEL_RESOLUTION_STATUS.PENDING,
    representationType,
    generatorKey: capability.generatorKey,
    generator: null,
    generatorInput: null,
    asset: null,
    visualModelAvailable: false,
    fallback: CAPABILITY_FALLBACKS.PROXY_ONLY,
    pendingReason: strategy === MODEL_STRATEGIES.GENERATED
      ? CAPABILITY_FALLBACKS.GENERATED_PENDING
      : capability.capabilityStatus,
  }
}

export const resolveFurnitureRepresentation = resolveFurnitureModel
