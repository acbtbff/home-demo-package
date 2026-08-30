import * as THREE from 'three'
import { COZY_V0_PALETTE } from './cozyPalette.js'

function classifyColor(color) {
  const value = new THREE.Color(color); const hsl = {}; value.getHSL(hsl)
  if (hsl.s < 0.12) return 'neutral'; if (hsl.h < 0.12 || hsl.h > 0.95) return 'warm'
  if (hsl.h < 0.20) return 'yellow'; if (hsl.h < 0.45) return 'green'; if (hsl.h < 0.62) return 'blue'; return 'accent'
}
function mappedColor(color, palette) {
  return ({ neutral: palette.CREAM, warm: palette.TERRACOTTA, yellow: palette.BUTTER_YELLOW, green: palette.SAGE, blue: palette.DUSTY_BLUE, accent: palette.WARM_WHITE })[classifyColor(color)]
}

/** Visual-only pass; preserves single material vs material-array shape. */
export function applyCozyMaterial(root, { palette = COZY_V0_PALETTE, preserveExistingColors = true } = {}) {
  root.traverse((object) => {
    if (!object.isMesh) return
    const source = object.material; const sources = Array.isArray(source) ? source : [source]
    const next = sources.map((item) => {
      const material = item?.clone?.() || new THREE.MeshStandardMaterial()
      material.metalness = Math.min(Number(material.metalness) || 0, 0.05)
      material.roughness = Math.max(Number(material.roughness) || 0.82, 0.82)
      if (material.color) material.color.lerp(new THREE.Color(mappedColor(material.color, palette)), preserveExistingColors ? 0.35 : 1)
      material.envMapIntensity = 0.15; material.needsUpdate = true; return material
    })
    object.material = Array.isArray(source) ? next : next[0]; object.castShadow = true; object.receiveShadow = true
  })
  return root
}
export const applyCozyMaterialPass = applyCozyMaterial
