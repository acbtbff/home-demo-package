import { createPurchaseDecisionInput } from '../purchase/purchaseInputSchema.js'
import { adaptFurnitureToDecisionFurniture } from './furnitureDecisionAdapter.js'
import { adaptSpatialFacts } from './spatialDecisionAdapter.js'
import { adaptUserProfile } from './userDecisionAdapter.js'

const DUPLICATED_PRODUCT_FIELDS = ['returnable', 'trialAvailable', 'returnWindowDays', 'returnCostCny']
const valuesConflict = (left, right) => left !== null && left !== undefined && right !== null && right !== undefined && left !== right

function buildCanonicalProductFacts(productFacts = {}, furnitureOverrides = {}, reversibilityOverrides = {}) {
  const canonical = { ...productFacts, ...furnitureOverrides }
  const conflicts = []
  for (const field of DUPLICATED_PRODUCT_FIELDS) {
    if (valuesConflict(productFacts[field], furnitureOverrides[field])) conflicts.push({ field, product: productFacts[field], furniture: furnitureOverrides[field] })
    if (valuesConflict(productFacts[field], reversibilityOverrides[field])) conflicts.push({ field, product: productFacts[field], reversibility: reversibilityOverrides[field] })
    if (valuesConflict(furnitureOverrides[field], reversibilityOverrides[field])) conflicts.push({ field, furniture: furnitureOverrides[field], reversibility: reversibilityOverrides[field] })
    if (canonical[field] === undefined && reversibilityOverrides[field] !== undefined) canonical[field] = reversibilityOverrides[field]
  }
  return { canonical, conflicts }
}

export function buildPurchaseDecisionInput({ furniture, roomDocument, placement, spatialAnalysis, userSituation = {}, userProfile = {}, productFacts = {}, overrides = {} } = {}) {
  const sourceFurniture = adaptFurnitureToDecisionFurniture(furniture)
  const { canonical, conflicts } = buildCanonicalProductFacts(productFacts, overrides.furniture ?? {}, overrides.reversibilityContext ?? {})
  const spatial = adaptSpatialFacts({ roomDocument, placement, spatialAnalysis, furnitureId: furniture?.id })
  const { diagnostics: spatialDiagnostics, ...spaceContext } = spatial
  const input = createPurchaseDecisionInput({
    ...overrides,
    furniture: { ...sourceFurniture, ...canonical },
    spaceContext: { ...spaceContext, ...(overrides.spaceContext ?? {}) },
    needContext: { ...userSituation, ...(overrides.needContext ?? {}) },
    userProfile: adaptUserProfile(userProfile),
  })
  return { input, diagnostics: { productFactConflicts: conflicts, spatial: spatialDiagnostics } }
}
