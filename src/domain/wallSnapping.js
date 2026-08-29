const distanceBetween = (left, right) => Math.hypot(left.x - right.x, left.z - right.z)

export const WALL_SNAP_THRESHOLD = 0.1
export const WALL_SNAP_RELEASE_THRESHOLD = 0.15

function projectPointToWall(point, wall) {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared <= Number.EPSILON) return { ...wall.start }
  const ratio = Math.max(0, Math.min(1, ((point.x - wall.start.x) * dx + (point.z - wall.start.z) * dz) / lengthSquared))
  return { x: wall.start.x + dx * ratio, z: wall.start.z + dz * ratio }
}

/** Finds the closest endpoint or any point along another wall segment. */
export function findNearestWallSnap(point, walls, { excludedWallId = null, excludedWallIds = [], maxDistance = WALL_SNAP_THRESHOLD } = {}) {
  const excluded = new Set(excludedWallId ? [excludedWallId, ...excludedWallIds] : excludedWallIds)
  let closest = null
  const consider = (target, wallId, type, priority) => {
    const distance = distanceBetween(point, target)
    if (distance > maxDistance) return
    if (!closest || distance < closest.distance - 1e-9 || (Math.abs(distance - closest.distance) <= 1e-9 && priority > closest.priority)) {
      closest = { point: { ...target }, wallId, type, distance, priority }
    }
  }

  for (const wall of walls ?? []) {
    if (excluded.has(wall.id)) continue
    consider(wall.start, wall.id, 'endpoint', 2)
    consider(wall.end, wall.id, 'endpoint', 2)
    consider(projectPointToWall(point, wall), wall.id, 'segment', 1)
  }

  if (!closest) return null
  const { priority: _priority, ...snap } = closest
  return snap
}

/** Moves a complete wall without changing its length, snapping either endpoint to another wall. */
export function snapWallByTranslation(wall, walls, options = {}) {
  const candidates = [
    { endpoint: 'start', source: wall.start, snap: findNearestWallSnap(wall.start, walls, { ...options, excludedWallId: wall.id }) },
    { endpoint: 'end', source: wall.end, snap: findNearestWallSnap(wall.end, walls, { ...options, excludedWallId: wall.id }) },
  ].filter((candidate) => candidate.snap)

  if (candidates.length === 0) return { start: wall.start, end: wall.end, snapped: false, snap: null }
  candidates.sort((left, right) => left.snap.distance - right.snap.distance)
  const candidate = candidates[0]
  const delta = {
    x: candidate.snap.point.x - candidate.source.x,
    z: candidate.snap.point.z - candidate.source.z,
  }
  return {
    start: { x: wall.start.x + delta.x, z: wall.start.z + delta.z },
    end: { x: wall.end.x + delta.x, z: wall.end.z + delta.z },
    snapped: true,
    snap: { ...candidate.snap, movingEndpoint: candidate.endpoint },
  }
}
