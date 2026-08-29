import { PreferenceLevel } from '../common/enums.js'
import { assertValid, normalizeInputEnums, validatePurchaseInput } from '../common/validation.js'
const MEDIUM = PreferenceLevel.MEDIUM
const defaultUserProfile = () => ({ frictionSensitivity: MEDIUM, spaceSensitivity: MEDIUM, aestheticWeight: MEDIUM, budgetCaution: MEDIUM, moveLightnessPreference: MEDIUM, multifunctionPreference: MEDIUM, immediacyPreference: MEDIUM, uncertaintyTolerance: MEDIUM, longTermOwnershipPreference: MEDIUM })
export const defaultPurchaseInput = () => ({
  schemaVersion: 'purchase-decision-input-v0.3.1', decisionType: 'PURCHASE',
  furniture: { id: null, name: null, category: null, lifecycleStatus: null, ownershipType: null, isFavorite: false, sentimentalAttachment: null, dimensions: { width: null, depth: null, height: null }, priceCny: null, originalPriceCny: null, marketPriceCny: null, condition: null, portability: null, foldable: null, modular: null, installationRequired: null, returnable: null, trialAvailable: null, returnWindowDays: null, returnCostCny: null },
  spaceContext: { physicalFit: null, availablePlacementArea: null, remainingClearanceCm: null, mainCirculationWidthCm: null, secondaryCirculationWidthCm: null, doorObstruction: null, windowObstruction: null, lightingImpact: null, functionalAreaImpact: null, collision: null, installationFeasibility: null },
  needContext: { needStrength: null, needUrgency: null, usageFrequency: null, expectedUsageMonths: null, currentPainPoint: null, frictionFrequency: null, frictionSeverity: null, functionalGap: null, substituteAvailable: null, substituteAdequacy: null, alternativeAvailable: null, alternativeCostCny: null, alternativeEffort: null },
  economicsContext: { availableFurnitureBudgetCny: null, expectedResaleValueCny: null, resaleLiquidity: null, recurringCostCny: null },
  lifecycleContext: { expectedStayMonths: null, expectedMoveDate: null, moveCertainty: null, futureReuseProbability: null, setupDifficulty: null, moveDifficulty: null, disposalDifficulty: null },
  reversibilityContext: { returnable: null, trialAvailable: null, returnWindowDays: null, returnCostCny: null, resaleLiquidity: null }, userProfile: defaultUserProfile(),
})
function merge(base, overrides) { for (const [key, value] of Object.entries(overrides ?? {})) { if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object') merge(base[key], value); else base[key] = value } return base }
export function createPurchaseDecisionInput(overrides = {}) { return normalizeInputEnums(merge(defaultPurchaseInput(), overrides)) }
export function validatePurchaseDecisionInput(input) { return validatePurchaseInput(input) }
export function assertValidPurchaseDecisionInput(input) { return assertValid(validatePurchaseDecisionInput(input)) }
