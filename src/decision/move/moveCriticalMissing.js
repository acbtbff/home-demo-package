export function findMoveCriticalMissing(input) {
  const missing = []
  const physicalFitKnown = input?.newHomeContext?.physicalFit !== null
    && input?.newHomeContext?.physicalFit !== undefined
    && input.newHomeContext.physicalFit !== 'UNKNOWN'
  if (!physicalFitKnown) {
    for (const key of ['width', 'depth', 'height']) {
      if (input?.furniture?.dimensions?.[key] == null) missing.push({
        field: `furniture.dimensions.${key}`,
        label: `家具${key}尺寸`,
        reason: '缺少关键尺寸，无法确认该家具是否能够放置于新房',
      })
    }
  }
  return missing
}
