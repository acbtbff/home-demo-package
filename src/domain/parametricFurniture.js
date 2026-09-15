const clampDimension = (value, fallback, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return Math.min(max, Math.max(min, number))
}

function dimensionsFor(input, defaults, limits) {
  return {
    width: clampDimension(input.width, defaults.width, limits.width[0], limits.width[1]),
    depth: clampDimension(input.depth, defaults.depth, limits.depth[0], limits.depth[1]),
    height: clampDimension(input.height, defaults.height, limits.height[0], limits.height[1]),
  }
}

const roundedBox = (id, size, position, material = 'wood') => ({
  id,
  kind: 'rounded-box',
  size,
  position,
  material,
})

export function createParametricNightstandSpec(dimensionsM = {}) {
  const dimensions = dimensionsFor(dimensionsM, { width: 0.45, depth: 0.4, height: 0.55 }, {
    width: [0.25, 1.5], depth: [0.2, 1.2], height: [0.3, 2],
  })
  const { width, depth, height } = dimensions
  const topThickness = Math.min(0.07, Math.max(0.04, height * 0.08))
  const footHeight = Math.min(0.08, Math.max(0.035, height * 0.08))
  const bodyHeight = Math.max(0.12, height - topThickness - footHeight)
  const bodyWidth = width * 0.9
  const bodyDepth = depth * 0.9
  const panelHeight = Math.max(0.07, bodyHeight * 0.28)
  const panelThickness = Math.min(0.035, depth * 0.08)
  const footWidth = Math.min(0.06, width * 0.14)
  const footDepth = Math.min(0.06, depth * 0.14)

  return {
    dimensionsM: dimensions,
    parts: [
      roundedBox('cabinet-body', { width: bodyWidth, height: bodyHeight, depth: bodyDepth }, { x: 0, y: footHeight + bodyHeight / 2, z: 0 }),
      roundedBox('top', { width, height: topThickness, depth }, { x: 0, y: height - topThickness / 2, z: 0 }, 'shadowWood'),
      roundedBox('drawer-upper', { width: bodyWidth * 0.78, height: panelHeight, depth: panelThickness }, { x: 0, y: footHeight + bodyHeight * 0.72, z: depth / 2 - panelThickness / 2 }, 'accent'),
      roundedBox('drawer-lower', { width: bodyWidth * 0.78, height: panelHeight, depth: panelThickness }, { x: 0, y: footHeight + bodyHeight * 0.38, z: depth / 2 - panelThickness / 2 }, 'accent'),
      ...[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => roundedBox(
        `foot-${xSign}-${zSign}`,
        { width: footWidth, height: footHeight, depth: footDepth },
        { x: xSign * (width / 2 - footWidth / 2), y: footHeight / 2, z: zSign * (depth / 2 - footDepth / 2) },
      ))),
    ],
  }
}

export function createParametricDoubleBedSpec(dimensionsM = {}) {
  const dimensions = dimensionsFor(dimensionsM, { width: 1.5, depth: 2, height: 0.9 }, {
    width: [0.9, 3], depth: [1.6, 3.5], height: [0.35, 2],
  })
  const { width, depth, height } = dimensions
  const headboardDepth = Math.min(0.1, depth * 0.06)
  const frameHeight = Math.min(height * 0.34, Math.max(0.16, height * 0.24))
  const mattressHeight = Math.min(height * 0.3, Math.max(0.12, height * 0.22))
  const mattressDepth = Math.max(0.5, depth - headboardDepth)
  const railThickness = Math.min(0.08, Math.max(0.04, Math.min(width, depth) * 0.035))

  return {
    dimensionsM: dimensions,
    parts: [
      roundedBox('bed-frame', { width, height: frameHeight, depth }, { x: 0, y: frameHeight / 2, z: 0 }, 'shadowWood'),
      roundedBox('mattress', { width: width * 0.94, height: mattressHeight, depth: mattressDepth * 0.96 }, { x: 0, y: frameHeight + mattressHeight / 2, z: headboardDepth / 2 }, 'fabric'),
      roundedBox('headboard', { width, height: height, depth: headboardDepth }, { x: 0, y: height / 2, z: -depth / 2 + headboardDepth / 2 }, 'wood'),
      ...[-1, 1].map((xSign) => roundedBox(
        `side-rail-${xSign}`,
        { width: railThickness, height: frameHeight * 0.82, depth: depth * 0.94 },
        { x: xSign * (width / 2 - railThickness / 2), y: frameHeight * 0.41, z: 0 },
        'wood',
      )),
    ],
  }
}

export function createParametricCabinetSpec(dimensionsM = {}) {
  const dimensions = dimensionsFor(dimensionsM, { width: 0.8, depth: 0.4, height: 1 }, {
    width: [0.3, 3], depth: [0.2, 2], height: [0.4, 3],
  })
  const { width, depth, height } = dimensions
  const topThickness = Math.min(0.07, Math.max(0.04, height * 0.06))
  const footHeight = Math.min(0.08, Math.max(0.035, height * 0.06))
  const bodyHeight = Math.max(0.2, height - topThickness - footHeight)
  const bodyWidth = width * 0.94
  const bodyDepth = depth * 0.92
  const doorGap = Math.min(0.025, width * 0.02)
  const doorWidth = Math.max(0.08, (bodyWidth - doorGap) / 2)
  const doorThickness = Math.min(0.035, depth * 0.08)
  const footWidth = Math.min(0.07, width * 0.12)

  return {
    dimensionsM: dimensions,
    parts: [
      roundedBox('cabinet-body', { width: bodyWidth, height: bodyHeight, depth: bodyDepth }, { x: 0, y: footHeight + bodyHeight / 2, z: 0 }),
      roundedBox('cabinet-top', { width, height: topThickness, depth }, { x: 0, y: height - topThickness / 2, z: 0 }, 'shadowWood'),
      roundedBox('door-left', { width: doorWidth, height: bodyHeight * 0.88, depth: doorThickness }, { x: -(doorWidth + doorGap) / 2, y: footHeight + bodyHeight / 2, z: depth / 2 - doorThickness / 2 }, 'accent'),
      roundedBox('door-right', { width: doorWidth, height: bodyHeight * 0.88, depth: doorThickness }, { x: (doorWidth + doorGap) / 2, y: footHeight + bodyHeight / 2, z: depth / 2 - doorThickness / 2 }, 'accent'),
      ...[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => roundedBox(
        `foot-${xSign}-${zSign}`,
        { width: footWidth, height: footHeight, depth: footWidth },
        { x: xSign * (width / 2 - footWidth / 2), y: footHeight / 2, z: zSign * (depth / 2 - footWidth / 2) },
      ))),
    ],
  }
}

export function createParametricCoffeeTableSpec(dimensionsM = {}) {
  const dimensions = dimensionsFor(dimensionsM, { width: 1, depth: 0.5, height: 0.42 }, {
    width: [0.4, 3], depth: [0.25, 2], height: [0.2, 1.5],
  })
  const { width, depth, height } = dimensions
  const topThickness = Math.min(0.07, Math.max(0.035, height * 0.11))
  const legThickness = Math.min(0.08, Math.max(0.035, Math.min(width, depth) * 0.1))
  const supportHeight = Math.max(0.06, height - topThickness)
  const insetX = Math.max(legThickness * 1.2, width * 0.1)
  const insetZ = Math.max(legThickness * 1.2, depth * 0.14)

  return {
    dimensionsM: dimensions,
    parts: [
      roundedBox('tabletop', { width, height: topThickness, depth }, { x: 0, y: height - topThickness / 2, z: 0 }, 'wood'),
      ...[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => roundedBox(
        `leg-${xSign}-${zSign}`,
        { width: legThickness, height: supportHeight, depth: legThickness },
        { x: xSign * (width / 2 - insetX), y: supportHeight / 2, z: zSign * (depth / 2 - insetZ) },
        'shadowWood',
      ))),
      roundedBox('lower-shelf', { width: width * 0.68, height: Math.min(0.045, height * 0.09), depth: depth * 0.62 }, { x: 0, y: supportHeight * 0.28, z: 0 }, 'accent'),
    ],
  }
}

export const PARAMETRIC_FURNITURE_GENERATORS_V0 = Object.freeze({
  NIGHTSTAND: createParametricNightstandSpec,
  DOUBLE_BED: createParametricDoubleBedSpec,
  CABINET: createParametricCabinetSpec,
  COFFEE_TABLE: createParametricCoffeeTableSpec,
})
