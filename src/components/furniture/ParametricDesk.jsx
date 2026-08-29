import { RoundedBox } from '@react-three/drei'
import { COZY_V0_PALETTE, STYLE_BIBLE_V0 } from '../../domain/styleBible.js'
import { createParametricDeskSpec } from '../../domain/parametricDesk.js'

const MATERIALS = {
  cozy: { wood: COZY_V0_PALETTE.DARK_WOOD, shadowWood: COZY_V0_PALETTE.SOFT_BLACK },
  original: { wood: '#6b4f36', shadowWood: '#332b25' },
}

function DeskPart({ part, warning, styleMode }) {
  const palette = styleMode !== 'ORIGINAL' ? MATERIALS.cozy : MATERIALS.original
  const color = warning ? '#ef4444' : palette[part.material] ?? palette.wood

  return (
    <RoundedBox
      args={[part.size.width, part.size.height, part.size.depth]}
      radius={Math.min(0.035, Math.min(part.size.width, part.size.height, part.size.depth) * 0.25)}
      smoothness={4}
      position={[part.position.x, part.position.y, part.position.z]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={STYLE_BIBLE_V0.materialDefaults.roughness}
        metalness={STYLE_BIBLE_V0.materialDefaults.metalness}
      />
    </RoundedBox>
  )
}

export default function ParametricDesk({ dimensionsM, warning = false, styleMode = 'ORIGINAL' }) {
  const spec = createParametricDeskSpec(dimensionsM)

  return (
    <group name="visual-model:parametric-desk" userData={{ visualModel: true, strategy: 'PARAMETRIC', archetype: 'DESK' }}>
      {spec.parts.map((part) => <DeskPart key={part.id} part={part} warning={warning} styleMode={styleMode} />)}
    </group>
  )
}
