import {
  ROOM_COORDINATE_SYSTEM,
  ROOM_SCHEMA_VERSION,
  ROOM_UNITS,
} from '../domain/roomSchema.js'

// Estimated from demo reference image.
// Replace with measured values when available.
const WIDTH = 3.2
const DEPTH = 5.0
const WALL_HEIGHT = 2.7

// Wall thickness is a stable V0 default, not measured from the reference image.
const WALL_THICKNESS = 0.12

const halfWidth = WIDTH / 2
const halfDepth = DEPTH / 2

export const DEMO_ROOM_DOCUMENT = {
  schemaVersion: ROOM_SCHEMA_VERSION,
  id: 'room-document-hackathon-demo-v0',
  units: ROOM_UNITS,
  coordinateSystem: {
    ...ROOM_COORDINATE_SYSTEM,
    floorAxes: [...ROOM_COORDINATE_SYSTEM.floorAxes],
  },
  source: {
    type: 'manual-demo',
    provider: 'hackathon-demo-room-v0',
    confidence: null,
  },
  room: {
    id: 'room-hackathon-demo-v0',
    name: '黑客松实景 Demo Room V0',
    floorElevation: 0,
    floorThickness: WALL_THICKNESS,
    defaults: {
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
    },
  },
  walls: [
    {
      id: 'demo-wall-north', roomId: 'room-hackathon-demo-v0',
      start: { x: -halfWidth, z: -halfDepth }, end: { x: halfWidth, z: -halfDepth },
      height: WALL_HEIGHT, thickness: WALL_THICKNESS, kind: 'exterior', materialId: 'wall-default',
    },
    {
      id: 'demo-wall-east', roomId: 'room-hackathon-demo-v0',
      start: { x: halfWidth, z: -halfDepth }, end: { x: halfWidth, z: halfDepth },
      height: WALL_HEIGHT, thickness: WALL_THICKNESS, kind: 'exterior', materialId: 'wall-default',
    },
    {
      id: 'demo-wall-south', roomId: 'room-hackathon-demo-v0',
      start: { x: halfWidth, z: halfDepth }, end: { x: -halfWidth, z: halfDepth },
      height: WALL_HEIGHT, thickness: WALL_THICKNESS, kind: 'exterior', materialId: 'wall-default',
    },
    {
      id: 'demo-wall-west', roomId: 'room-hackathon-demo-v0',
      start: { x: -halfWidth, z: halfDepth }, end: { x: -halfWidth, z: -halfDepth },
      height: WALL_HEIGHT, thickness: WALL_THICKNESS, kind: 'exterior', materialId: 'wall-default',
    },
  ],
  openings: [
    {
      // Estimated from demo reference image: door is near the right side of the bottom wall.
      id: 'demo-door-entry', type: 'door', wallId: 'demo-wall-south',
      offset: 0.7, width: 0.8, height: 2.1, sillHeight: 0,
    },
    {
      // Estimated from demo reference image: window is approximately centered on the top wall.
      id: 'demo-window-main', type: 'window', wallId: 'demo-wall-north',
      offset: halfWidth, width: 1.0, height: 1.45, sillHeight: 0.75,
    },
  ],
  materials: [
    { id: 'wall-default', color: '#eee9df' },
  ],
}

