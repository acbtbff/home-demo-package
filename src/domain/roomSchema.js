import { assertValidRoomDocument } from './roomValidation.js'
import { WORLD_UNITS, WORLD_SCALE_METERS_PER_UNIT, WORLD_SCALE_CONTRACT, COORDINATE_CONTRACT } from './worldScale.js'

export const ROOM_SCHEMA_VERSION = 1

export const ROOM_UNITS = WORLD_UNITS

export const ROOM_COORDINATE_SYSTEM = Object.freeze({
  handedness: 'right',
  upAxis: COORDINATE_CONTRACT.upAxis,
  floorAxes: COORDINATE_CONTRACT.floorAxes,
})

export { WORLD_UNITS, WORLD_SCALE_METERS_PER_UNIT, WORLD_SCALE_CONTRACT, COORDINATE_CONTRACT }

export function serializeRoomDocument(document) {
  return JSON.stringify(document)
}

export function parseRoomDocument(json) {
  const document = JSON.parse(json)

  if (document?.schemaVersion !== ROOM_SCHEMA_VERSION) {
    throw new Error(`Unsupported RoomDocument schema version: ${document?.schemaVersion}`)
  }

  return assertValidRoomDocument(document)
}
