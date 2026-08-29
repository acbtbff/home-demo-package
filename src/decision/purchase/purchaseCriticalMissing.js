function hasMissingDimension(input) {
  return ['width', 'depth', 'height'].some((key) => input?.furniture?.dimensions?.[key] == null)
}

function hasReliablePhysicalFit(input) {
  return input?.spaceContext?.physicalFit !== null
    && input?.spaceContext?.physicalFit !== undefined
    && input.spaceContext.physicalFit !== 'UNKNOWN'
}

/** Only missing facts that block a safe physical purchase judgment are returned. */
export function findPurchaseCriticalMissing(input) {
  const missing = []
  const nonReturnable = input?.furniture?.returnable === false || input?.reversibilityContext?.returnable === false
  if (hasMissingDimension(input) && !hasReliablePhysicalFit(input) && nonReturnable) {
    for (const key of ['width', 'depth', 'height']) {
      if (input?.furniture?.dimensions?.[key] == null) missing.push({
        field: `furniture.dimensions.${key}`,
        label: `家具${key}尺寸`,
        reason: '缺少准确尺寸，商品不可退且无法可靠确认空间适配',
      })
    }
  }
  return missing
}
