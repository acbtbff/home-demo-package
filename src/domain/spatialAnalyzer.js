import { getWallAngle, getWallCenter, getWallLength } from './roomGeometry.js'
import { createGeometryProxyFromFurniture } from './spatialContracts.js'

const EPSILON = 1e-9
const POINT_TOLERANCE_M = 0.1

function rangesOverlap(aMin, aMax, bMin, bMax) {
  return aMin < bMax && bMin < aMax
}

function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.z * axis.z)
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function normalize2D(vector) {
  const length = Math.hypot(vector.x, vector.z)
  if (length <= EPSILON) return { x: 0, z: 0 }
  return { x: vector.x / length, z: vector.z / length }
}

function uniqueAxesFromObb(obb) {
  return [
    obb.axisX,
    obb.axisZ,
  ].filter((axis) => Math.hypot(axis.x, axis.z) > EPSILON)
}

export function doObbsOverlap(a, b) {
  const axes = [...uniqueAxesFromObb(a), ...uniqueAxesFromObb(b)]

  return axes.every((axis) => {
    const aRange = projectPolygon(a.corners, axis)
    const bRange = projectPolygon(b.corners, axis)
    return aRange.max >= bRange.min && bRange.max >= aRange.min
  })
}

export function createBoxFootprintObb(geometryProxy, placement) {
  const width = Math.max(0, geometryProxy?.dimensionsM?.width ?? 0)
  const depth = Math.max(0, geometryProxy?.dimensionsM?.depth ?? 0)
  const rotationY = placement?.rotationY ?? 0
  const center = {
    x: placement?.position?.x ?? 0,
    z: placement?.position?.z ?? 0,
  }
  const axisX = normalize2D({ x: Math.cos(rotationY), z: -Math.sin(rotationY) })
  const axisZ = normalize2D({ x: Math.sin(rotationY), z: Math.cos(rotationY) })
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const corners = [
    { x: center.x + axisX.x * halfWidth + axisZ.x * halfDepth, z: center.z + axisX.z * halfWidth + axisZ.z * halfDepth },
    { x: center.x - axisX.x * halfWidth + axisZ.x * halfDepth, z: center.z - axisX.z * halfWidth + axisZ.z * halfDepth },
    { x: center.x - axisX.x * halfWidth - axisZ.x * halfDepth, z: center.z - axisX.z * halfWidth - axisZ.z * halfDepth },
    { x: center.x + axisX.x * halfWidth - axisZ.x * halfDepth, z: center.z + axisX.z * halfWidth - axisZ.z * halfDepth },
  ]

  return {
    center,
    width,
    depth,
    axisX,
    axisZ,
    corners,
    minY: placement?.position?.y ?? 0,
    maxY: (placement?.position?.y ?? 0) + Math.max(0, geometryProxy?.dimensionsM?.height ?? 0),
  }
}

function pointsClose(a, b, tolerance = POINT_TOLERANCE_M) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= tolerance
}

export function buildExteriorWallPolygon(walls = []) {
  const exteriorWalls = walls.filter((wall) => wall.kind === 'exterior')
  if (exteriorWalls.length < 3) return []

  const unused = new Set(exteriorWalls.map((wall) => wall.id))
  const wallsById = new Map(exteriorWalls.map((wall) => [wall.id, wall]))
  const firstWall = exteriorWalls[0]
  const polygon = [{ ...firstWall.start }, { ...firstWall.end }]
  unused.delete(firstWall.id)

  while (unused.size > 0) {
    const current = polygon.at(-1)
    let match = null

    for (const wallId of unused) {
      const wall = wallsById.get(wallId)
      if (pointsClose(current, wall.start)) {
        match = { wall, next: wall.end }
        break
      }
      if (pointsClose(current, wall.end)) {
        match = { wall, next: wall.start }
        break
      }
    }

    if (!match) break
    polygon.push({ ...match.next })
    unused.delete(match.wall.id)
  }

  const closed = polygon.length >= 4 && pointsClose(polygon[0], polygon.at(-1))
  if (closed) return polygon.slice(0, -1)

  const uniquePoints = []
  for (const wall of exteriorWalls) {
    for (const point of [wall.start, wall.end]) {
      if (!uniquePoints.some((item) => pointsClose(item, point))) uniquePoints.push({ ...point })
    }
  }
  const center = uniquePoints.reduce((sum, point) => ({
    x: sum.x + point.x / uniquePoints.length,
    z: sum.z + point.z / uniquePoints.length,
  }), { x: 0, z: 0 })

  return uniquePoints.sort((a, b) => Math.atan2(a.z - center.z, a.x - center.x) - Math.atan2(b.z - center.z, b.x - center.x))
}

function isPointOnSegment(point, a, b) {
  const cross = (point.z - a.z) * (b.x - a.x) - (point.x - a.x) * (b.z - a.z)
  if (Math.abs(cross) > 1e-7) return false
  const dot = (point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z)
  if (dot < -1e-7) return false
  const lengthSquared = (b.x - a.x) ** 2 + (b.z - a.z) ** 2
  return dot <= lengthSquared + 1e-7
}

export function isPointInsidePolygon(point, polygon) {
  if (polygon.length < 3) return false

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    if (isPointOnSegment(point, current, next)) return true
  }

  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index]
    const before = polygon[previous]
    const crosses = current.z > point.z !== before.z > point.z
      && point.x < ((before.x - current.x) * (point.z - current.z)) / (before.z - current.z) + current.x
    if (crosses) inside = !inside
  }
  return inside
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
}

function doSegmentsProperlyIntersect(a, b, c, d) {
  const abC = orientation(a, b, c)
  const abD = orientation(a, b, d)
  const cdA = orientation(c, d, a)
  const cdB = orientation(c, d, b)
  return abC * abD < -EPSILON && cdA * cdB < -EPSILON
}

function isPolygonFootprintInsideRoom(footprint, roomPolygon) {
  if (roomPolygon.length < 3) return false
  if (footprint.corners.some((corner) => !isPointInsidePolygon(corner, roomPolygon))) return false

  for (let index = 0; index < footprint.corners.length; index += 1) {
    const a = footprint.corners[index]
    const b = footprint.corners[(index + 1) % footprint.corners.length]
    for (let edgeIndex = 0; edgeIndex < roomPolygon.length; edgeIndex += 1) {
      const c = roomPolygon[edgeIndex]
      const d = roomPolygon[(edgeIndex + 1) % roomPolygon.length]
      if (doSegmentsProperlyIntersect(a, b, c, d)) return false
    }
  }

  return true
}

function createWallSegmentObb({ wall, centerOffset, span, y, height }) {
  const wallCenter = getWallCenter(wall)
  const wallAngle = getWallAngle(wall)
  const wallAxisX = normalize2D({ x: Math.cos(wallAngle), z: Math.sin(wallAngle) })
  const wallAxisZ = normalize2D({ x: -Math.sin(wallAngle), z: Math.cos(wallAngle) })
  const center = {
    x: wallCenter.x + wallAxisX.x * centerOffset,
    z: wallCenter.z + wallAxisX.z * centerOffset,
  }
  const halfSpan = span / 2
  const halfThickness = wall.thickness / 2
  return {
    wallId: wall.id,
    wallKind: wall.kind,
    center,
    width: span,
    depth: wall.thickness,
    axisX: wallAxisX,
    axisZ: wallAxisZ,
    corners: [
      { x: center.x + wallAxisX.x * halfSpan + wallAxisZ.x * halfThickness, z: center.z + wallAxisX.z * halfSpan + wallAxisZ.z * halfThickness },
      { x: center.x - wallAxisX.x * halfSpan + wallAxisZ.x * halfThickness, z: center.z - wallAxisX.z * halfSpan + wallAxisZ.z * halfThickness },
      { x: center.x - wallAxisX.x * halfSpan - wallAxisZ.x * halfThickness, z: center.z - wallAxisX.z * halfSpan - wallAxisZ.z * halfThickness },
      { x: center.x + wallAxisX.x * halfSpan - wallAxisZ.x * halfThickness, z: center.z + wallAxisX.z * halfSpan - wallAxisZ.z * halfThickness },
    ],
    minY: y,
    maxY: y + height,
  }
}

function createWallSolidParts(wall, openings = []) {
  const length = getWallLength(wall)
  const renderHeight = wall.displayHeight ?? wall.height
  const sortedOpenings = [...openings].sort((a, b) => a.offset - b.offset)
  const parts = []
  let cursor = 0

  for (const opening of sortedOpenings) {
    const openingStart = Math.max(0, opening.offset - opening.width / 2)
    const openingEnd = Math.min(length, opening.offset + opening.width / 2)
    const gap = Math.max(0, openingStart - cursor)
    const openingSpan = Math.max(0, openingEnd - openingStart)
    const sillHeight = Math.min(opening.sillHeight ?? 0, renderHeight)
    const openingHeight = Math.min(opening.height, Math.max(0, renderHeight - sillHeight))
    const headerHeight = Math.max(0, renderHeight - sillHeight - openingHeight)

    if (gap > 0) {
      parts.push({ centerOffset: -length / 2 + cursor + gap / 2, span: gap, y: 0, height: renderHeight })
    }
    if (sillHeight > 0) {
      parts.push({ centerOffset: -length / 2 + openingStart + openingSpan / 2, span: openingSpan, y: 0, height: sillHeight })
    }
    if (headerHeight > 0) {
      parts.push({
        centerOffset: -length / 2 + openingStart + openingSpan / 2,
        span: openingSpan,
        y: sillHeight + openingHeight,
        height: headerHeight,
      })
    }
    cursor = Math.max(cursor, openingEnd)
  }

  if (cursor < length) {
    parts.push({ centerOffset: -length / 2 + cursor + (length - cursor) / 2, span: length - cursor, y: 0, height: renderHeight })
  }

  return parts
}

export function createWallSolidObbs(roomDocument) {
  return (roomDocument?.walls ?? []).flatMap((wall) => {
    const openings = (roomDocument?.openings ?? []).filter((opening) => opening.wallId === wall.id)
    return createWallSolidParts(wall, openings)
      .filter((part) => part.span > EPSILON && part.height > EPSILON && wall.thickness > EPSILON)
      .map((part) => createWallSegmentObb({ wall, ...part }))
  })
}

function createSpatialItem(furniture, placement) {
  const geometryProxy = createGeometryProxyFromFurniture(furniture)
  return {
    furniture,
    placement,
    geometryProxy,
    obb: createBoxFootprintObb(geometryProxy, placement),
  }
}

export function analyzeSpatialState({ roomDocument, furnitureItems = [], placementsById = {} } = {}) {
  const placements = Object.values(placementsById)
  const items = furnitureItems
    .map((furniture) => {
      const placement = placements.find((item) => item.furnitureId === furniture.id)
      return placement ? createSpatialItem(furniture, placement) : null
    })
    .filter(Boolean)
  const roomPolygon = buildExteriorWallPolygon(roomDocument?.walls ?? [])
  const wallObbs = createWallSolidObbs(roomDocument)

  const byFurnitureId = Object.fromEntries(items.map((item) => [item.furniture.id, {
    furnitureId: item.furniture.id,
    outOfBounds: !isPolygonFootprintInsideRoom(item.obb, roomPolygon),
    collisionDetected: false,
    furnitureCollision: false,
    exteriorWallCollision: false,
    interiorWallCollision: false,
    collidingFurnitureIds: [],
    collidingWallIds: [],
    collidingExteriorWallIds: [],
    collidingInteriorWallIds: [],
    physicalFit: null,
    canReconfigure: null,
    pathWidthAfterPlacementCm: null,
    spatialImpact: null,
    occupiesScarceSpace: null,
  }]))

  for (let index = 0; index < items.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < items.length; otherIndex += 1) {
      const item = items[index]
      const other = items[otherIndex]
      if (!rangesOverlap(item.obb.minY, item.obb.maxY, other.obb.minY, other.obb.maxY)) continue
      if (!doObbsOverlap(item.obb, other.obb)) continue
      byFurnitureId[item.furniture.id].collisionDetected = true
      byFurnitureId[other.furniture.id].collisionDetected = true
      byFurnitureId[item.furniture.id].furnitureCollision = true
      byFurnitureId[other.furniture.id].furnitureCollision = true
      byFurnitureId[item.furniture.id].collidingFurnitureIds.push(other.furniture.id)
      byFurnitureId[other.furniture.id].collidingFurnitureIds.push(item.furniture.id)
    }
  }

  for (const item of items) {
    for (const wallObb of wallObbs) {
      if (!rangesOverlap(item.obb.minY, item.obb.maxY, wallObb.minY, wallObb.maxY)) continue
      if (!doObbsOverlap(item.obb, wallObb)) continue
      byFurnitureId[item.furniture.id].collisionDetected = true
      byFurnitureId[item.furniture.id].collidingWallIds.push(wallObb.wallId)
      if (wallObb.wallKind === 'exterior') {
        byFurnitureId[item.furniture.id].exteriorWallCollision = true
        byFurnitureId[item.furniture.id].collidingExteriorWallIds.push(wallObb.wallId)
      } else {
        byFurnitureId[item.furniture.id].interiorWallCollision = true
        byFurnitureId[item.furniture.id].collidingInteriorWallIds.push(wallObb.wallId)
      }
    }
    byFurnitureId[item.furniture.id].collidingWallIds = [...new Set(byFurnitureId[item.furniture.id].collidingWallIds)]
    byFurnitureId[item.furniture.id].collidingExteriorWallIds = [...new Set(byFurnitureId[item.furniture.id].collidingExteriorWallIds)]
    byFurnitureId[item.furniture.id].collidingInteriorWallIds = [...new Set(byFurnitureId[item.furniture.id].collidingInteriorWallIds)]
  }

  return {
    byFurnitureId,
    roomPolygon,
    wallObbs,
  }
}
