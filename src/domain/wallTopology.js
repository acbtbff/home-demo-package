import { getWallLength } from './roomGeometry.js'

export const WALL_ENDPOINT_TOLERANCE = 0.1

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function pointToSegment(point, wall) {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared <= Number.EPSILON) return { distance: distance(point, wall.start), point: { ...wall.start } }
  const ratio = Math.max(0, Math.min(1, ((point.x - wall.start.x) * dx + (point.z - wall.start.z) * dz) / lengthSquared))
  const projected = { x: wall.start.x + dx * ratio, z: wall.start.z + dz * ratio }
  return { distance: distance(point, projected), point: projected }
}

/** Returns the endpoint references that share a logical vertex with a wall endpoint. */
export function getConnectedWallEndpoints(walls, wallId, endpoint, { tolerance = WALL_ENDPOINT_TOLERANCE } = {}) {
  const sourceWall = (walls ?? []).find((wall) => wall.id === wallId)
  const sourcePoint = sourceWall?.[endpoint]
  if (!sourcePoint) return []

  return (walls ?? []).flatMap((wall) => ['start', 'end']
    .filter((candidateEndpoint) => !(wall.id === wallId && candidateEndpoint === endpoint))
    .filter((candidateEndpoint) => distance(wall[candidateEndpoint], sourcePoint) <= tolerance)
    .map((candidateEndpoint) => ({ wallId: wall.id, endpoint: candidateEndpoint })))
}

export function getConnectedWallEndpointsForWall(walls, wallId, { tolerance = WALL_ENDPOINT_TOLERANCE } = {}) {
  const sourceWall = (walls ?? []).find((wall) => wall.id === wallId)
  if (!sourceWall) return []
  const refs = ['start', 'end'].flatMap((endpoint) => getConnectedWallEndpoints(walls, wallId, endpoint, { tolerance }))
  return [...new Map(refs.map((ref) => [`${ref.wallId}:${ref.endpoint}`, ref])).values()]
}

function createUnionFind(size) {
  const parent = Array.from({ length: size }, (_, index) => index)
  const find = (value) => {
    let root = value
    while (parent[root] !== root) root = parent[root]
    while (parent[value] !== value) {
      const next = parent[value]
      parent[value] = root
      value = next
    }
    return root
  }
  const union = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot
  }
  return { find, union }
}

/**
 * Groups wall endpoints that are within tolerance and reports endpoints that
 * do not connect to another wall endpoint. A closed room may contain interior
 * partitions; every endpoint still needs to belong to a connected wall graph.
 */
export function analyzeWallClosure(walls, { tolerance = WALL_ENDPOINT_TOLERANCE } = {}) {
  const endpoints = (walls ?? []).flatMap((wall) => [
    { wallId: wall.id, endpoint: 'start', point: wall.start },
    { wallId: wall.id, endpoint: 'end', point: wall.end },
  ])

  if (endpoints.length === 0) {
    return { isClosed: false, openEndpoints: [], components: [], tolerance }
  }

  const unionFind = createUnionFind(endpoints.length)
  const connected = endpoints.map(() => false)
  for (let index = 0; index < endpoints.length; index += 1) {
    for (let other = index + 1; other < endpoints.length; other += 1) {
      // The two ends of one wall are never a connection to itself.
      if (endpoints[index].wallId === endpoints[other].wallId) continue
      if (distance(endpoints[index].point, endpoints[other].point) <= tolerance) {
        unionFind.union(index, other)
        connected[index] = true
        connected[other] = true
      }
    }
    for (const wall of walls ?? []) {
      if (wall.id === endpoints[index].wallId) continue
      if (pointToSegment(endpoints[index].point, wall).distance <= tolerance) {
        connected[index] = true
        break
      }
    }
  }

  const groups = new Map()
  endpoints.forEach((endpoint, index) => {
    const root = unionFind.find(index)
    const group = groups.get(root) ?? []
    group.push({ ...endpoint, index })
    groups.set(root, group)
  })

  const openEndpoints = []
  for (const group of groups.values()) {
    const representative = group.reduce((sum, item) => ({
      x: sum.x + item.point.x / group.length,
      z: sum.z + item.point.z / group.length,
    }), { x: 0, z: 0 })
    group.forEach((item) => {
      if (!connected[item.index]) openEndpoints.push({ ...item, point: representative })
    })
  }

  // A one-wall component is open by definition; the endpoint report above is
  // enough for the UI, while this list gives callers a compact summary.
  const components = [...new Set(endpoints.map((_, index) => unionFind.find(index)))].map((root) => {
    const group = groups.get(root) ?? []
    return {
      wallIds: [...new Set(group.map((item) => item.wallId))],
      endpointCount: group.length,
      closed: group.length > 1,
    }
  })

  return {
    isClosed: openEndpoints.length === 0 && components.length > 0,
    openEndpoints,
    components,
    tolerance,
    wallCount: walls?.length ?? 0,
    totalLength: (walls ?? []).reduce((sum, wall) => sum + getWallLength(wall), 0),
  }
}
