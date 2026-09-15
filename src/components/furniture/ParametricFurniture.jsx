import { RoundedBox } from '@react-three/drei'
import { COZY_V0_PALETTE, STYLE_BIBLE_V0 } from '../../domain/styleBible.js'

const COZY_MATERIALS = {
  wood: COZY_V0_PALETTE.DARK_WOOD,
  shadowWood: COZY_V0_PALETTE.SOFT_BLACK,
  accent: COZY_V0_PALETTE.LIGHT_WOOD,
  fabric: COZY_V0_PALETTE.WARM_WHITE,
}

const ORIGINAL_MATERIALS = {
  wood: '#6b4f36',
  shadowWood: '#332b25',
  accent: '#9a7651',
  fabric: '#d7d0c2',
}

function ParametricPart({ part, warning, styleMode, wishlist }) {
  const palette = styleMode === 'ORIGINAL' ? ORIGINAL_MATERIALS : COZY_MATERIALS
  const dimensions = [part.size.width, part.size.height, part.size.depth].map((value) => Math.max(0.001, value))
  const radius = Math.min(0.035, ...dimensions.map((value) => value * 0.25))
  return (
    <RoundedBox
      args={dimensions}
      radius={radius}
      smoothness={4}
      position={[part.position.x, part.position.y, part.position.z]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={warning ? '#ef4444' : palette[part.material] ?? palette.wood}
        roughness={STYLE_BIBLE_V0.materialDefaults.roughness}
        metalness={STYLE_BIBLE_V0.materialDefaults.metalness}
        transparent={wishlist}
        opacity={wishlist ? 0.64 : 1}
        depthWrite={!wishlist}
      />
    </RoundedBox>
  )
}

export default function ParametricFurniture({ furniture, resolution, warning = false, styleMode = 'ORIGINAL' }) {
  const spec = resolution?.generator?.(furniture?.physical?.dimensionsM ?? {})
  if (!spec) return null
  const wishlist = furniture?.lifecycle?.status === 'WISHLIST'
  return (
    <group
      name={`visual-model:parametric-${furniture.semantic.archetype.toLowerCase()}`}
      userData={{ visualModel: true, strategy: 'PARAMETRIC', archetype: furniture.semantic.archetype }}
    >
      {spec.parts.map((part) => <ParametricPart key={part.id} part={part} warning={warning} styleMode={styleMode} wishlist={wishlist} />)}
    </group>
  )
}
