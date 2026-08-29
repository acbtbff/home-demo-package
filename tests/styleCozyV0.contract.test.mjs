import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { applyCozyMaterial } from '../src/styles/cozy/cozyMaterial.js'
import { getDefaultFurnitureColorVariant, getFurnitureColorVariants, resolveFurnitureColorVariant, supportsFurnitureColorVariants } from '../src/styles/cozy/colorVariants.js'
import { COZY_V0_PALETTE } from '../src/styles/cozy/cozyPalette.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { createGeometryProxyFromFurniture, createPlacement, WORLD_UNIT_METERS } from '../src/domain/spatialContracts.js'
import { calculateLibraryVisualCalibration } from '../src/domain/furnitureAssets.js'
import { createUpdateFurnitureColorVariantCommand } from '../src/domain/interactionCommands.js'
import { createFurnitureWorkspaceState, reduceFurnitureWorkspace } from '../src/state/useFurnitureWorkspace.js'

test('Cozy material pass changes visual materials without changing physical or placement contracts', () => {
  const furniture = createFurniture({ id: 'style-test', semantic: { category: 'TABLE', archetype: 'DESK' }, physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } } })
  const geometryProxy = createGeometryProxyFromFurniture(furniture)
  const placement = createPlacement({ furnitureId: furniture.id, position: { x: 0.85, y: 0, z: -1.45 }, rotationY: Math.PI / 2 })
  const beforeFurniture = structuredClone(furniture)
  const beforeProxy = structuredClone(geometryProxy)
  const beforePlacement = structuredClone(placement)
  const root = new THREE.Group()
  root.position.set(1, 2, 3); root.rotation.y = placement.rotationY
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.2 }))
  root.add(mesh)
  applyCozyMaterial(root)
  assert.deepEqual(furniture, beforeFurniture)
  assert.deepEqual(geometryProxy, beforeProxy)
  assert.deepEqual(placement, beforePlacement)
  assert.deepEqual(root.position.toArray(), [1, 2, 3])
  assert.equal(root.rotation.y, placement.rotationY)
  assert.equal(mesh.material.isMaterial, true)
  assert.equal(Array.isArray(mesh.material), false)
  assert.ok(mesh.material.roughness >= 0.82)
  assert.ok(mesh.material.metalness <= 0.05)
})

test('Cozy material pass preserves material arrays and library calibration/world scale', () => {
  const root = new THREE.Group()
  const materials = [new THREE.MeshStandardMaterial({ color: COZY_V0_PALETTE.SAGE }), new THREE.MeshStandardMaterial({ color: COZY_V0_PALETTE.LIGHT_WOOD })]
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials)
  root.add(mesh)
  applyCozyMaterial(root)
  assert.equal(Array.isArray(mesh.material), true)
  assert.equal(mesh.material.length, 2)
  assert.deepEqual(calculateLibraryVisualCalibration({ assetDimensionsM: { width: 1, depth: 1, height: 1 }, targetDimensionsM: { width: 1, depth: 1, height: 1 } }).scale, [1, 1, 1])
  assert.equal(WORLD_UNIT_METERS, 1)
})

test('Color variants resolve defaults and unknown ids safely', () => {
  assert.equal(getDefaultFurnitureColorVariant('DESK').id, 'natural-oak')
  assert.equal(resolveFurnitureColorVariant('DESK', 'sage').id, 'sage')
  assert.equal(resolveFurnitureColorVariant('DESK', 'missing'), null)
  assert.equal(getFurnitureColorVariants('TWO_SEAT_SOFA').length, 0)
  assert.equal(supportsFurnitureColorVariants('TWO_SEAT_SOFA'), false)
})

test('Color variant command changes appearance only and preserves dimensions', () => {
  const state = createFurnitureWorkspaceState()
  const furnitureId = Object.keys(state.furnitureById)[0]
  const selectedState = { ...state, selectedFurnitureId: furnitureId }
  const before = structuredClone(selectedState.furnitureById[furnitureId])
  const next = reduceFurnitureWorkspace(selectedState, createUpdateFurnitureColorVariantCommand({ furnitureId, colorVariantId: 'sage' }))
  assert.equal(next.furnitureById[furnitureId].appearance.colorVariantId, 'sage')
  assert.deepEqual(next.furnitureById[furnitureId].physical.dimensionsM, before.physical.dimensionsM)
  assert.deepEqual(next.furnitureById[furnitureId].semantic, before.semantic)
  const unknown = reduceFurnitureWorkspace(next, createUpdateFurnitureColorVariantCommand({ furnitureId, colorVariantId: 'unknown' }))
  assert.equal(unknown.furnitureById[furnitureId].appearance.colorVariantId, 'unknown')
})

test('Color variant material tint clones shared materials per instance', () => {
  const sourceMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' })
  const first = new THREE.Group(); first.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial))
  const second = new THREE.Group(); second.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial))
  applyCozyMaterial(first, { tintColor: COZY_V0_PALETTE.SAGE })
  applyCozyMaterial(second, { tintColor: COZY_V0_PALETTE.DUSTY_BLUE })
  assert.notEqual(first.children[0].material, second.children[0].material)
  assert.notEqual(first.children[0].material.color.getHex(), second.children[0].material.color.getHex())
  assert.equal(sourceMaterial.color.getHexString(), 'ffffff')
})
