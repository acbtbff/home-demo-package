import { PreferenceLevel } from '../common/enums.js'

const MEDIUM = PreferenceLevel.MEDIUM
export const DEFAULT_USER_PROFILE = Object.freeze({
  frictionSensitivity: MEDIUM, spaceSensitivity: MEDIUM, aestheticWeight: MEDIUM,
  budgetCaution: MEDIUM, moveLightnessPreference: MEDIUM, multifunctionPreference: MEDIUM,
  immediacyPreference: MEDIUM, uncertaintyTolerance: MEDIUM, longTermOwnershipPreference: MEDIUM,
})

export function adaptUserProfile(profile = {}) {
  const result = { ...DEFAULT_USER_PROFILE }
  for (const key of Object.keys(DEFAULT_USER_PROFILE)) {
    if ([PreferenceLevel.LOW, PreferenceLevel.MEDIUM, PreferenceLevel.HIGH].includes(profile?.[key])) result[key] = profile[key]
  }
  return result
}
