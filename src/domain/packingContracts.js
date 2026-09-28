import {
  PACKING_ORIENTATIONS,
  evaluatePhysicalStateReadiness,
  getFurniturePhysicalState,
} from './furnitureAsset.js'

export const PACKING_CONTRACT_VERSION = 0

export const PACKING_PLAN_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  FEASIBLE: 'FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
})

const nullableString = (value) => value == null || value === '' ? null : String(value)
const nullablePositiveNumber = (value) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}
const dimensions = (value = {}) => ({
  width: nullablePositiveNumber(value.width),
  depth: nullablePositiveNumber(value.depth),
  height: nullablePositiveNumber(value.height),
})

export function createVehicleCargoSpace(input = {}) {
  return {
    id: nullableString(input.id),
    name: nullableString(input.name),
    interiorDimensionsM: dimensions(input.interiorDimensionsM),
    doorDimensionsM: {
      width: nullablePositiveNumber(input.doorDimensionsM?.width),
      height: nullablePositiveNumber(input.doorDimensionsM?.height),
    },
    maxPayloadKg: nullablePositiveNumber(input.maxPayloadKg),
    obstructions: Array.isArray(input.obstructions) ? input.obstructions : [],
  }
}

export function createPackingItem(input = {}) {
  return {
    id: nullableString(input.id),
    furnitureAssetId: nullableString(input.furnitureAssetId),
    physicalStateId: nullableString(input.physicalStateId),
    dimensionsM: dimensions(input.dimensionsM),
    weightKg: nullablePositiveNumber(input.weightKg),
    allowedOrientations: Array.isArray(input.allowedOrientations)
      ? Array.from(new Set(input.allowedOrientations.filter((value) => Object.values(PACKING_ORIENTATIONS).includes(value))))
      : [],
    stackable: typeof input.stackable === 'boolean' ? input.stackable : null,
    maxSupportedWeightKg: nullablePositiveNumber(input.maxSupportedWeightKg),
    fragile: typeof input.fragile === 'boolean' ? input.fragile : null,
    loadSequencePriority: nullablePositiveNumber(input.loadSequencePriority),
  }
}

export function createPackingItemFromFurnitureAsset(asset, physicalStateId) {
  const state = getFurniturePhysicalState(asset, physicalStateId)
  if (!state) throw new Error(`Unknown furniture physical state: ${physicalStateId ?? 'default'}`)

  return createPackingItem({
    id: `${asset.id}:${state.id}`,
    furnitureAssetId: asset.id,
    physicalStateId: state.id,
    dimensionsM: state.dimensionsM,
    weightKg: state.weightKg,
    allowedOrientations: state.handling.allowedOrientations,
    stackable: state.handling.stackable,
    maxSupportedWeightKg: state.handling.maxSupportedWeightKg,
    fragile: state.handling.fragile,
  })
}

export function createPackingRequest(input = {}) {
  return {
    contractVersion: PACKING_CONTRACT_VERSION,
    id: nullableString(input.id),
    vehicle: createVehicleCargoSpace(input.vehicle),
    items: (Array.isArray(input.items) ? input.items : []).map(createPackingItem),
    objectives: {
      minimizeVehicleCount: input.objectives?.minimizeVehicleCount !== false,
      maximizeVolumeUtilization: input.objectives?.maximizeVolumeUtilization !== false,
      preserveLoadOrder: input.objectives?.preserveLoadOrder === true,
      balanceWeight: input.objectives?.balanceWeight !== false,
    },
  }
}

export function evaluatePackingRequestReadiness(request) {
  const issues = []
  const vehicleDimensions = request?.vehicle?.interiorDimensionsM ?? {}
  for (const field of ['width', 'depth', 'height']) {
    if (vehicleDimensions[field] == null) issues.push(`MISSING_VEHICLE_INTERIOR_${field.toUpperCase()}`)
  }
  if (request?.vehicle?.maxPayloadKg == null) issues.push('MISSING_VEHICLE_PAYLOAD')
  if (!request?.items?.length) issues.push('NO_PACKING_ITEMS')

  let totalWeightKg = 0
  request?.items?.forEach((item, index) => {
    const readiness = evaluatePhysicalStateReadiness({
      dimensionsM: item.dimensionsM,
      weightKg: item.weightKg,
      handling: { allowedOrientations: item.allowedOrientations },
      provenance: {},
    })
    readiness.missingFields.forEach((field) => issues.push(`ITEM_${index}_${field.toUpperCase().replaceAll('.', '_')}`))
    totalWeightKg += item.weightKg ?? 0
  })

  if (request?.vehicle?.maxPayloadKg != null && totalWeightKg > request.vehicle.maxPayloadKg) {
    issues.push('PAYLOAD_EXCEEDED')
  }

  return {
    ready: issues.length === 0,
    issues: Array.from(new Set(issues)),
    totalWeightKg: Number(totalWeightKg.toFixed(3)),
    remainingPayloadKg: request?.vehicle?.maxPayloadKg == null
      ? null
      : Number((request.vehicle.maxPayloadKg - totalWeightKg).toFixed(3)),
  }
}

export function createPackingPlan(input = {}) {
  const status = Object.values(PACKING_PLAN_STATUSES).includes(input.status)
    ? input.status
    : PACKING_PLAN_STATUSES.DRAFT
  return {
    contractVersion: PACKING_CONTRACT_VERSION,
    requestId: nullableString(input.requestId),
    status,
    placements: Array.isArray(input.placements) ? input.placements : [],
    unplacedItemIds: Array.isArray(input.unplacedItemIds) ? input.unplacedItemIds : [],
    metrics: {
      volumeUtilization: Number.isFinite(Number(input.metrics?.volumeUtilization))
        ? Number(input.metrics.volumeUtilization)
        : null,
      totalWeightKg: nullablePositiveNumber(input.metrics?.totalWeightKg),
      vehicleCount: nullablePositiveNumber(input.metrics?.vehicleCount),
    },
    explanations: Array.isArray(input.explanations) ? input.explanations.map(String) : [],
  }
}
