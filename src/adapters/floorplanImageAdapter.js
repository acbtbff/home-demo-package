import {
  ROOM_COORDINATE_SYSTEM,
  ROOM_SCHEMA_VERSION,
  ROOM_UNITS,
} from '../domain/roomSchema.js'
import { assertValidRoomDocument } from '../domain/roomValidation.js'
import { assertValidFloorplanImageDraft } from '../domain/floorplanImageDraft.js'

const DEFAULT_WALL_HEIGHT = 2.8
const DEFAULT_WALL_THICKNESS = 0.12
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const pixelWallLength = (wall) => Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)

export function getCalibrationReferencePixels(draft, calibration) {
  if (calibration.type === 'overall-width') return draft.bounds.maxX - draft.bounds.minX
  if (calibration.type === 'overall-height') return draft.bounds.maxY - draft.bounds.minY
  if (calibration.type === 'wall') {
    const wall = draft.walls.find((candidate) => candidate.id === calibration.wallId)
    if (!wall) throw new Error('请选择一面有效的参考墙。')
    return pixelWallLength(wall)
  }
  throw new Error('不支持的比例校准方式。')
}

function calibrationScale(draft, calibration) {
  const referencePixels = getCalibrationReferencePixels(draft, calibration)
  const valueMeters = Number(calibration.valueMeters)
  if (!Number.isFinite(valueMeters) || valueMeters <= 0) throw new Error('已知长度必须是大于 0 的米制数值。')
  const pixelsPerMeter = referencePixels / valueMeters
  if (!Number.isFinite(pixelsPerMeter) || pixelsPerMeter <= 0) throw new Error('无法根据当前输入计算图片比例。')
  return { referencePixels, valueMeters, pixelsPerMeter }
}

function projectOpeningOntoWall(opening, wall, pixelsPerMeter) {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const lengthPixels = Math.hypot(dx, dy)
  const direction = { x: dx / lengthPixels, y: dy / lengthPixels }
  const projectedPixels = (opening.center.x - wall.start.x) * direction.x + (opening.center.y - wall.start.y) * direction.y
  const widthPixels = Math.min(opening.widthPixels, Math.max(1, lengthPixels - pixelsPerMeter * 0.05))
  const offsetPixels = clamp(projectedPixels, widthPixels / 2, lengthPixels - widthPixels / 2)
  return { width: widthPixels / pixelsPerMeter, offset: offsetPixels / pixelsPerMeter }
}

export function floorplanImageDraftToRoomDocument(draft, calibration, options = {}) {
  assertValidFloorplanImageDraft(draft)
  const { referencePixels, valueMeters, pixelsPerMeter } = calibrationScale(draft, calibration)
  const wallHeight = Number(options.wallHeight ?? DEFAULT_WALL_HEIGHT)
  if (!Number.isFinite(wallHeight) || wallHeight <= 0) throw new Error('层高必须是大于 0 的米制数值。')

  const centerX = (draft.bounds.minX + draft.bounds.maxX) / 2
  const centerY = (draft.bounds.minY + draft.bounds.maxY) / 2
  const toMeters = (point) => ({
    x: Number(((point.x - centerX) / pixelsPerMeter).toFixed(6)),
    z: Number(((point.y - centerY) / pixelsPerMeter).toFixed(6)),
  })

  const walls = draft.walls.map((wall) => ({
    id: wall.id,
    roomId: 'room-floorplan-import',
    start: toMeters(wall.start),
    end: toMeters(wall.end),
    height: wallHeight,
    thickness: Number(clamp((wall.thicknessPixels ?? DEFAULT_WALL_THICKNESS * pixelsPerMeter) / pixelsPerMeter, 0.05, 0.5).toFixed(4)),
    kind: wall.kind,
    materialId: wall.kind === 'partition' ? 'wall-partition' : 'wall-default',
    confidence: wall.confidence ?? null,
  }))
  const pixelWalls = new Map(draft.walls.map((wall) => [wall.id, wall]))

  const openings = [
    ...draft.doors.map((door) => {
      const placement = projectOpeningOntoWall(door, pixelWalls.get(door.wallId), pixelsPerMeter)
      return {
        id: door.id, type: 'door', wallId: door.wallId,
        offset: Number(placement.offset.toFixed(6)), width: Number(placement.width.toFixed(6)),
        height: door.heightMeters ?? 2.1, sillHeight: 0, confidence: door.confidence ?? null,
      }
    }),
    ...draft.windows.map((windowOpening) => {
      const placement = projectOpeningOntoWall(windowOpening, pixelWalls.get(windowOpening.wallId), pixelsPerMeter)
      return {
        id: windowOpening.id, type: 'window', wallId: windowOpening.wallId,
        offset: Number(placement.offset.toFixed(6)), width: Number(placement.width.toFixed(6)),
        height: windowOpening.heightMeters ?? 1.3,
        sillHeight: windowOpening.sillHeightMeters ?? 0.85,
        confidence: windowOpening.confidence ?? null,
      }
    }),
  ]

  const document = {
    schemaVersion: ROOM_SCHEMA_VERSION,
    id: `room-document-${draft.source.fixtureId ?? 'floorplan-import'}`,
    units: ROOM_UNITS,
    coordinateSystem: { ...ROOM_COORDINATE_SYSTEM, floorAxes: [...ROOM_COORDINATE_SYSTEM.floorAxes] },
    source: {
      type: 'floorplan-image',
      provider: draft.source.provider ?? null,
      confidence: draft.source.confidence ?? null,
      imageFingerprint: draft.source.imageFingerprint ?? null,
      calibration: {
        type: calibration.type,
        wallId: calibration.wallId ?? null,
        referencePixels: Number(referencePixels.toFixed(3)),
        valueMeters,
        pixelsPerMeter: Number(pixelsPerMeter.toFixed(6)),
      },
    },
    room: {
      id: 'room-floorplan-import',
      name: '导入户型',
      floorElevation: 0,
      floorThickness: DEFAULT_WALL_THICKNESS,
      defaults: { wallHeight, wallThickness: DEFAULT_WALL_THICKNESS },
    },
    walls,
    openings,
    materials: [
      { id: 'wall-default', color: '#eee9df' },
      { id: 'wall-partition', color: '#e4ded3' },
    ],
  }

  return assertValidRoomDocument(document)
}
