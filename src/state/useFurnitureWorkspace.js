import { useMemo, useState } from 'react'
import {
  DEMO_DESK_FURNITURE,
  DEMO_DESK_PLACEMENT,
  DEMO_TWO_SEAT_SOFA_FURNITURE,
  DEMO_TWO_SEAT_SOFA_PLACEMENT,
} from '../data/demoFurniture.js'
import {
  FURNITURE_COMMAND_TYPES,
  ROOM_CAMERA_COMMAND_TYPES,
  isFurnitureCommand,
  isRoomCameraCommand,
} from '../domain/interactionCommands.js'
import { analyzeSpatialState } from '../domain/spatialAnalyzer.js'
import { createFurniture } from '../domain/furnitureSchema.js'
import { createPlacement } from '../domain/spatialContracts.js'
import { getExteriorWallsBounds } from '../domain/roomGeometry.js'
import { getFurnitureCatalogItem } from '../data/furnitureCatalog.js'
import { createFurnitureFromIntake } from '../domain/furnitureIntake.js'

const createFurnitureMap = () => ({
  [DEMO_DESK_FURNITURE.id]: structuredClone(DEMO_DESK_FURNITURE),
  [DEMO_TWO_SEAT_SOFA_FURNITURE.id]: structuredClone(DEMO_TWO_SEAT_SOFA_FURNITURE),
})

const createPlacementMap = () => ({
  [DEMO_DESK_PLACEMENT.id]: structuredClone(DEMO_DESK_PLACEMENT),
  [DEMO_TWO_SEAT_SOFA_PLACEMENT.id]: structuredClone(DEMO_TWO_SEAT_SOFA_PLACEMENT),
})

function updatePlacementMap(placementsById, placement) {
  return { ...placementsById, [placement.id]: placement }
}

function updateFurnitureDimensions(furniture, patch) {
  return {
    ...furniture,
    physical: {
      ...furniture.physical,
      dimensionsM: {
        ...furniture.physical.dimensionsM,
        ...patch,
      },
    },
  }
}

function isPlacementAllowed({ roomDocument, state, furnitureId, candidatePlacementsById }) {
  const furnitureItems = Object.values(state.furnitureById)
  const analysis = analyzeSpatialState({
    roomDocument,
    furnitureItems,
    placementsById: candidatePlacementsById,
  })
  const facts = analysis.byFurnitureId[furnitureId]
  return !facts?.furnitureCollision && !facts?.exteriorWallCollision && !facts?.outOfBounds
}

function getEffectivePlacementsById(state) {
  return { ...state.placementsById, ...state.previewPlacementsById }
}

function createSearchOffsets(step = 0.5, rings = 12) {
  const offsets = [{ x: 0, z: 0 }]
  for (let ring = 1; ring <= rings; ring += 1) {
    for (let x = -ring; x <= ring; x += 1) offsets.push({ x: x * step, z: -ring * step })
    for (let z = -ring + 1; z <= ring; z += 1) offsets.push({ x: ring * step, z: z * step })
    for (let x = ring - 1; x >= -ring; x -= 1) offsets.push({ x: x * step, z: ring * step })
    for (let z = ring - 1; z > -ring; z -= 1) offsets.push({ x: -ring * step, z: z * step })
  }
  return offsets
}

const INITIAL_PLACEMENT_OFFSETS = createSearchOffsets()

function addFurnitureFromCatalog(state, catalogItem, roomDocument) {
  if (!catalogItem || !roomDocument) return state
  const sequence = state.nextFurnitureSequence
  const furnitureId = `catalog-${catalogItem.catalogId}-${sequence}`
  const placementId = `placement-${furnitureId}`
  const furniture = createFurniture({
    id: furnitureId,
    name: `${catalogItem.name} ${sequence}`,
    semantic: { category: catalogItem.category, archetype: catalogItem.archetype },
    physical: { dimensionsM: catalogItem.defaultDimensionsM },
    modelStrategy: { preferred: catalogItem.modelStrategy, resolved: catalogItem.modelStrategy },
  })
  const bounds = getExteriorWallsBounds(roomDocument.walls)
  const furnitureById = { ...state.furnitureById, [furnitureId]: furniture }

  for (const offset of INITIAL_PLACEMENT_OFFSETS) {
    const placement = createPlacement({
      id: placementId,
      furnitureId,
      roomId: roomDocument.room.id,
      position: { x: bounds.centerX + offset.x, y: 0, z: bounds.centerZ + offset.z },
      rotationY: 0,
    })
    const placementsById = updatePlacementMap(state.placementsById, placement)
    const candidateState = { ...state, furnitureById }
    if (isPlacementAllowed({ roomDocument, state: candidateState, furnitureId, candidatePlacementsById: placementsById })) {
      return {
        ...state,
        furnitureById,
        placementsById,
        selectedFurnitureId: furnitureId,
        nextFurnitureSequence: sequence + 1,
      }
    }
  }
  return state
}

function findPlacementForFurniture(state, furnitureId, roomDocument) {
  if (!roomDocument || !state.furnitureById[furnitureId]) return null
  const bounds = getExteriorWallsBounds(roomDocument.walls)
  for (const offset of INITIAL_PLACEMENT_OFFSETS) {
    const placement = createPlacement({ id: `placement-${furnitureId}`, furnitureId, roomId: roomDocument.room.id, position: { x: bounds.centerX + offset.x, y: 0, z: bounds.centerZ + offset.z } })
    const placementsById = updatePlacementMap(state.placementsById, placement)
    if (isPlacementAllowed({ roomDocument, state, furnitureId, candidatePlacementsById: placementsById })) return placement
  }
  return null
}

export function reduceFurnitureWorkspace(state, command, roomDocument = null) {
  if (!command) return state

  if (isRoomCameraCommand(command)) {
    return { ...state, lastRoomCommand: command }
  }

  if (!isFurnitureCommand(command)) return state

  switch (command.type) {
    case FURNITURE_COMMAND_TYPES.CREATE_FURNITURE: {
      const sequence = state.nextFurnitureSequence
      let furniture
      try {
        furniture = createFurnitureFromIntake({ ...command.furnitureInput, id: command.furnitureInput?.id ?? `intake-${sequence}` })
      } catch {
        return state
      }
      return { ...state, furnitureById: { ...state.furnitureById, [furniture.id]: furniture }, selectedFurnitureId: furniture.id, nextFurnitureSequence: sequence + 1 }
    }
    case FURNITURE_COMMAND_TYPES.CREATE_PLACEMENT: {
      const placement = findPlacementForFurniture(state, command.furnitureId, roomDocument)
      return placement ? { ...state, placementsById: updatePlacementMap(state.placementsById, placement), selectedFurnitureId: command.furnitureId } : state
    }
    case FURNITURE_COMMAND_TYPES.ADD_FURNITURE:
      return addFurnitureFromCatalog(state, getFurnitureCatalogItem(command.catalogId), roomDocument)
    case FURNITURE_COMMAND_TYPES.REMOVE_FURNITURE: {
      if (!command.furnitureId || !state.furnitureById[command.furnitureId]) return state
      const furnitureById = { ...state.furnitureById }
      delete furnitureById[command.furnitureId]
      const placementsById = Object.fromEntries(
        Object.entries(state.placementsById).filter(([, placement]) => placement.furnitureId !== command.furnitureId),
      )
      return {
        ...state,
        furnitureById,
        placementsById,
        previewPlacementsById: {},
        activeFurnitureInteraction: null,
        selectedFurnitureId: state.selectedFurnitureId === command.furnitureId ? null : state.selectedFurnitureId,
      }
    }
    case FURNITURE_COMMAND_TYPES.SELECT_FURNITURE:
      return { ...state, selectedFurnitureId: command.furnitureId ?? null }
    case FURNITURE_COMMAND_TYPES.BEGIN_FURNITURE_INTERACTION: {
      if (state.selectedFurnitureId !== command.furnitureId) return state
      const placement = Object.values(state.placementsById).find((item) => item.furnitureId === command.furnitureId)
      if (!placement) return state
      return {
        ...state,
        activeFurnitureInteraction: { furnitureId: command.furnitureId, placementId: placement.id },
        previewPlacementsById: updatePlacementMap({}, structuredClone(placement)),
      }
    }
    case FURNITURE_COMMAND_TYPES.END_FURNITURE_INTERACTION: {
      if (state.activeFurnitureInteraction?.furnitureId !== command.furnitureId) return state
      const previewPlacement = state.previewPlacementsById[state.activeFurnitureInteraction.placementId]
      const candidatePlacementsById = previewPlacement
        ? updatePlacementMap(state.placementsById, previewPlacement)
        : state.placementsById
      const shouldCommit = previewPlacement && (!roomDocument || isPlacementAllowed({
        roomDocument,
        state,
        furnitureId: command.furnitureId,
        candidatePlacementsById,
      }))
      return {
        ...state,
        placementsById: shouldCommit ? candidatePlacementsById : state.placementsById,
        previewPlacementsById: {},
        activeFurnitureInteraction: null,
      }
    }
    case FURNITURE_COMMAND_TYPES.CANCEL_FURNITURE_INTERACTION:
      if (state.activeFurnitureInteraction?.furnitureId !== command.furnitureId) return state
      return { ...state, previewPlacementsById: {}, activeFurnitureInteraction: null }
    case FURNITURE_COMMAND_TYPES.MOVE_FURNITURE: {
      if (state.selectedFurnitureId !== command.furnitureId) return state
      const previewActive = state.activeFurnitureInteraction?.furnitureId === command.furnitureId
      const sourcePlacementsById = previewActive ? getEffectivePlacementsById(state) : state.placementsById
      const placement = Object.values(sourcePlacementsById).find((item) => item.furnitureId === command.furnitureId)
      if (!placement) return state
      const candidatePlacement = {
        ...placement,
        position: {
          ...placement.position,
          x: placement.position.x + command.deltaX,
          z: placement.position.z + command.deltaZ,
        },
      }
      const candidatePlacementsById = updatePlacementMap(state.placementsById, candidatePlacement)
      const effectiveCandidatePlacementsById = previewActive
        ? updatePlacementMap(getEffectivePlacementsById(state), candidatePlacement)
        : candidatePlacementsById
      if (roomDocument && !isPlacementAllowed({ roomDocument, state, furnitureId: command.furnitureId, candidatePlacementsById: effectiveCandidatePlacementsById })) {
        return state
      }
      return {
        ...state,
        [previewActive ? 'previewPlacementsById' : 'placementsById']: updatePlacementMap(
          previewActive ? state.previewPlacementsById : state.placementsById,
          candidatePlacement,
        ),
      }
    }
    case FURNITURE_COMMAND_TYPES.ROTATE_FURNITURE_Y: {
      if (state.selectedFurnitureId !== command.furnitureId) return state
      const previewActive = state.activeFurnitureInteraction?.furnitureId === command.furnitureId
      const sourcePlacementsById = previewActive ? getEffectivePlacementsById(state) : state.placementsById
      const placement = Object.values(sourcePlacementsById).find((item) => item.furnitureId === command.furnitureId)
      if (!placement) return state
      const candidatePlacement = {
        ...placement,
        rotationY: placement.rotationY + command.deltaRadians,
      }
      const candidatePlacementsById = updatePlacementMap(state.placementsById, candidatePlacement)
      const effectiveCandidatePlacementsById = previewActive
        ? updatePlacementMap(getEffectivePlacementsById(state), candidatePlacement)
        : candidatePlacementsById
      if (roomDocument && !isPlacementAllowed({ roomDocument, state, furnitureId: command.furnitureId, candidatePlacementsById: effectiveCandidatePlacementsById })) {
        return state
      }
      return {
        ...state,
        [previewActive ? 'previewPlacementsById' : 'placementsById']: updatePlacementMap(
          previewActive ? state.previewPlacementsById : state.placementsById,
          candidatePlacement,
        ),
      }
    }
    case FURNITURE_COMMAND_TYPES.UPDATE_FURNITURE_DIMENSIONS: {
      if (state.selectedFurnitureId !== command.furnitureId) return state
      const furniture = state.furnitureById[command.furnitureId]
      if (!furniture) return state
      return {
        ...state,
        furnitureById: {
          ...state.furnitureById,
          [furniture.id]: updateFurnitureDimensions(furniture, command.patch ?? {}),
        },
      }
    }
    case FURNITURE_COMMAND_TYPES.TOGGLE_GEOMETRY_PROXY:
      return { ...state, showGeometryProxy: command.show }
    default:
      return state
  }
}

export function createFurnitureWorkspaceState() {
  return {
    furnitureById: createFurnitureMap(),
    placementsById: createPlacementMap(),
    previewPlacementsById: {},
    activeFurnitureInteraction: null,
    selectedFurnitureId: null,
    nextFurnitureSequence: 1,
    showGeometryProxy: false,
    lastRoomCommand: { type: ROOM_CAMERA_COMMAND_TYPES.ORBIT_CAMERA, deltaYaw: 0, deltaPitch: 0 },
  }
}

export function useFurnitureWorkspace(roomDocument) {
  const [state, setState] = useState(() => createFurnitureWorkspaceState())

  const dispatchInteractionCommand = (command) => {
    setState((current) => reduceFurnitureWorkspace(current, command, roomDocument))
  }

  const furnitureItems = useMemo(() => Object.values(state.furnitureById), [state.furnitureById])
  const effectivePlacementsById = useMemo(
    () => ({ ...state.placementsById, ...state.previewPlacementsById }),
    [state.placementsById, state.previewPlacementsById],
  )
  const selectedFurniture = state.selectedFurnitureId ? state.furnitureById[state.selectedFurnitureId] : null
  const selectedPlacement = selectedFurniture
    ? Object.values(effectivePlacementsById).find((placement) => placement.furnitureId === selectedFurniture.id) ?? null
    : null
  const spatialAnalysis = useMemo(
    () => analyzeSpatialState({
      roomDocument,
      furnitureItems,
      placementsById: effectivePlacementsById,
    }),
    [effectivePlacementsById, furnitureItems, roomDocument],
  )

  return {
    ...state,
    furnitureItems,
    selectedFurniture,
    selectedPlacement,
    effectivePlacementsById,
    spatialAnalysis,
    dispatchInteractionCommand,
  }
}
