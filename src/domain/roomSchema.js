export const ROOM_SCHEMA_VERSION = 1

export const ROOM_UNITS = 'meters'

export const ROOM_COORDINATE_SYSTEM = Object.freeze({
  handedness: 'right',
  upAxis: 'y',
  floorAxes: ['x', 'z'],
})

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
import { assertValidRoomDocument } from './roomValidation.js'
