import test from 'node:test'
import assert from 'node:assert/strict'
import { createFurniture, assertValidOwnershipLifecycle } from '../src/domain/furnitureSchema.js'
import { routeFurnitureModelStrategy } from '../src/domain/furnitureRouter.js'
import { resolveFurnitureModel } from '../src/domain/furnitureModelResolver.js'
import { createGeometryProxyFromFurniture } from '../src/domain/spatialContracts.js'
import { reduceFurnitureWorkspace, createFurnitureWorkspaceState } from '../src/state/useFurnitureWorkspace.js'
import { createCreateFurnitureCommand, createPurchaseFurnitureCommand } from '../src/domain/interactionCommands.js'

test('presentation port leaves domain semantics and registry-backed routing intact', () => {
  const wishlist = createFurniture({
    id: 'ui-port-wishlist',
    semantic: { category: 'TABLE', archetype: 'DESK' },
    ownership: { type: 'NONE' },
    lifecycle: { status: 'WISHLIST' },
    physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } },
  })
  assertValidOwnershipLifecycle(wishlist)
  assert.equal(wishlist.ownership.type, 'NONE')
  assert.equal(wishlist.lifecycle.status, 'WISHLIST')
  assert.equal(routeFurnitureModelStrategy(wishlist.semantic), 'PARAMETRIC')
  assert.equal(resolveFurnitureModel(wishlist).status, 'AVAILABLE')
  assert.deepEqual(createGeometryProxyFromFurniture(wishlist).dimensionsM, wishlist.physical.dimensionsM)
})

test('wishlist purchase transition and intake command remain available', () => {
  const state = createFurnitureWorkspaceState()
  const created = reduceFurnitureWorkspace(state, createCreateFurnitureCommand({
    id: 'ui-port-intake',
    name: '宜家白色茶几',
    category: 'TABLE',
    archetype: 'COFFEE_TABLE',
    ownershipKey: 'WISHLIST',
    dimensionsCm: { width: 100, depth: 50, height: 40 },
  }))
  assert.ok(created.furnitureById['ui-port-intake'])
  const purchased = reduceFurnitureWorkspace(created, createPurchaseFurnitureCommand('ui-port-intake'))
  assert.equal(purchased.furnitureById['ui-port-intake'].ownership.type, 'USER')
  assert.equal(purchased.furnitureById['ui-port-intake'].lifecycle.status, 'OWNED')
})
