const TYPE_LABELS = Object.freeze({
  DESK: '书桌', DINING_TABLE: '餐桌', COFFEE_TABLE: '茶几', ROUND_COFFEE_TABLE: '圆茶几',
  OFFICE_CHAIR: '办公椅', DINING_CHAIR: '餐椅', STOOL: '凳子', SINGLE_BED: '单人床', DOUBLE_BED: '双人床',
  TWO_SEAT_SOFA: '双人沙发', THREE_SEAT_SOFA: '三人沙发', WARDROBE: '衣柜', BOOKSHELF: '书架', CABINET: '收纳柜',
  NIGHTSTAND: '床头柜', DESK_PEDESTAL: '书桌柜', CHEST_OF_DRAWERS: '斗柜', OPEN_BOOKSHELF: '开放式书架', GARMENT_RACK: '衣帽架',
  REFRIGERATOR: '冰箱', WASHING_MACHINE: '洗衣机', FLOOR_LAMP: '落地灯', DESK_LAMP: '台灯', TABLE_LAMP: '桌灯', AREA_RUG: '地毯',
  // Current taxonomy describes this as a ladder/rack-like special item; keep the copy neutral.
  LADDER_SPECIAL: '梯架', OTHER: '家具',
})

const normalizeToken = (value) => String(value ?? '')
  .trim().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '').toUpperCase()

function getArchetype(furniture) {
  return normalizeToken(furniture?.semantic?.archetype ?? furniture?.archetype)
}

export function getFurnitureTypeLabel(furniture) {
  return TYPE_LABELS[getArchetype(furniture)] ?? '家具'
}

export function getFurnitureName(furniture, fallback = '家具') {
  const rawName = String(furniture?.name ?? '').trim()
  const engineeringName = /^(?:demo\s+)?(?:desk|two\s+seat\s+sofa|office\s+chair|floor\s+lamp)(?:\s+\d+)?$/i.test(rawName)
    || /^catalog[-_]/i.test(rawName)
  return !rawName || engineeringName ? (getFurnitureTypeLabel(furniture) || fallback) : rawName
}

export function getFurnitureRelationLabel(furniture, { isCatalog = false } = {}) {
  if (isCatalog) return '想购买'
  const ownership = normalizeToken(
    furniture?.ownership?.type
      ?? (typeof furniture?.ownership === 'string' ? furniture.ownership : null)
      ?? furniture?.relation
      ?? furniture?.ownerType,
  )
  const lifecycle = normalizeToken(furniture?.lifecycle?.status)
  if ((ownership === 'USER' || ownership === 'PERSONAL') && (lifecycle === 'OWNED' || !lifecycle)) return '我的家具'
  if (ownership === 'LANDLORD' && (lifecycle === 'OWNED' || !lifecycle)) return '房东家具'
  if (ownership === 'NONE' && lifecycle === 'WISHLIST') return '想购买'
  // Legacy owned-only records remain readable; NONE alone is deliberately not wishlist.
  if (lifecycle === 'OWNED' && !ownership) return '我的家具'
  if (!ownership && !lifecycle) return '我的家具'
  return '归属待确认'
}

export function getRepresentationStatusLabel(furniture, { assetAvailable = true } = {}) {
  const strategy = normalizeToken(furniture?.modelStrategy?.resolved ?? furniture?.modelStrategy)
  const status = normalizeToken(furniture?.representation?.status)
  if ((strategy === 'GENERATED' || status === 'PENDING_GENERATION') && !assetAvailable) return '3D 模型待生成'
  if (status === 'PENDING_GENERATION') return '3D 模型待生成'
  return null
}

export function getSpatialStatusLabel(spatialFacts) {
  if (!spatialFacts) return null
  if (spatialFacts.outOfBounds) return '超出房间范围'
  if (spatialFacts.furnitureCollision || spatialFacts.collisionDetected) return '与其他家具重叠'
  if (spatialFacts.exteriorWallCollision) return '靠近墙面，请调整位置'
  return '✓ 摆放正常'
}

export function getFurnitureActionLabel(action) {
  return { edit: '编辑信息', adjust: '调整摆放', add: '放入小屋', removePlacement: '移出小屋', removeFurniture: '删除家具' }[action] ?? action
}

export function formatFurnitureDimensions(furniture) {
  const dimensions = furniture?.physical?.dimensionsM ?? furniture?.defaultDimensionsM
  if (!dimensions || [dimensions.width, dimensions.depth, dimensions.height].some((value) => !Number.isFinite(Number(value)))) return '尺寸待补充'
  return `${Math.round(dimensions.width * 100)} × ${Math.round(dimensions.depth * 100)} × ${Math.round(dimensions.height * 100)} cm`
}

export { TYPE_LABELS }
