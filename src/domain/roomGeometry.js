const EPSILON = 1e-9

export function getWallVector(wall) {
  return {
    x: wall.end.x - wall.start.x,
    z: wall.end.z - wall.start.z,
  }
}

export function getWallLength(wall) {
  const vector = getWallVector(wall)
  return Math.hypot(vector.x, vector.z)
}

export function getWallCenter(wall) {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
  }
}

export function getWallDirection(wall) {
  const vector = getWallVector(wall)
  const length = Math.hypot(vector.x, vector.z)

  if (length <= EPSILON) return { x: 0, z: 0 }

  return {
    x: vector.x / length,
    z: vector.z / length,
  }
}

export function getWallAngle(wall) {
  const vector = getWallVector(wall)
  return Math.atan2(vector.z, vector.x)
}

export function getOpeningWorldPosition(wall, opening) {
  const direction = getWallDirection(wall)
  return {
    x: wall.start.x + direction.x * opening.offset,
    y: opening.sillHeight + opening.height / 2,
    z: wall.start.z + direction.z * opening.offset,
  }
}

export function getWallsBounds(walls) {
  const points = walls.flatMap((wall) => [wall.start, wall.end])

  if (points.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0, centerX: 0, centerZ: 0 }
  }

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minZ = Math.min(...points.map((point) => point.z))
  const maxZ = Math.max(...points.map((point) => point.z))

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  }
}

export function getExteriorWallsBounds(walls) {
  return getWallsBounds(walls.filter((wall) => wall.kind === 'exterior'))
}
