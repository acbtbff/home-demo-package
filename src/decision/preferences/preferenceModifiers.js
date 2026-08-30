export const PreferenceModifierEffect = Object.freeze({ AMPLIFY: 'AMPLIFY', NEUTRAL: 'NEUTRAL', DAMPEN: 'DAMPEN' })

export function createPreferenceModifier({ profileKey, profileValue, targetRuleId, effect, reason }) {
  if (!profileKey || !targetRuleId || !['HIGH', 'MEDIUM', 'LOW'].includes(profileValue)) throw new TypeError('Invalid preference modifier identity')
  if (!Object.values(PreferenceModifierEffect).includes(effect)) throw new TypeError('Invalid preference modifier effect')
  if (typeof reason !== 'string' || reason.length === 0) throw new TypeError('Preference modifier requires a reason')
  return Object.freeze({ profileKey, profileValue, targetRuleId, effect, reason })
}

export function cloneEvidence(evidence = []) {
  return evidence.map((item) => ({ ...item, evidencePaths: [...(item.evidencePaths ?? [])] }))
}
