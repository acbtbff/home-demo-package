import { useReducer } from 'react'
import { getExteriorWallsBounds, getWallLength } from '../domain/roomGeometry.js'
import { getConnectedWallEndpoints, getConnectedWallEndpointsForWall } from '../domain/wallTopology.js'

function updateById(items, id, update) {
  return items.map((item) => item.id === id ? { ...item, ...update } : item)
}

function clampOpeningsToWall(openings, wall) {
  const wallLength = getWallLength(wall)

  return openings.map((opening) => {
    if (opening.wallId !== wall.id) return opening
    const halfWidth = Math.min(opening.width / 2, wallLength / 2)
    const minOffset = halfWidth
    const maxOffset = Math.max(halfWidth, wallLength - halfWidth)
    return { ...opening, offset: Math.min(maxOffset, Math.max(minOffset, opening.offset)) }
  })
}

function endpointKey(wallId, endpoint) {
  return `${wallId}:${endpoint}`
}

function updateChangedOpenings(document, walls) {
  const changedWallIds = new Set(walls.filter((wall, index) => wall !== document.walls[index]).map((wall) => wall.id))
  const openings = document.openings.map((opening) => {
    if (!changedWallIds.has(opening.wallId)) return opening
    const wall = walls.find((candidate) => candidate.id === opening.wallId)
    return wall ? clampOpeningsToWall([opening], wall)[0] : opening
  })
  return { ...document, walls, openings }
}

function translateWall(document, wallId, delta, connectedEndpoints = []) {
  const sourceWall = document.walls.find((wall) => wall.id === wallId)
  if (!sourceWall || !delta) return document
  const movedEndpoints = new Set([
    endpointKey(wallId, 'start'),
    endpointKey(wallId, 'end'),
    ...connectedEndpoints.map((ref) => endpointKey(ref.wallId, ref.endpoint)),
  ])
  const walls = document.walls.map((wall) => {
    const startMoved = movedEndpoints.has(endpointKey(wall.id, 'start'))
    const endMoved = movedEndpoints.has(endpointKey(wall.id, 'end'))
    if (!startMoved && !endMoved) return wall
    return {
      ...wall,
      start: startMoved ? { x: wall.start.x + delta.x, z: wall.start.z + delta.z } : wall.start,
      end: endMoved ? { x: wall.end.x + delta.x, z: wall.end.z + delta.z } : wall.end,
    }
  })
  return updateChangedOpenings(document, walls)
}

function moveWallEndpoint(document, wallId, endpoint, point, connectedEndpoints = []) {
  const sourceWall = document.walls.find((wall) => wall.id === wallId)
  if (!sourceWall || !sourceWall[endpoint] || !point) return document
  const movedEndpoints = new Set([
    endpointKey(wallId, endpoint),
    ...connectedEndpoints.map((ref) => endpointKey(ref.wallId, ref.endpoint)),
  ])
  const walls = document.walls.map((wall) => {
    const startMoved = movedEndpoints.has(endpointKey(wall.id, 'start'))
    const endMoved = movedEndpoints.has(endpointKey(wall.id, 'end'))
    if (!startMoved && !endMoved) return wall
    return {
      ...wall,
      start: startMoved ? { ...point } : wall.start,
      end: endMoved ? { ...point } : wall.end,
    }
  })
  return updateChangedOpenings(document, walls)
}

function resizeRoomDocument(document, width, depth) {
  const bounds = getExteriorWallsBounds(document.walls)
  const scaleX = bounds.width > 0 ? width / bounds.width : 1
  const scaleZ = bounds.depth > 0 ? depth / bounds.depth : 1
  const oldWalls = new Map(document.walls.map((wall) => [wall.id, wall]))
  const walls = document.walls.map((wall) => ({
    ...wall,
    start: {
      x: bounds.centerX + (wall.start.x - bounds.centerX) * scaleX,
      z: bounds.centerZ + (wall.start.z - bounds.centerZ) * scaleZ,
    },
    end: {
      x: bounds.centerX + (wall.end.x - bounds.centerX) * scaleX,
      z: bounds.centerZ + (wall.end.z - bounds.centerZ) * scaleZ,
    },
  }))
  const newWalls = new Map(walls.map((wall) => [wall.id, wall]))
  const openings = document.openings.map((opening) => {
    const oldWall = oldWalls.get(opening.wallId)
    const newWall = newWalls.get(opening.wallId)
    if (!oldWall || !newWall) return opening
    const oldLength = getWallLength(oldWall)
    const ratio = oldLength > 0 ? getWallLength(newWall) / oldLength : 1
    return { ...opening, offset: opening.offset * ratio }
  })

  return { ...document, walls, openings }
}

export function roomDocumentReducer(document, action) {
  switch (action.type) {
    case 'RESET_DOCUMENT':
      return structuredClone(action.document)
    case 'RESIZE_ROOM':
      return resizeRoomDocument(document, action.width, action.depth)
    case 'UPDATE_ROOM':
      return { ...document, room: { ...document.room, ...action.patch } }
    case 'UPDATE_WALL_DEFAULTS': {
      const defaults = { ...document.room.defaults, ...action.patch }
      const walls = document.walls.map((wall) => ({
        ...wall,
        height: action.patch.wallHeight != null
          ? action.patch.wallHeight
          : wall.height,
        thickness: action.patch.wallThickness ?? wall.thickness,
      }))
      return { ...document, room: { ...document.room, defaults }, walls }
    }
    case 'UPDATE_WALL':
      return { ...document, walls: updateById(document.walls, action.wallId, action.patch) }
    case 'MOVE_WALL_PARALLEL':
      return translateWall(document, action.wallId, action.delta, action.connectedEndpoints ?? getConnectedWallEndpointsForWall(document.walls, action.wallId))
    case 'MOVE_WALL_ENDPOINT': {
      const { wallId, endpoint, point, connectedEndpoints } = action.payload ?? action
      return moveWallEndpoint(document, wallId, endpoint, point, connectedEndpoints ?? getConnectedWallEndpoints(document.walls, wallId, endpoint))
    }
    case 'ADD_WALL':
      return { ...document, walls: [...document.walls, action.wall] }
    case 'REMOVE_WALL':
      return {
        ...document,
        walls: document.walls.filter((wall) => wall.id !== action.wallId),
        openings: document.openings.filter((opening) => opening.wallId !== action.wallId),
      }
    case 'UPDATE_OPENING':
      return { ...document, openings: updateById(document.openings, action.openingId, action.patch) }
    case 'ADD_OPENING':
      return { ...document, openings: [...document.openings, action.opening] }
    case 'REMOVE_OPENING':
      return { ...document, openings: document.openings.filter((opening) => opening.id !== action.openingId) }
    default:
      return document
  }
}

export function useRoomDocument(initialDocument) {
  const [document, dispatch] = useReducer(
    roomDocumentReducer,
    initialDocument,
    (value) => structuredClone(value),
  )

  return { document, dispatch }
}
