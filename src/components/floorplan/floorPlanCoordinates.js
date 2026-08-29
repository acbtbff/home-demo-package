import { getWallsBounds } from '../../domain/roomGeometry.js'

export const FLOOR_PLAN_VIEWBOX = { width: 1000, height: 700 }
export const FLOOR_PLAN_PADDING = 72

export function getFloorPlanBounds(walls) {
  const bounds = getWallsBounds(walls)
  if (bounds.width > 0 || bounds.depth > 0) return bounds
  return { minX: -3, maxX: 3, minZ: -2, maxZ: 2, width: 6, depth: 4, centerX: 0, centerZ: 0 }
}

export function createFloorPlanTransform(bounds, zoom = 1) {
  const usableWidth = FLOOR_PLAN_VIEWBOX.width - FLOOR_PLAN_PADDING * 2
  const usableHeight = FLOOR_PLAN_VIEWBOX.height - FLOOR_PLAN_PADDING * 2
  const scale = Math.max(1, Math.min(usableWidth / Math.max(bounds.width, 0.5), usableHeight / Math.max(bounds.depth, 0.5)) * zoom)

  return {
    scale,
    worldToScreen(point) {
      return {
        x: FLOOR_PLAN_VIEWBOX.width / 2 + (point.x - bounds.centerX) * scale,
        y: FLOOR_PLAN_VIEWBOX.height / 2 + (point.z - bounds.centerZ) * scale,
      }
    },
    screenToWorld(point) {
      return {
        x: bounds.centerX + (point.x - FLOOR_PLAN_VIEWBOX.width / 2) / scale,
        z: bounds.centerZ + (point.y - FLOOR_PLAN_VIEWBOX.height / 2) / scale,
      }
    },
  }
}
