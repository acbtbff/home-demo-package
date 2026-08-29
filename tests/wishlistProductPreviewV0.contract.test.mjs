import test from 'node:test'
import assert from 'node:assert/strict'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { reduceFurnitureWorkspace, createFurnitureWorkspaceState } from '../src/state/useFurnitureWorkspace.js'
import { createCreateFurnitureCommand, createCreatePlacementCommand, createPurchaseFurnitureCommand, createUpdateFurnitureInfoCommand } from '../src/domain/interactionCommands.js'
import { createGeometryProxyFromFurniture } from '../src/domain/spatialContracts.js'
import { routeFurnitureModelStrategy } from '../src/domain/furnitureRouter.js'

const wishlist = () => createFurniture({ id: 'wish-1', name: '原木书桌', semantic: { archetype: 'DESK' }, physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } }, ownership: { type: 'NONE' }, lifecycle: { status: 'WISHLIST' }, product: { price: 899, url: 'https://example.test/item' }, modelStrategy: { resolved: routeFurnitureModelStrategy({ archetype: 'DESK' }) } })

test('wishlist visual state is semantic and does not alter physical or proxy dimensions', () => {
  const item = wishlist()
  assert.equal(item.lifecycle.status, 'WISHLIST')
  assert.deepEqual(createGeometryProxyFromFurniture(item).dimensionsM, item.physical.dimensionsM)
  assert.deepEqual(item.physical.dimensionsM, { width: 1.2, depth: 0.6, height: 0.75 })
  assert.equal(item.product.price, 899)
  assert.equal(item.product.url, 'https://example.test/item')
})

test('wishlist purchase preserves id and placement while changing formal ownership lifecycle', () => {
  const state = createFurnitureWorkspaceState()
  const withFurniture = reduceFurnitureWorkspace(state, createCreateFurnitureCommand({ id: 'wish-1', name: '原木书桌', archetype: 'DESK', dimensionsCm: { width: 120, depth: 60, height: 75 }, ownershipKey: 'WISHLIST', product: { price: 899, url: 'https://example.test' } }))
  const withPlacement = reduceFurnitureWorkspace(withFurniture, createCreatePlacementCommand('wish-1'), { room: { id: 'room-01' }, walls: [] })
  const purchased = reduceFurnitureWorkspace(withPlacement, createPurchaseFurnitureCommand('wish-1'))
  assert.equal(purchased.furnitureById['wish-1'].ownership.type, 'USER')
  assert.equal(purchased.furnitureById['wish-1'].lifecycle.status, 'OWNED')
  assert.deepEqual(purchased.placementsById, withPlacement.placementsById)
})

test('editing dimensions and product metadata updates the same furniture object', () => {
  const state = createFurnitureWorkspaceState()
  const created = reduceFurnitureWorkspace(state, createCreateFurnitureCommand({ id: 'edit-1', archetype: 'OFFICE_CHAIR', dimensionsCm: { width: 62, depth: 62, height: 92 }, ownershipKey: 'WISHLIST', product: { price: 500 } }))
  const updated = reduceFurnitureWorkspace(created, createUpdateFurnitureInfoCommand({ furnitureId: 'edit-1', patch: { name: '新椅子', dimensionsM: { width: 0.7, depth: 0.65, height: 0.95 }, product: { price: 680, url: 'https://example.test/chair' } } }))
  assert.equal(updated.furnitureById['edit-1'].name, '新椅子')
  assert.deepEqual(updated.furnitureById['edit-1'].physical.dimensionsM, { width: 0.7, depth: 0.65, height: 0.95 })
  assert.equal(updated.furnitureById['edit-1'].product.price, 680)
  assert.equal(updated.furnitureById['edit-1'].modelStrategy.resolved, 'LIBRARY')
})
