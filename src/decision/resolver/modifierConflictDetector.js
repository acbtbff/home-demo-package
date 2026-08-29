export function detectModifierConflicts(modifiers = []) {
  const byRule = new Map()
  for (const modifier of modifiers) {
    if (!byRule.has(modifier.targetRuleId)) byRule.set(modifier.targetRuleId, [])
    byRule.get(modifier.targetRuleId).push(modifier)
  }
  const conflicts = []
  for (const [targetRuleId, entries] of byRule.entries()) {
    const effects = entries.filter(({ effect }) => effect === 'AMPLIFY' || effect === 'DAMPEN')
    if (new Set(effects.map(({ effect }) => effect)).size > 1) {
      conflicts.push({ targetRuleId, effects: effects.map(({ profileKey, effect }) => ({ profileKey, effect })) })
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts }
}
