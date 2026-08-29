import ParametricDesk from './ParametricDesk.jsx'
import LibraryGlbModel from './LibraryGlbModel.jsx'
import { resolveFurnitureAsset } from '../../domain/furnitureAssets.js'

export default function FurnitureVisualModel({ furniture, warning = false, styleMode = 'ORIGINAL' }) {
  if (!furniture) return null

  if (furniture.modelStrategy.resolved === 'PARAMETRIC' && furniture.semantic.archetype === 'DESK') {
    return <ParametricDesk dimensionsM={furniture.physical.dimensionsM} warning={warning} styleMode={styleMode} colorVariantId={furniture.appearance?.colorVariantId} />
  }

  if (furniture.modelStrategy.resolved === 'LIBRARY' || furniture.modelStrategy.resolved === 'GENERATED') {
    const { asset } = resolveFurnitureAsset(furniture)
    if (asset?.modelUrl?.endsWith('.glb')) {
      return <LibraryGlbModel furniture={furniture} asset={asset} warning={warning} styleMode={styleMode} />
    }
  }

  return null
}
