export const GEOMETRY_PROXY_SHAPES = Object.freeze({
  BOX: 'BOX',
})

export const GEOMETRY_PROXY_PIVOTS = Object.freeze({
  BOTTOM_CENTER: 'bottom-center',
})

export function createPlacement({ id = null, furnitureId = null, roomId = null, position = {}, rotationY = 0 } = {}) {
  return {
    id,
    furnitureId,
    roomId,
    position: {
      x: Number.isFinite(Number(position.x)) ? Number(position.x) : 0,
      y: Number.isFinite(Number(position.y)) ? Number(position.y) : 0,
      z: Number.isFinite(Number(position.z)) ? Number(position.z) : 0,
    },
    rotationY: Number.isFinite(Number(rotationY)) ? Number(rotationY) : 0,
  }
}

export function createGeometryProxyFromFurniture(furniture) {
  return {
    furnitureId: furniture?.id ?? null,
    dimensionsM: {
      width: furniture?.physical?.dimensionsM?.width ?? null,
      depth: furniture?.physical?.dimensionsM?.depth ?? null,
      height: furniture?.physical?.dimensionsM?.height ?? null,
    },
    shape: GEOMETRY_PROXY_SHAPES.BOX,
    pivot: GEOMETRY_PROXY_PIVOTS.BOTTOM_CENTER,
  }
}

export const SPATIAL_ANALYZER_OUTPUT_CONTRACT = Object.freeze({
  outOfBounds: 'boolean: placement footprint crosses the valid room floor boundary',
  collisionDetected: 'boolean: placement footprint overlaps another occupied spatial proxy',
  physicalFit: 'boolean: dimensions can physically fit under current room geometry constraints',
  canReconfigure: 'boolean: a valid alternative placement may exist',
  pathWidthAfterPlacementCm: 'number|null: narrowest relevant remaining passage width in centimeters',
  spatialImpact: 'string|object|null: coarse impact label or structured area-impact score',
  occupiesScarceSpace: 'boolean: placement consumes constrained circulation or access space',
})

