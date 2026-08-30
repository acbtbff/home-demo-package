import { BurdenLevel, DataSource, LifecycleStatus, OwnershipType, PreferenceLevel, enumValues, normalizeLifecycleStatus, normalizeOwnershipType } from './enums.js'

export const FORBIDDEN_INPUT_FIELDS = Object.freeze([
  'decision', 'confidence', 'primaryReasons', 'tradeoffs', 'positiveEvidence', 'negativeEvidence',
  'hardRulesTriggered', 'nextAction', 'agentReasoning', 'finalScore', 'recommendationScore',
])
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const addError = (errors, path, message) => errors.push({ path, message })

function validateNullableNumber(value, path, errors) {
  if (value === null || value === undefined) return
  if (typeof value !== 'number' || !Number.isFinite(value)) addError(errors, path, 'must be a finite number or null')
  else if (value < 0) addError(errors, path, 'must be non-negative')
}
function validateEnum(value, enumeration, path, errors) {
  if (value === null || value === undefined || value === 'UNKNOWN') return
  if (typeof value !== 'string' || !enumValues(enumeration).includes(value)) addError(errors, path, `must be one of ${enumValues(enumeration).join(', ')} or null`)
}
function validateFurniture(furniture, errors) {
  if (!isObject(furniture)) { addError(errors, 'furniture', 'must be an object'); return }
  if (typeof furniture.isFavorite !== 'boolean') addError(errors, 'furniture.isFavorite', 'must be a boolean')
  if (furniture.sentimentalAttachment !== null && furniture.sentimentalAttachment !== true) addError(errors, 'furniture.sentimentalAttachment', 'must be true or null')
  for (const dimension of ['width', 'depth', 'height']) validateNullableNumber(furniture.dimensions?.[dimension], `furniture.dimensions.${dimension}`, errors)
  if (furniture.lifecycleStatus != null && normalizeLifecycleStatus(furniture.lifecycleStatus) === null) validateEnum(furniture.lifecycleStatus, LifecycleStatus, 'furniture.lifecycleStatus', errors)
  if (furniture.ownershipType != null && normalizeOwnershipType(furniture.ownershipType) === null) validateEnum(furniture.ownershipType, OwnershipType, 'furniture.ownershipType', errors)
}
function validateProfile(profile, errors) {
  if (!isObject(profile)) { addError(errors, 'userProfile', 'must be an object'); return }
  for (const [key, value] of Object.entries(profile)) validateEnum(value, PreferenceLevel, `userProfile.${key}`, errors)
}
function validateForbiddenFields(input, errors, path = '') {
  if (!isObject(input)) return
  for (const [key, value] of Object.entries(input)) {
    const nextPath = path ? `${path}.${key}` : key
    if (FORBIDDEN_INPUT_FIELDS.includes(key)) addError(errors, nextPath, 'is reserved for decision output')
    validateForbiddenFields(value, errors, nextPath)
  }
}
function validateBase(input, schemaVersion, decisionType) {
  const errors = []
  if (!isObject(input)) return { valid: false, errors: [{ path: '', message: 'input must be an object' }] }
  if (input.schemaVersion !== schemaVersion) addError(errors, 'schemaVersion', `must be ${schemaVersion}`)
  if (input.decisionType !== decisionType) addError(errors, 'decisionType', `must be ${decisionType}`)
  validateFurniture(input.furniture, errors); validateProfile(input.userProfile, errors); validateForbiddenFields(input, errors)
  return { valid: errors.length === 0, errors }
}
function validateNumericPaths(input, paths, errors) {
  for (const path of paths) validateNullableNumber(path.split('.').reduce((current, key) => current?.[key], input), path, errors)
}
export function validatePurchaseInput(input) {
  const result = validateBase(input, 'purchase-decision-input-v0.3.1', 'PURCHASE')
  if (!isObject(input)) return result
  validateNumericPaths(input, ['furniture.priceCny', 'furniture.originalPriceCny', 'furniture.marketPriceCny', 'furniture.returnWindowDays', 'furniture.returnCostCny', 'spaceContext.remainingClearanceCm', 'spaceContext.mainCirculationWidthCm', 'spaceContext.secondaryCirculationWidthCm', 'needContext.expectedUsageMonths', 'needContext.alternativeCostCny', 'economicsContext.availableFurnitureBudgetCny', 'economicsContext.expectedResaleValueCny', 'economicsContext.recurringCostCny', 'lifecycleContext.expectedStayMonths', 'reversibilityContext.returnWindowDays', 'reversibilityContext.returnCostCny'], result.errors)
  return { valid: result.errors.length === 0, errors: result.errors }
}
export function validateMoveInput(input) {
  const result = validateBase(input, 'move-decision-input-v0.3.1', 'MOVE')
  if (!isObject(input)) return result
  validateNumericPaths(input, ['furniture.ageMonths', 'newHomeContext.remainingClearanceCm', 'economicsContext.replacementCostCny', 'economicsContext.estimatedResaleValueCny', 'economicsContext.repairCostCny', 'logisticsContext.movingBurdenScore'], result.errors)
  validateEnum(input.logisticsContext?.source, DataSource, 'logisticsContext.source', result.errors); validateEnum(input.logisticsContext?.handlingBurden, BurdenLevel, 'logisticsContext.handlingBurden', result.errors); validateEnum(input.logisticsContext?.movingBurdenLevel, BurdenLevel, 'logisticsContext.movingBurdenLevel', result.errors)
  return { valid: result.errors.length === 0, errors: result.errors }
}
export function normalizeInputEnums(input) {
  const copy = structuredClone(input)
  if (copy?.furniture?.lifecycleStatus !== undefined) copy.furniture.lifecycleStatus = normalizeLifecycleStatus(copy.furniture.lifecycleStatus)
  if (copy?.furniture?.ownershipType !== undefined) copy.furniture.ownershipType = normalizeOwnershipType(copy.furniture.ownershipType)
  return copy
}
export function assertValid(result) {
  if (!result.valid) throw new TypeError(result.errors.map(({ path, message }) => `${path}: ${message}`).join('; '))
  return true
}
