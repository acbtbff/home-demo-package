import { createMoveDecisionInput } from '../move/moveInputSchema.js'
import { evaluateMoveEligibility } from '../move/moveEligibility.js'
import { adaptFurnitureToDecisionFurniture } from './furnitureDecisionAdapter.js'
import { adaptSpatialFacts } from './spatialDecisionAdapter.js'
import { adaptUserProfile } from './userDecisionAdapter.js'

export function buildMoveDecisionInput({ furniture, roomDocument, placement, spatialAnalysis, userContext = {}, userProfile = {}, logisticsContext = {}, overrides = {} } = {}) {
  const decisionFurniture = adaptFurnitureToDecisionFurniture(furniture)
  const eligibility = evaluateMoveEligibility(decisionFurniture)
  if (!eligibility.eligible) return { eligible: false, reason: eligibility.reason, input: null, diagnostics: null }

  const spatial = adaptSpatialFacts({ roomDocument, placement, spatialAnalysis, furnitureId: furniture?.id })
  const { diagnostics: spatialDiagnostics, ...newHomeContext } = spatial
  const input = createMoveDecisionInput({
    ...overrides,
    furniture: { ...decisionFurniture, ...(overrides.furniture ?? {}) },
    usageContext: { ...userContext, ...(overrides.usageContext ?? {}) },
    newHomeContext: { ...newHomeContext, ...(overrides.newHomeContext ?? {}) },
    logisticsContext: { ...logisticsContext, ...(overrides.logisticsContext ?? {}) },
    userProfile: adaptUserProfile(userProfile),
  })
  return { eligible: true, reason: null, input, diagnostics: { spatial: spatialDiagnostics } }
}
