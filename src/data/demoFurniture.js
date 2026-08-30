import { createFurniture } from '../domain/furnitureSchema.js'
import { MODEL_STRATEGIES } from '../domain/furnitureRouter.js'
import { createPlacement } from '../domain/spatialContracts.js'

export const DEMO_DESK_DIMENSION_SOURCE = 'estimated/default prototype values from FURN-001; not measured from the image'

export const DEMO_DESK_FURNITURE = createFurniture({
  id: 'demo-desk-001',
  name: '原木书桌',
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
    status: 'OWNED',
    conditionLevel: 'GOOD',
    coreFunctionStatus: 'WORKING',
    safetyRisk: false,
  },
  ownership: { type: 'USER' },
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
  name: '房东双人沙发',
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
    status: 'OWNED',
    conditionLevel: 'GOOD',
    coreFunctionStatus: 'WORKING',
    safetyRisk: false,
  },
  ownership: { type: 'LANDLORD' },
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

export const DEMO_OFFICE_CHAIR_FURNITURE = createFurniture({
  id: 'demo-office-chair-owned-001',
  name: '办公椅',
  semantic: { category: 'CHAIR', archetype: 'OFFICE_CHAIR' },
  physical: { dimensionsM: { width: 0.62, depth: 0.62, height: 0.92 } },
  ownership: { type: 'USER' },
  lifecycle: { status: 'OWNED', conditionLevel: 'GOOD', coreFunctionStatus: 'WORKING', safetyRisk: false },
  modelStrategy: { preferred: MODEL_STRATEGIES.LIBRARY, resolved: MODEL_STRATEGIES.LIBRARY },
})

export const DEMO_OFFICE_CHAIR_PLACEMENT = createPlacement({
  id: 'placement-demo-office-chair-owned-001',
  furnitureId: DEMO_OFFICE_CHAIR_FURNITURE.id,
  roomId: 'room-01',
  position: { x: 0.8, y: 0, z: -0.55 },
  rotationY: 0,
})

export const DEMO_WISHLIST_CHAIR_FURNITURE = createFurniture({
  id: 'demo-wishlist-office-chair-001',
  name: '人体工学办公椅',
  semantic: { category: 'CHAIR', archetype: 'OFFICE_CHAIR' },
  physical: { dimensionsM: { width: 0.62, depth: 0.62, height: 0.92 } },
  ownership: { type: 'NONE' },
  lifecycle: { status: 'WISHLIST' },
  product: { name: '人体工学办公椅', price: 899 },
  modelStrategy: { preferred: MODEL_STRATEGIES.LIBRARY, resolved: MODEL_STRATEGIES.LIBRARY },
})

export const DEMO_WISHLIST_CHAIR_PLACEMENT = createPlacement({
  id: 'placement-demo-wishlist-office-chair-001',
  furnitureId: DEMO_WISHLIST_CHAIR_FURNITURE.id,
  roomId: 'room-01',
  position: { x: -1.05, y: 0, z: -1.25 },
  rotationY: -Math.PI / 6,
})
