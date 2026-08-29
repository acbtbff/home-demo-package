import {
  ROOM_COORDINATE_SYSTEM,
  ROOM_SCHEMA_VERSION,
  ROOM_UNITS,
} from '../domain/roomSchema.js'

export function legacyDemoToRoomDocument({ room, openings }) {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const wallHeight = room.height
  const thickness = room.wallThickness

  return {
    schemaVersion: ROOM_SCHEMA_VERSION,
    id: 'room-document-demo',
    units: ROOM_UNITS,
    coordinateSystem: { ...ROOM_COORDINATE_SYSTEM, floorAxes: [...ROOM_COORDINATE_SYSTEM.floorAxes] },
    source: { type: 'manual-demo', provider: null, confidence: null },
    room: {
      id: 'room-01',
      name: '出租屋单间',
      floorElevation: 0,
      floorThickness: thickness,
      defaults: { wallHeight, wallThickness: thickness },
    },
    walls: [
      {
        id: 'wall-north', roomId: 'room-01',
        start: { x: -halfWidth, z: -halfDepth }, end: { x: halfWidth, z: -halfDepth },
        height: wallHeight, thickness, kind: 'exterior', materialId: 'wall-default',
      },
      {
        id: 'wall-east', roomId: 'room-01',
        start: { x: halfWidth, z: -halfDepth }, end: { x: halfWidth, z: halfDepth },
        height: wallHeight, thickness, kind: 'exterior', materialId: 'wall-default',
      },
      {
        id: 'wall-south', roomId: 'room-01',
        start: { x: halfWidth, z: halfDepth }, end: { x: -halfWidth, z: halfDepth },
        height: wallHeight, thickness, kind: 'exterior', materialId: 'wall-default',
      },
      {
        id: 'wall-west', roomId: 'room-01',
        start: { x: -halfWidth, z: halfDepth }, end: { x: -halfWidth, z: -halfDepth },
        height: wallHeight, thickness, kind: 'exterior', materialId: 'wall-default',
      },
      {
        id: 'wall-bath-01', roomId: 'room-01',
        start: { x: halfWidth - 1.35, z: -halfDepth + 0.375 },
        end: { x: halfWidth - 1.35, z: -halfDepth + 1.925 },
        height: wallHeight, thickness, kind: 'partition', materialId: 'wall-bathroom',
      },
      {
        id: 'wall-bath-02', roomId: 'room-01',
        start: { x: halfWidth - 1.395, z: -halfDepth + 1.9 },
        end: { x: halfWidth + 0.055, z: -halfDepth + 1.9 },
        height: wallHeight, thickness, kind: 'partition', materialId: 'wall-bathroom',
      },
    ],
    openings: [
      {
        id: 'door-entry', type: 'door', wallId: 'wall-east',
        offset: Number((openings.door.center + halfDepth).toFixed(6)),
        width: openings.door.width, height: openings.door.height,
        sillHeight: openings.door.sill ?? 0,
      },
      {
        id: 'window-main', type: 'window', wallId: 'wall-west',
        offset: Number((halfDepth - openings.window.center).toFixed(6)),
        width: openings.window.width, height: openings.window.height,
        sillHeight: openings.window.sill ?? 0,
      },
    ],
    materials: [
      { id: 'wall-default', color: '#eee9df' },
      { id: 'wall-bathroom', color: '#e4ded3' },
    ],
  }
}
