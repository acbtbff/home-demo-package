import { PreferenceLevel } from '../common/enums.js'
import { assertValid, normalizeInputEnums, validateMoveInput } from '../common/validation.js'
const MEDIUM = PreferenceLevel.MEDIUM
const defaultUserProfile = () => ({ frictionSensitivity: MEDIUM, spaceSensitivity: MEDIUM, aestheticWeight: MEDIUM, budgetCaution: MEDIUM, moveLightnessPreference: MEDIUM, multifunctionPreference: MEDIUM, immediacyPreference: MEDIUM, uncertaintyTolerance: MEDIUM, longTermOwnershipPreference: MEDIUM })
export const defaultMoveInput = () => ({
  schemaVersion: 'move-decision-input-v0.3.1', decisionType: 'MOVE',
  furniture: { id: null, name: null, category: null, lifecycleStatus: null, ownershipType: null, isFavorite: false, sentimentalAttachment: null, dimensions: { width: null, depth: null, height: null }, condition: null, coreFunctionStatus: null, safetyRisk: null, ageMonths: null },
  usageContext: { usageFrequency: null, functionalImportance: null, substituteAvailable: null, substituteAdequacy: null, expectedFutureUse: null, remainingUsefulLife: null },
  newHomeContext: { physicalFit: null, availablePlacementArea: null, remainingClearanceCm: null, mainCirculationImpact: null, secondaryCirculationImpact: null, doorObstruction: null, windowObstruction: null, functionalAreaImpact: null, existingReplacement: null, collision: null },
  economicsContext: { replacementCostCny: null, estimatedResaleValueCny: null, resaleLiquidity: null, repairCostCny: null, futureReuseProbability: null, disposalDifficulty: null },
  logisticsContext: { sizeClass: null, handlingBurden: null, movingBurdenScore: null, movingBurdenLevel: null, specialHandling: null, source: 'UNKNOWN' }, userProfile: defaultUserProfile(),
})
function merge(base, overrides) { for (const [key, value] of Object.entries(overrides ?? {})) { if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object') merge(base[key], value); else base[key] = value } return base }
export function createMoveDecisionInput(overrides = {}) { return normalizeInputEnums(merge(defaultMoveInput(), overrides)) }
export function validateMoveDecisionInput(input) { return validateMoveInput(input) }
export function assertValidMoveDecisionInput(input) { return assertValid(validateMoveDecisionInput(input)) }
