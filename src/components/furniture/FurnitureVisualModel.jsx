import ParametricDesk from './ParametricDesk.jsx'
import LibraryGlbModel from './LibraryGlbModel.jsx'
import { OFFICE_CHAIR_COZY_GEOMETRY_ASSET_V0, resolveFurnitureAsset } from '../../domain/furnitureAssets.js'

export default function FurnitureVisualModel({ furniture, warning = false, styleMode = 'ORIGINAL' }) {
  if (!furniture) return null

  if (furniture.modelStrategy.resolved === 'PARAMETRIC' && furniture.semantic.archetype === 'DESK') {
    return <ParametricDesk dimensionsM={furniture.physical.dimensionsM} warning={warning} styleMode={styleMode} wishlist={furniture.lifecycle?.status === 'WISHLIST'} />
  }

  if (furniture.modelStrategy.resolved === 'LIBRARY' || furniture.modelStrategy.resolved === 'GENERATED') {
    const resolved = resolveFurnitureAsset(furniture)
    const asset = styleMode === 'COZY_V0_GEOMETRY' && furniture.semantic.archetype === 'OFFICE_CHAIR'
      ? OFFICE_CHAIR_COZY_GEOMETRY_ASSET_V0
      : resolved.asset
    if (asset?.modelUrl?.endsWith('.glb')) {
      return <LibraryGlbModel furniture={furniture} asset={asset} warning={warning} styleMode={styleMode} wishlist={furniture.lifecycle?.status === 'WISHLIST'} />
    }
  }

  return null
}
