import { validateRoomDocument } from '../domain/roomValidation.js'
import { assertValidPhotoRoomDraft } from '../domain/photoRoomDraft.js'

const DEFAULT_WALL_HEIGHT = 2.7
const DEFAULT_WALL_THICKNESS = 0.12
const DEFAULT_MATERIALS = [
  { id: 'wall-default', color: '#eee9df' },
  { id: 'wall-bathroom', color: '#e4ded3' },
]

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const point = (value) => ({ x: finite(value?.x), z: finite(value?.z) })

function boundsOfWalls(walls) {
  const points = walls.flatMap((wall) => [wall.start, wall.end])
  if (!points.length) return { minX: 0, maxX: 1, minZ: 0, maxZ: 1, width: 1, depth: 1, centerX: 0.5, centerZ: 0.5 }
  const minX = Math.min(...points.map((item) => item.x))
  const maxX = Math.max(...points.map((item) => item.x))
  const minZ = Math.min(...points.map((item) => item.z))
  const maxZ = Math.max(...points.map((item) => item.z))
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 }
}

function normalizeInput(input) {
  const source = input ?? {}
  return {
    ...source,
    walls: source.walls ?? source.surfaces?.walls ?? [],
    doors: source.doors ?? source.surfaces?.doors ?? [],
    windows: source.windows ?? source.surfaces?.windows ?? [],
    openings: source.openings ?? source.surfaces?.openings ?? [],
  }
}

function scaleForDraft(draft, rawWalls, options) {
  const anchor = draft.scaleAnchor ?? options.scaleAnchor
  const draftWidth = boundsOfWalls(rawWalls).width
  if (anchor?.type === 'roomWidth' && finite(anchor.valueMeters) > 0 && draftWidth > 0) return finite(anchor.valueMeters) / draftWidth
  return 1
}

function wallFromDraft(rawWall, index, scale, defaults) {
  const start = point(rawWall.start)
  const end = point(rawWall.end)
  return {
    id: String(rawWall.id ?? `draft-wall-${String(index + 1).padStart(2, '0')}`),
    roomId: 'room-01',
    start: { x: start.x * scale, z: start.z * scale },
    end: { x: end.x * scale, z: end.z * scale },
    height: Math.max(0.1, finite(rawWall.height, defaults.wallHeight)),
    thickness: Math.max(0.01, finite(rawWall.thickness, defaults.wallThickness)),
    kind: rawWall.kind === 'partition' ? 'partition' : 'exterior',
    materialId: rawWall.materialId ?? 'wall-default',
    source: { confidence: finite(rawWall.confidence, 0), estimated: rawWall.estimated !== false },
  }
}

function distanceToSegment(target, wall) {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const lengthSquared = dx * dx + dz * dz
  const ratio = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((target.x - wall.start.x) * dx + (target.z - wall.start.z) * dz) / lengthSquared))
    : 0
  const projected = { x: wall.start.x + dx * ratio, z: wall.start.z + dz * ratio }
  return { distance: Math.hypot(target.x - projected.x, target.z - projected.z), offset: Math.hypot(projected.x - wall.start.x, projected.z - wall.start.z) }
}

function openingFromDraft(rawOpening, type, walls, scale, index, defaults) {
  const rawWall = walls.find((wall) => wall.id === String(rawOpening.wallId))
  if (!rawWall) return null
  const target = point(rawOpening.center ?? rawOpening.position ?? rawOpening.approximatePosition)
  const match = distanceToSegment({ x: target.x * scale, z: target.z * scale }, rawWall)
  const width = Math.max(0.1, finite(rawOpening.width, finite(rawOpening.relativeWidth, 0.9) * (Math.hypot(rawWall.end.x - rawWall.start.x, rawWall.end.z - rawWall.start.z) || 1)) * scale)
  return {
    id: String(rawOpening.id ?? `draft-${type}-${String(index + 1).padStart(2, '0')}`),
    type,
    wallId: rawWall.id,
    offset: Math.max(width / 2, Math.min(Math.max(width / 2, Math.hypot(rawWall.end.x - rawWall.start.x, rawWall.end.z - rawWall.start.z) - width / 2), match.offset)),
    width,
    height: Math.max(0.1, finite(rawOpening.height, type === 'door' ? 2.1 : 1.2)),
    sillHeight: Math.max(0, finite(rawOpening.sillHeight, type === 'door' ? 0 : defaults.windowSillHeight)),
    source: { confidence: finite(rawOpening.confidence, 0), estimated: rawOpening.estimated !== false },
  }
}

export function adaptPhotoRoomDraft(input, options = {}) {
  const draft = normalizeInput(input)
  assertValidPhotoRoomDraft(draft)
  const defaults = { wallHeight: finite(options.wallHeight, DEFAULT_WALL_HEIGHT), wallThickness: finite(options.wallThickness, DEFAULT_WALL_THICKNESS), windowSillHeight: finite(options.windowSillHeight, 0.9) }
  const scale = scaleForDraft(draft, draft.walls, options)
  const walls = draft.walls.map((wall, index) => wallFromDraft(wall, index, scale, defaults))
  const openings = [
    ...draft.doors.map((opening, index) => openingFromDraft(opening, 'door', walls, scale, index, defaults)),
    ...draft.windows.map((opening, index) => openingFromDraft(opening, 'window', walls, scale, index, defaults)),
    ...draft.openings.map((opening, index) => openingFromDraft(opening, opening.type === 'window' ? 'window' : 'door', walls, scale, index + draft.doors.length + draft.windows.length, defaults)),
  ].filter(Boolean)
  const bounds = boundsOfWalls(walls)
  const document = {
    schemaVersion: 1,
    id: String(draft.roomId ?? 'room-document-photo-draft'),
    units: 'meters',
    coordinateSystem: { handedness: 'right', upAxis: 'y', floorAxes: ['x', 'z'] },
    source: { type: 'multi-photo-vision', provider: draft.source?.provider ?? 'mock', confidence: draft.source?.confidence ?? null, imageCount: draft.source?.imageCount ?? null, scaleAnchor: draft.scaleAnchor ?? null, uncertainties: draft.uncertainties ?? [] },
    room: { id: 'room-01', name: '照片扫描房间草稿', floorElevation: 0, floorThickness: defaults.wallThickness, defaults: { wallHeight: defaults.wallHeight, wallThickness: defaults.wallThickness }, estimatedBounds: bounds },
    walls,
    openings,
    materials: DEFAULT_MATERIALS,
  }
  return { document, diagnostics: { scale, source: document.source, draftSchemaVersion: draft.schemaVersion ?? null, uncertaintyCount: (draft.uncertainties ?? []).length, validationErrors: validateRoomDocument(document) } }
}

export function photoRoomDraftToRoomDocument(input, options = {}) {
  return adaptPhotoRoomDraft(input, options).document
}
