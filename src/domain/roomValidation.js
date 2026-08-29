import { getWallLength } from './roomGeometry.js'

const isPositiveFinite = (value) => Number.isFinite(value) && value > 0
const isFinitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.z)

export function validateRoomDocument(document) {
  const errors = []
  const addError = (path, message) => errors.push({ path, message })

  if (document?.schemaVersion !== 1) addError('schemaVersion', 'must equal 1')
  if (document?.units !== 'meters') addError('units', 'must equal meters')
  if (!Array.isArray(document?.walls)) addError('walls', 'must be an array')
  if (!Array.isArray(document?.openings)) addError('openings', 'must be an array')
  if (!isPositiveFinite(document?.room?.defaults?.wallHeight)) addError('room.defaults.wallHeight', 'must be greater than zero')
  if (errors.length > 0) return errors

  const wallIds = new Set()
  document.walls.forEach((wall, index) => {
    const path = `walls[${index}]`
    if (!wall.id || wallIds.has(wall.id)) addError(`${path}.id`, 'must be present and unique')
    wallIds.add(wall.id)
    if (!isFinitePoint(wall.start)) addError(`${path}.start`, 'must contain finite x and z')
    if (!isFinitePoint(wall.end)) addError(`${path}.end`, 'must contain finite x and z')
    if (isFinitePoint(wall.start) && isFinitePoint(wall.end) && getWallLength(wall) <= 1e-6) {
      addError(path, 'start and end must not be equal')
    }
    if (!isPositiveFinite(wall.height)) addError(`${path}.height`, 'must be greater than zero')
    if (!isPositiveFinite(wall.thickness)) addError(`${path}.thickness`, 'must be greater than zero')
  })

  document.openings.forEach((opening, index) => {
    const path = `openings[${index}]`
    const wall = document.walls.find((candidate) => candidate.id === opening.wallId)
    if (!wall) addError(`${path}.wallId`, 'must reference an existing wall')
    if (!isPositiveFinite(opening.width)) addError(`${path}.width`, 'must be greater than zero')
    if (!isPositiveFinite(opening.height)) addError(`${path}.height`, 'must be greater than zero')
    if (!Number.isFinite(opening.offset)) addError(`${path}.offset`, 'must be finite')
    if (!Number.isFinite(opening.sillHeight) || opening.sillHeight < 0) addError(`${path}.sillHeight`, 'must be a non-negative finite number')
    if (wall && isPositiveFinite(opening.width) && Number.isFinite(opening.offset)) {
      const length = getWallLength(wall)
      if (opening.offset - opening.width / 2 < 0 || opening.offset + opening.width / 2 > length) {
        addError(path, 'must fit within its wall')
      }
    }
  })
  return errors
}

export function assertValidRoomDocument(document) {
  const errors = validateRoomDocument(document)
  if (errors.length > 0) {
    throw new Error(`Invalid RoomDocument:\n${errors.map((error) => `${error.path}: ${error.message}`).join('\n')}`)
  }
  return document
}
