import { createFurniture } from '../domain/furnitureSchema.js'
import { MODEL_STRATEGIES } from '../domain/furnitureRouter.js'
import { createPlacement } from '../domain/spatialContracts.js'

export const DEMO_DESK_DIMENSION_SOURCE = 'estimated/default prototype values from FURN-001; not measured from the image'

export const DEMO_DESK_FURNITURE = createFurniture({
  id: 'demo-desk-001',
  name: 'Demo Desk',
  semantic: {
    category: 'TABLE',
    archetype: 'DESK',
  },
  physical: {
    dimensionsM: {
      width: 1.2,
      depth: 0.6,
      height: 0.75,
    },
    weightKg: null,
    foldable: null,
    disassemblable: null,
    modular: null,
    canServeAsMovingContainer: null,
  },
  lifecycle: {
    status: null,
    conditionLevel: null,
    coreFunctionStatus: null,
    safetyRisk: null,
  },
  appearance: {
    dominantColor: 'DARK_WOOD',
  },
  modelStrategy: {
    preferred: MODEL_STRATEGIES.PARAMETRIC,
    resolved: MODEL_STRATEGIES.PARAMETRIC,
  },
})

export const DEMO_DESK_PLACEMENT = createPlacement({
  id: 'placement-demo-desk-001',
  furnitureId: DEMO_DESK_FURNITURE.id,
  roomId: 'room-01',
  position: { x: 0.85, y: 0, z: -1.45 },
  rotationY: Math.PI / 2,
})

export const DEMO_TWO_SEAT_SOFA_DIMENSION_SOURCE = 'estimated/default prototype values for FURN-005A; not measured from a GLB'

export const DEMO_TWO_SEAT_SOFA_FURNITURE = createFurniture({
  id: 'demo-two-seat-sofa-001',
  name: 'Demo Two Seat Sofa',
  semantic: {
    category: 'SOFA',
    archetype: 'TWO_SEAT_SOFA',
  },
  physical: {
    dimensionsM: {
      width: 1.65,
      depth: 0.82,
      height: 0.8,
    },
    weightKg: null,
    foldable: null,
    disassemblable: null,
    modular: null,
    canServeAsMovingContainer: null,
  },
  lifecycle: {
    status: null,
    conditionLevel: null,
    coreFunctionStatus: null,
    safetyRisk: null,
  },
  appearance: {
    dominantColor: 'WARM_GRAY',
  },
  modelStrategy: {
    preferred: MODEL_STRATEGIES.LIBRARY,
    resolved: MODEL_STRATEGIES.LIBRARY,
  },
})

export const DEMO_TWO_SEAT_SOFA_PLACEMENT = createPlacement({
  id: 'placement-demo-two-seat-sofa-001',
  furnitureId: DEMO_TWO_SEAT_SOFA_FURNITURE.id,
  roomId: 'room-01',
  position: { x: -0.55, y: 0, z: 0.75 },
  rotationY: 0,
})
