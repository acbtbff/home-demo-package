import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { applyCozyMaterial } from '../src/styles/cozy/cozyMaterial.js'
import { COZY_V0_PALETTE } from '../src/styles/cozy/cozyPalette.js'
import { createFurniture } from '../src/domain/furnitureSchema.js'
import { createGeometryProxyFromFurniture, createPlacement, WORLD_UNIT_METERS } from '../src/domain/spatialContracts.js'
import { calculateLibraryVisualCalibration } from '../src/domain/furnitureAssets.js'

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
