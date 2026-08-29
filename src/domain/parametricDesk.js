const clampDimension = (value, fallback, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

export function createParametricDeskSpec(dimensionsM = {}) {
  const width = clampDimension(dimensionsM.width, 1.2, 0.6, 3)
  const depth = clampDimension(dimensionsM.depth, 0.6, 0.35, 1.2)
  const height = clampDimension(dimensionsM.height, 0.75, 0.45, 1.2)
  const topThickness = Math.min(0.08, Math.max(0.045, height * 0.08))
  const legThickness = Math.min(0.08, Math.max(0.045, Math.min(width, depth) * 0.08))
  const supportHeight = Math.max(0.05, height - topThickness)
  const insetX = Math.max(legThickness * 1.15, width * 0.08)
  const insetZ = Math.max(legThickness * 1.15, depth * 0.12)
  const pedestalWidth = Math.min(width * 0.28, 0.34)
  const modestyPanelHeight = Math.max(0.16, supportHeight * 0.32)

  return {
    dimensionsM: { width, depth, height },
    parts: [
      {
        id: 'tabletop',
        kind: 'rounded-box',
        size: { width, height: topThickness, depth },
        position: { x: 0, y: height - topThickness / 2, z: 0 },
        material: 'wood',
      },
      ...[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => ({
        id: `leg-${xSign}-${zSign}`,
        kind: 'rounded-box',
        size: { width: legThickness, height: supportHeight, depth: legThickness },
        position: {
          x: xSign * (width / 2 - insetX),
          y: supportHeight / 2,
          z: zSign * (depth / 2 - insetZ),
        },
        material: 'wood',
      }))),
      {
        id: 'side-storage',
        kind: 'rounded-box',
        size: { width: pedestalWidth, height: supportHeight * 0.82, depth: depth * 0.78 },
        position: {
          x: width / 2 - insetX - pedestalWidth / 2,
          y: supportHeight * 0.41,
          z: 0,
        },
        material: 'wood',
      },
      {
        id: 'back-modesty-panel',
        kind: 'rounded-box',
        size: { width: width * 0.72, height: modestyPanelHeight, depth: Math.max(0.025, legThickness * 0.55) },
        position: {
          x: -width * 0.06,
          y: supportHeight - modestyPanelHeight / 2,
          z: -depth / 2 + insetZ * 0.65,
        },
        material: 'shadowWood',
      },
    ],
  }
}

