import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DEMO_DESK_FURNITURE,
  DEMO_OFFICE_CHAIR_FURNITURE,
  DEMO_TWO_SEAT_SOFA_FURNITURE,
  DEMO_WISHLIST_CHAIR_FURNITURE,
  DEMO_WISHLIST_CHAIR_PLACEMENT,
} from '../src/data/demoFurniture.js'
import { MOVE_DEMO_PRESET, PURCHASE_DEMO_PRESET, PURCHASE_DEMO_PROFILE } from '../src/data/decisionDemoPresets.js'
import { buildMoveDecisionInput } from '../src/decision/adapters/moveDecisionAdapter.js'
import { evaluateMoveHardRules } from '../src/decision/move/moveHardRules.js'
import { collectMoveEvidence } from '../src/decision/move/collectMoveEvidence.js'
import { applyMovePreferenceWeighting } from '../src/decision/preferences/movePreferenceWeighting.js'
import { resolveMoveDecision } from '../src/decision/resolver/moveDecisionResolver.js'
import { isPurchaseDecisionCandidate, preparePurchaseDecision } from '../src/decision/purchase/runPurchaseDecision.js'
import { createFurnitureWorkspaceState } from '../src/state/useFurnitureWorkspace.js'

const movePathFor = (furniture, preset = MOVE_DEMO_PRESET) => {
  const adapted = buildMoveDecisionInput({
    furniture,
    userContext: {
      usageFrequency: preset.usageFrequency,
      expectedFutureUse: preset.expectedFutureUse,
      substituteAvailable: preset.substituteAvailable === 'YES',
      substituteAdequacy: preset.substituteAdequacy,
    },
    logisticsContext: { sizeClass: 'MEDIUM', handlingBurden: preset.handlingBurden, movingBurdenLevel: preset.handlingBurden, source: 'ESTIMATED' },
    overrides: { furniture: { sentimentalAttachment: preset.sentimentalAttachment ? true : null }, newHomeContext: { physicalFit: preset.physicalFit } },
  })
  if (!adapted.eligible) return { eligible: false }
  const hard = evaluateMoveHardRules(adapted.input)
  const collected = collectMoveEvidence(adapted.input)
  const weighted = applyMovePreferenceWeighting({ evidence: collected.evidence, userProfile: adapted.input.userProfile })
  return { eligible: true, resolver: resolveMoveDecision({ hardRuleResult: hard, evidence: weighted.evidence, modifiers: weighted.modifiers }) }
}

test('demo fixtures use formal ownership and lifecycle scope', () => {
  assert.equal(DEMO_DESK_FURNITURE.name, '原木书桌')
  assert.equal(DEMO_DESK_FURNITURE.ownership.type, 'USER')
  assert.equal(DEMO_DESK_FURNITURE.lifecycle.status, 'OWNED')
  assert.equal(movePathFor(DEMO_DESK_FURNITURE).eligible, true)
  assert.equal(DEMO_OFFICE_CHAIR_FURNITURE.ownership.type, 'USER')
  assert.equal(movePathFor(DEMO_OFFICE_CHAIR_FURNITURE).eligible, true)
  assert.equal(DEMO_TWO_SEAT_SOFA_FURNITURE.ownership.type, 'LANDLORD')
  assert.equal(movePathFor(DEMO_TWO_SEAT_SOFA_FURNITURE).eligible, false)
  assert.equal(DEMO_WISHLIST_CHAIR_FURNITURE.ownership.type, 'NONE')
  assert.equal(DEMO_WISHLIST_CHAIR_FURNITURE.lifecycle.status, 'WISHLIST')
  assert.equal(DEMO_WISHLIST_CHAIR_FURNITURE.product.price, 899)
  assert.equal(isPurchaseDecisionCandidate(DEMO_WISHLIST_CHAIR_FURNITURE), true)
  assert.equal(movePathFor(DEMO_WISHLIST_CHAIR_FURNITURE).eligible, false)
})

test('initial workspace contains decision-ready owned and wishlist furniture', () => {
  const state = createFurnitureWorkspaceState()
  for (const item of [DEMO_DESK_FURNITURE, DEMO_OFFICE_CHAIR_FURNITURE, DEMO_TWO_SEAT_SOFA_FURNITURE, DEMO_WISHLIST_CHAIR_FURNITURE]) assert.ok(state.furnitureById[item.id])
  assert.deepEqual(state.previewPlacementsById[DEMO_WISHLIST_CHAIR_PLACEMENT.id], DEMO_WISHLIST_CHAIR_PLACEMENT)
})

test('Move demo preset reaches NEEDS_AGENT through formal rules', () => {
  const path = movePathFor(DEMO_DESK_FURNITURE)
  assert.equal(path.eligible, true)
  assert.equal(path.resolver.resolutionStatus, 'NEEDS_AGENT')
  assert.equal(path.resolver.needsAgentReasoning, true)
})

test('Purchase demo preset reaches NEEDS_AGENT through formal rules', () => {
  const prepared = preparePurchaseDecision({
    furniture: DEMO_WISHLIST_CHAIR_FURNITURE,
    placement: DEMO_WISHLIST_CHAIR_PLACEMENT,
    productFacts: { priceCny: 899, returnable: true, trialAvailable: true },
    userSituation: {
      needStrength: PURCHASE_DEMO_PRESET.needStrength,
      usageFrequency: PURCHASE_DEMO_PRESET.usageFrequency,
      substituteAvailable: true,
      substituteAdequacy: PURCHASE_DEMO_PRESET.substituteAdequacy,
      frictionFrequency: PURCHASE_DEMO_PRESET.frictionFrequency,
      frictionSeverity: PURCHASE_DEMO_PRESET.frictionSeverity,
    },
    userProfile: PURCHASE_DEMO_PROFILE,
    overrides: {
      economicsContext: { availableFurnitureBudgetCny: Number(PURCHASE_DEMO_PRESET.budget) },
      lifecycleContext: { expectedStayMonths: Number(PURCHASE_DEMO_PRESET.stayMonths), moveCertainty: PURCHASE_DEMO_PRESET.moveCertainty, futureReuseProbability: PURCHASE_DEMO_PRESET.futureReuseProbability },
      spaceContext: { physicalFit: PURCHASE_DEMO_PRESET.physicalFit },
    },
  })
  assert.equal(prepared.status, 'NEEDS_AGENT')
  assert.equal(prepared.resolverResult.needsAgentReasoning, true)
})

test('demo presets only prefill facts and never hardcode results', async () => {
  const source = await readFile(new URL('../src/data/decisionDemoPresets.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /agentOutput|resolverResult|resolutionStatus|\bdecision\s*:|\bresult\s*:/)
  assert.doesNotMatch(source, /\b(TAKE|SELL|DISCARD|BUY|DONT_BUY|WAIT)\b/)
})

test('Move Decision UI is scoped to user-owned furniture', async () => {
  const source = await readFile(new URL('../src/components/furniture/FurnitureInspector.jsx', import.meta.url), 'utf8')
  assert.match(source, /ownership\?\.type === 'USER'.*lifecycle\?\.status === 'OWNED'.*<DecisionCard/s)
})
