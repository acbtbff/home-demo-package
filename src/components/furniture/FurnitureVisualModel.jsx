import ParametricDesk from './ParametricDesk.jsx'
import LibraryGlbModel from './LibraryGlbModel.jsx'
import { OFFICE_CHAIR_COZY_GEOMETRY_ASSET_V0 } from '../../domain/furnitureAssets.js'
import { resolveFurnitureModel } from '../../domain/furnitureModelResolver.js'

export default function FurnitureVisualModel({ furniture, warning = false, styleMode = 'ORIGINAL' }) {
  if (!furniture) return null

  const resolution = resolveFurnitureModel(furniture)

  if (resolution.visualModelAvailable && resolution.strategy === 'PARAMETRIC' && resolution.generatorKey === 'DESK') {
    return <ParametricDesk dimensionsM={furniture.physical.dimensionsM} warning={warning} styleMode={styleMode} wishlist={furniture.lifecycle?.status === 'WISHLIST'} />
  }

  if (resolution.visualModelAvailable && resolution.strategy === 'LIBRARY') {
    const asset = styleMode === 'COZY_V0_GEOMETRY' && furniture.semantic.archetype === 'OFFICE_CHAIR'
      ? OFFICE_CHAIR_COZY_GEOMETRY_ASSET_V0
      : resolution.asset
    if (asset?.modelUrl?.endsWith('.glb')) {
      return <LibraryGlbModel furniture={furniture} asset={asset} warning={warning} styleMode={styleMode} wishlist={furniture.lifecycle?.status === 'WISHLIST'} />
    }
  }

  return null
}
