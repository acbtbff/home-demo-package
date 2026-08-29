export const STYLE_FAMILIES = Object.freeze({
  COZY_V0: 'COZY_V0',
})

import { COZY_V0_PALETTE } from '../styles/cozy/cozyPalette.js'

export { COZY_V0_PALETTE }

export const STYLE_BIBLE_V0 = Object.freeze({
  id: STYLE_FAMILIES.COZY_V0,
  name: 'Cozy Stylized 3D Home',
  principles: Object.freeze([
    'clear silhouette',
    'rounded forms',
    'low detail',
    'remove tiny mechanical structures',
    'fewer sharp edges',
    'slightly thicker structural rods',
    'simplified surfaces',
    'low metallic',
    'medium/high roughness',
    'low reflection',
    'weak texture dependency',
  ]),
  palette: COZY_V0_PALETTE,
  materialDefaults: Object.freeze({
    metalness: 0.05,
    roughness: 0.72,
    reflectivity: 0.18,
  }),
})

export const STYLE_PIPELINE_CONTRACT = Object.freeze([
  'units normalization',
  'coordinate normalization',
  'pivot normalization',
  'cleanup',
  'simplification',
  'detail removal',
  'material normalization',
  'palette mapping',
  'bounding box verification',
  'web-compatible visual representation output',
])

