import { adaptUserProfile } from '../adapters/userDecisionAdapter.js'
import { PreferenceModifierEffect, cloneEvidence, createPreferenceModifier } from './preferenceModifiers.js'

const TARGETS = Object.freeze({ frictionSensitivity: 'P_SR04_REPEATED_FRICTION', spaceSensitivity: 'P_SR05_SPACE_COST', aestheticWeight: 'P_SR08_FAVORITE_VALUE', budgetCaution: 'P_SR06_BUDGET_PRESSURE', multifunctionPreference: 'P_SR03_ADEQUATE_SUBSTITUTE', immediacyPreference: 'P_SR09_HIGH_UNCERTAINTY', uncertaintyTolerance: 'P_SR09_HIGH_UNCERTAINTY' })
const reasonFor = (key, value, rule, effect) => `${key}=${value}，因此对 ${rule} 这类证据${effect === 'AMPLIFY' ? '更加重视' : '较少重视'}。`

function effectFor(profileValue, signal, profileKey) {
  if (profileValue === 'MEDIUM') return PreferenceModifierEffect.NEUTRAL
  if (signal === 'SUPPORTS_WAIT') return profileKey === 'immediacyPreference' && profileValue === 'HIGH' ? PreferenceModifierEffect.DAMPEN : profileKey === 'uncertaintyTolerance' && profileValue === 'LOW' ? PreferenceModifierEffect.AMPLIFY : profileValue === 'HIGH' ? PreferenceModifierEffect.DAMPEN : PreferenceModifierEffect.AMPLIFY
  return profileValue === 'HIGH' ? PreferenceModifierEffect.AMPLIFY : PreferenceModifierEffect.DAMPEN
}

export function applyPurchasePreferenceWeighting({ evidence = [], userProfile = {} } = {}) {
  const profile = adaptUserProfile(userProfile)
  const modifiers = []
  const used = new Set()
  for (const item of evidence) for (const [profileKey, targetRuleId] of Object.entries(TARGETS)) if (item.ruleId === targetRuleId) {
    used.add(profileKey)
    const profileValue = profile[profileKey]
    const effect = effectFor(profileValue, item.signal, profileKey)
    if (effect !== PreferenceModifierEffect.NEUTRAL) modifiers.push(createPreferenceModifier({ profileKey, profileValue, targetRuleId, effect, reason: reasonFor(profileKey, profileValue, targetRuleId, effect) }))
  }
  return { evidence: cloneEvidence(evidence), modifiers, diagnostics: { unusedProfileDimensions: Object.keys(profile).filter((key) => !used.has(key)) } }
}
