export const ROOM_CAMERA_COMMAND_TYPES = Object.freeze({
  ORBIT_CAMERA: 'ORBIT_CAMERA',
})

export const FURNITURE_COMMAND_TYPES = Object.freeze({
  SELECT_FURNITURE: 'SELECT_FURNITURE',
  BEGIN_FURNITURE_INTERACTION: 'BEGIN_FURNITURE_INTERACTION',
  END_FURNITURE_INTERACTION: 'END_FURNITURE_INTERACTION',
  CANCEL_FURNITURE_INTERACTION: 'CANCEL_FURNITURE_INTERACTION',
  MOVE_FURNITURE: 'MOVE_FURNITURE',
  ROTATE_FURNITURE_Y: 'ROTATE_FURNITURE_Y',
  UPDATE_FURNITURE_DIMENSIONS: 'UPDATE_FURNITURE_DIMENSIONS',
  TOGGLE_GEOMETRY_PROXY: 'TOGGLE_GEOMETRY_PROXY',
  ADD_FURNITURE: 'ADD_FURNITURE',
  REMOVE_FURNITURE: 'REMOVE_FURNITURE',
  CREATE_FURNITURE: 'CREATE_FURNITURE',
  CREATE_PLACEMENT: 'CREATE_PLACEMENT',
  UPDATE_FURNITURE_INFO: 'UPDATE_FURNITURE_INFO',
  PURCHASE_FURNITURE: 'PURCHASE_FURNITURE',
})

export function createOrbitCameraCommand({ deltaYaw = 0, deltaPitch = 0 } = {}) {
  return {
    type: ROOM_CAMERA_COMMAND_TYPES.ORBIT_CAMERA,
    deltaYaw,
    deltaPitch,
  }
}

export function createSelectFurnitureCommand(furnitureId) {
  return {
    type: FURNITURE_COMMAND_TYPES.SELECT_FURNITURE,
    furnitureId,
  }
}

export function createBeginFurnitureInteractionCommand(furnitureId) {
  return { type: FURNITURE_COMMAND_TYPES.BEGIN_FURNITURE_INTERACTION, furnitureId }
}

export function createEndFurnitureInteractionCommand(furnitureId) {
  return { type: FURNITURE_COMMAND_TYPES.END_FURNITURE_INTERACTION, furnitureId }
}

export function createCancelFurnitureInteractionCommand(furnitureId) {
  return { type: FURNITURE_COMMAND_TYPES.CANCEL_FURNITURE_INTERACTION, furnitureId }
}

export function createMoveFurnitureCommand({ furnitureId, deltaX = 0, deltaZ = 0 } = {}) {
  return {
    type: FURNITURE_COMMAND_TYPES.MOVE_FURNITURE,
    furnitureId,
    deltaX,
    deltaZ,
  }
}

export function createRotateFurnitureYCommand({ furnitureId, deltaRadians = 0 } = {}) {
  return {
    type: FURNITURE_COMMAND_TYPES.ROTATE_FURNITURE_Y,
    furnitureId,
    deltaRadians,
  }
}

export function createUpdateFurnitureDimensionsCommand({ furnitureId, patch = {} } = {}) {
  return {
    type: FURNITURE_COMMAND_TYPES.UPDATE_FURNITURE_DIMENSIONS,
    furnitureId,
    patch,
  }
}

export function createToggleGeometryProxyCommand(show) {
  return {
    type: FURNITURE_COMMAND_TYPES.TOGGLE_GEOMETRY_PROXY,
    show: Boolean(show),
  }
}

export function createAddFurnitureCommand(catalogItem) {
  return {
    type: FURNITURE_COMMAND_TYPES.ADD_FURNITURE,
    catalogId: catalogItem?.catalogId ?? null,
  }
}

export function createRemoveFurnitureCommand(furnitureId) {
  return {
    type: FURNITURE_COMMAND_TYPES.REMOVE_FURNITURE,
    furnitureId,
  }
}

export function createCreateFurnitureCommand(furnitureInput) {
  return { type: FURNITURE_COMMAND_TYPES.CREATE_FURNITURE, furnitureInput }
}

export function createCreatePlacementCommand(furnitureId) {
  return { type: FURNITURE_COMMAND_TYPES.CREATE_PLACEMENT, furnitureId }
}
export function createUpdateFurnitureInfoCommand({ furnitureId, patch = {} } = {}) {
  return { type: FURNITURE_COMMAND_TYPES.UPDATE_FURNITURE_INFO, furnitureId, patch }
}
export function createPurchaseFurnitureCommand(furnitureId) {
  return { type: FURNITURE_COMMAND_TYPES.PURCHASE_FURNITURE, furnitureId }
}

export function isRoomCameraCommand(command) {
  return command?.type === ROOM_CAMERA_COMMAND_TYPES.ORBIT_CAMERA
}

export function isFurnitureCommand(command) {
  return Object.values(FURNITURE_COMMAND_TYPES).includes(command?.type)
}
