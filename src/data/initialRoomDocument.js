import { legacyDemoToRoomDocument } from '../adapters/legacyDemoAdapter.js'

export const LEGACY_DEMO_ROOM = { width: 7.38, depth: 3.37, height: 2.8, wallThickness: 0.12 }

export const LEGACY_DEMO_OPENINGS = {
  door: { center: 0.72, width: 0.9, height: 2.1, sill: 0 },
  window: { center: -0.2, width: 2.2, height: 1.45, sill: 0.75 },
}

export const INITIAL_ROOM_DOCUMENT = legacyDemoToRoomDocument({
  room: LEGACY_DEMO_ROOM,
  openings: LEGACY_DEMO_OPENINGS,
})
