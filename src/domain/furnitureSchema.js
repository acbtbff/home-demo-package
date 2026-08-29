import { createModelStrategy } from './furnitureRouter.js'
import { normalizeFurnitureSemantic } from './furnitureSemantic.js'

const nullableString = (value) => value == null || value === '' ? null : String(value)
const nullableBoolean = (value) => typeof value === 'boolean' ? value : null
const nullablePositiveNumber = (value) => {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

export function normalizeDimensionsM(value = {}) {
  return {
    width: nullablePositiveNumber(value.width),
    depth: nullablePositiveNumber(value.depth),
    height: nullablePositiveNumber(value.height),
  }
}

export function createFurniture(input = {}) {
  const semantic = normalizeFurnitureSemantic(input.semantic ?? input)
  const modelStrategy = input.modelStrategy ?? {}
  const defaultModelStrategy = createModelStrategy(semantic)

  return {
    id: nullableString(input.id),
    name: nullableString(input.name),
    semantic,
    physical: {
      dimensionsM: normalizeDimensionsM(input.physical?.dimensionsM),
      weightKg: nullablePositiveNumber(input.physical?.weightKg),
      foldable: nullableBoolean(input.physical?.foldable),
      disassemblable: nullableBoolean(input.physical?.disassemblable),
      modular: nullableBoolean(input.physical?.modular),
      canServeAsMovingContainer: nullableBoolean(input.physical?.canServeAsMovingContainer),
    },
    lifecycle: {
      status: nullableString(input.lifecycle?.status),
      conditionLevel: nullableString(input.lifecycle?.conditionLevel),
      coreFunctionStatus: nullableString(input.lifecycle?.coreFunctionStatus),
      safetyRisk: nullableString(input.lifecycle?.safetyRisk),
    },
    appearance: {
      dominantColor: nullableString(input.appearance?.dominantColor),
    },
    modelStrategy: {
      ...defaultModelStrategy,
      preferred: modelStrategy.preferred ?? defaultModelStrategy.preferred,
      resolved: modelStrategy.resolved ?? null,
    },
  }
}

export function assertFurnitureHasNoPlacement(furniture) {
  const forbidden = ['position', 'rotationY', 'roomId']
  const present = forbidden.filter((field) => Object.prototype.hasOwnProperty.call(furniture, field))
  if (present.length > 0) throw new Error(`Furniture must not contain placement fields: ${present.join(', ')}`)
  return furniture
}
