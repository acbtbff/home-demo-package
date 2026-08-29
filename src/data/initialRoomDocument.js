import { legacyDemoToRoomDocument } from '../adapters/legacyDemoAdapter.js'

// Demo baseline from the confirmed floor-plan image:
// 3.2 m (width) × 5.0 m (depth) × 2.7 m (height), no interior partitions.
// Door/window widths and exact offsets are approximate because the source image
// labels only the room dimensions and opening locations, not their exact sizes.
export const LEGACY_DEMO_ROOM = { width: 3.2, depth: 5.0, height: 2.7, wallThickness: 0.12 }

export const LEGACY_DEMO_OPENINGS = {
  // Bottom wall, toward the right side in the 2D plan.
  // wall-south runs from right → left, so a small offset places the door near the right corner.
  door: { wallId: 'wall-south', offset: 0.65, width: 0.8, height: 2.1, sill: 0 },
  // Top wall, centered.
  window: { wallId: 'wall-north', offset: 1.6, width: 1.0, height: 1.45, sill: 0.75 },
}

export const INITIAL_ROOM_DOCUMENT = legacyDemoToRoomDocument({
  room: LEGACY_DEMO_ROOM,
  openings: LEGACY_DEMO_OPENINGS,
})
