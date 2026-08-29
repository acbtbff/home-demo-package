export const STYLE_FAMILIES = Object.freeze({
  COZY_V0: 'COZY_V0',
})

export const COZY_V0_PALETTE = Object.freeze({
  WARM_WHITE: '#f6f0e7',
  CREAM: '#eadfcf',
  LIGHT_WOOD: '#caa978',
  DARK_WOOD: '#6f5438',
  SAGE: '#8fa58d',
  DUSTY_BLUE: '#7897a8',
  TERRACOTTA: '#b86f4b',
  BUTTER_YELLOW: '#e7c76e',
  WARM_GRAY: '#9a9288',
  CHARCOAL: '#343536',
  CLAY: '#a9826a',
  SOFT_BLACK: '#242424',
})

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

