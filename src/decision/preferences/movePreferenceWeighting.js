import { adaptUserProfile } from '../adapters/userDecisionAdapter.js'
import { PreferenceModifierEffect, cloneEvidence, createPreferenceModifier } from './preferenceModifiers.js'

const TARGETS = Object.freeze({ spaceSensitivity: 'M_SR09_SPACE_COST', aestheticWeight: 'M_SR10_FAVORITE_VALUE', moveLightnessPreference: 'M_SR04_LOW_USAGE_HIGH_BURDEN', longTermOwnershipPreference: ['M_SR07_LONG_TERM_FUTURE_USE', 'M_SR11_HIGH_FUTURE_REUSE'] })
const reasonFor = (key, value, rule, effect) => `${key}=${value}，因此对 ${rule} 这类证据${effect === 'AMPLIFY' ? '更加重视' : '较少重视'}。`

export function applyMovePreferenceWeighting({ evidence = [], userProfile = {} } = {}) {
  const profile = adaptUserProfile(userProfile)
  const modifiers = []
  const used = new Set()
  for (const item of evidence) for (const [profileKey, target] of Object.entries(TARGETS)) {
    const matches = Array.isArray(target) ? target.includes(item.ruleId) : target === item.ruleId
    if (!matches) continue
    used.add(profileKey)
    const profileValue = profile[profileKey]
    if (profileValue === 'MEDIUM') continue
    const effect = profileValue === 'HIGH' ? PreferenceModifierEffect.AMPLIFY : PreferenceModifierEffect.DAMPEN
    modifiers.push(createPreferenceModifier({ profileKey, profileValue, targetRuleId: item.ruleId, effect, reason: reasonFor(profileKey, profileValue, item.ruleId, effect) }))
  }
  return { evidence: cloneEvidence(evidence), modifiers, diagnostics: { unusedProfileDimensions: Object.keys(profile).filter((key) => !used.has(key)) } }
}
