import { RoundedBox } from '@react-three/drei'
import { COZY_V0_PALETTE, STYLE_BIBLE_V0 } from '../../domain/styleBible.js'
import { createParametricDeskSpec } from '../../domain/parametricDesk.js'

const MATERIALS = {
  wood: COZY_V0_PALETTE.DARK_WOOD,
  shadowWood: COZY_V0_PALETTE.SOFT_BLACK,
}

function DeskPart({ part, warning }) {
  const color = warning ? '#ef4444' : MATERIALS[part.material] ?? COZY_V0_PALETTE.DARK_WOOD

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

export default function ParametricDesk({ dimensionsM, warning = false }) {
  const spec = createParametricDeskSpec(dimensionsM)

  return (
    <group name="visual-model:parametric-desk" userData={{ visualModel: true, strategy: 'PARAMETRIC', archetype: 'DESK' }}>
      {spec.parts.map((part) => <DeskPart key={part.id} part={part} warning={warning} />)}
    </group>
  )
}
