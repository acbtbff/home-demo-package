import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatFurnitureDimensions,
  getFurnitureName,
  getFurnitureRelationLabel,
  getFurnitureTypeLabel,
  getRepresentationStatusLabel,
  getSpatialStatusLabel,
} from '../src/presentation/furnitureLabels.js'

const furniture = (ownership, lifecycle, archetype = 'DESK', name = null) => ({
  name,
  semantic: { archetype },
  ownership: { type: ownership },
  lifecycle: { status: lifecycle },
  physical: { dimensionsM: { width: 1.2, depth: 0.6, height: 0.75 } },
})

test('ownership and lifecycle combinations use safe user language', () => {
  assert.equal(getFurnitureRelationLabel(furniture('USER', 'OWNED')), '我的家具')
  assert.equal(getFurnitureRelationLabel(furniture('PERSONAL', 'OWNED')), '我的家具')
  assert.equal(getFurnitureRelationLabel(furniture('LANDLORD', 'OWNED')), '房东家具')
  assert.equal(getFurnitureRelationLabel(furniture('NONE', 'WISHLIST')), '想购买')
  assert.notEqual(getFurnitureRelationLabel(furniture('NONE', 'OWNED')), '想购买')
  assert.equal(getFurnitureRelationLabel(furniture(null, null)), '我的家具')
})

test('type, representation and spatial labels are mapped', () => {
  assert.equal(getFurnitureTypeLabel(furniture('USER', 'OWNED', 'DESK')), '书桌')
  assert.equal(getFurnitureTypeLabel(furniture('USER', 'OWNED', 'OFFICE_CHAIR')), '办公椅')
  assert.equal(getFurnitureTypeLabel(furniture('USER', 'OWNED', 'TWO_SEAT_SOFA')), '双人沙发')
  assert.equal(getFurnitureTypeLabel(furniture('USER', 'OWNED', 'LADDER_SPECIAL')), '梯架')
  assert.equal(getRepresentationStatusLabel({ representation: { status: 'PENDING_GENERATION' } }), '3D 模型待生成')
  assert.equal(getSpatialStatusLabel({}), '✓ 摆放正常')
  assert.equal(getSpatialStatusLabel({ collisionDetected: true }), '与其他家具重叠')
  assert.equal(getSpatialStatusLabel({ outOfBounds: true }), '超出房间范围')
})

test('engineering demo names are normalized but user names are preserved', () => {
  assert.equal(getFurnitureName(furniture('USER', 'OWNED', 'DESK', 'Demo Desk 1')), '书桌')
  assert.equal(getFurnitureName(furniture('USER', 'OWNED', 'DESK', '原木书桌')), '原木书桌')
  assert.equal(formatFurnitureDimensions(furniture('USER', 'OWNED')), '120 × 60 × 75 cm')
})
