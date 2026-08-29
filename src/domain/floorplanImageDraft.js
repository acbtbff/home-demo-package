export const FLOORPLAN_IMAGE_DRAFT_VERSION = 1

const WALL_KINDS = new Set(['exterior', 'partition'])
const isFiniteNumber = (value) => Number.isFinite(value)
const isPositiveFinite = (value) => isFiniteNumber(value) && value > 0
const isPixelPoint = (point) => isFiniteNumber(point?.x) && isFiniteNumber(point?.y)
const isConfidence = (value) => value === null || (isFiniteNumber(value) && value >= 0 && value <= 1)

export function validateFloorplanImageDraft(draft) {
  const errors = []
  const addError = (path, message) => errors.push({ path, message })

  if (draft?.schemaVersion !== FLOORPLAN_IMAGE_DRAFT_VERSION) addError('schemaVersion', 'must equal 1')
  if (draft?.source?.type !== 'floorplan-image') addError('source.type', 'must equal floorplan-image')
  if (draft?.source?.provider !== null && typeof draft?.source?.provider !== 'string') addError('source.provider', 'must be a string or null')
  if (!isPositiveFinite(draft?.image?.widthPixels)) addError('image.widthPixels', 'must be greater than zero')
  if (!isPositiveFinite(draft?.image?.heightPixels)) addError('image.heightPixels', 'must be greater than zero')
  if (!isConfidence(draft?.source?.confidence)) addError('source.confidence', 'must be between 0 and 1 or null')
  if (!Array.isArray(draft?.walls) || draft.walls.length === 0) addError('walls', 'must contain at least one wall')
  if (!Array.isArray(draft?.doors)) addError('doors', 'must be an array')
  if (!Array.isArray(draft?.windows)) addError('windows', 'must be an array')

  const bounds = draft?.bounds
  if (![bounds?.minX, bounds?.minY, bounds?.maxX, bounds?.maxY].every(isFiniteNumber)) {
    addError('bounds', 'must contain finite minX, minY, maxX, and maxY')
  } else if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    addError('bounds', 'must have positive width and height')
  } else if (bounds.minX < 0 || bounds.minY < 0 || bounds.maxX > draft?.image?.widthPixels || bounds.maxY > draft?.image?.heightPixels) {
    addError('bounds', 'must fit within the image dimensions')
  }

  const pixelsPerMeter = draft?.scale?.pixelsPerMeter
  if (pixelsPerMeter !== null && !isPositiveFinite(pixelsPerMeter)) addError('scale.pixelsPerMeter', 'must be greater than zero or null')
  if (!isConfidence(draft?.scale?.confidence)) addError('scale.confidence', 'must be between 0 and 1 or null')

  if (!Array.isArray(draft?.walls)) return errors
  const wallIds = new Set()
  draft.walls.forEach((wall, index) => {
    const path = `walls[${index}]`
    if (!wall.id || wallIds.has(wall.id)) addError(`${path}.id`, 'must be present and unique')
    wallIds.add(wall.id)
    if (!WALL_KINDS.has(wall.kind)) addError(`${path}.kind`, 'must be exterior or partition')
    if (!isPixelPoint(wall.start)) addError(`${path}.start`, 'must contain finite pixel x and y')
    if (!isPixelPoint(wall.end)) addError(`${path}.end`, 'must contain finite pixel x and y')
    if (isPixelPoint(wall.start) && isPixelPoint(wall.end) && Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) <= 1e-6) {
      addError(path, 'start and end must not be equal')
    }
    if (wall.thicknessPixels !== null && !isPositiveFinite(wall.thicknessPixels)) addError(`${path}.thicknessPixels`, 'must be greater than zero or null')
    if (!isConfidence(wall.confidence)) addError(`${path}.confidence`, 'must be between 0 and 1 or null')
  })

  const openingIds = new Set()
  for (const [collectionName, openings] of [['doors', draft.doors], ['windows', draft.windows]]) {
    if (!Array.isArray(openings)) continue
    openings.forEach((opening, index) => {
      const path = `${collectionName}[${index}]`
      if (!opening.id || openingIds.has(opening.id)) addError(`${path}.id`, 'must be present and unique')
      openingIds.add(opening.id)
      if (!wallIds.has(opening.wallId)) addError(`${path}.wallId`, 'must reference an existing wall')
      if (!isPixelPoint(opening.center)) addError(`${path}.center`, 'must contain finite pixel x and y')
      if (!isPositiveFinite(opening.widthPixels)) addError(`${path}.widthPixels`, 'must be greater than zero')
      if (!isConfidence(opening.confidence)) addError(`${path}.confidence`, 'must be between 0 and 1 or null')
      if (opening.heightMeters !== null && !isPositiveFinite(opening.heightMeters)) addError(`${path}.heightMeters`, 'must be greater than zero or null')
      if (collectionName === 'windows' && opening.sillHeightMeters !== null && (!isFiniteNumber(opening.sillHeightMeters) || opening.sillHeightMeters < 0)) {
        addError(`${path}.sillHeightMeters`, 'must be non-negative or null')
      }
    })
  }

  if (!draft.walls.some((wall) => wall.kind === 'exterior')) addError('walls', 'must contain at least one exterior wall')

  return errors
}

export function assertValidFloorplanImageDraft(draft) {
  const errors = validateFloorplanImageDraft(draft)
  if (errors.length > 0) {
    throw new Error(`Invalid FloorplanImageDraft:\n${errors.map((error) => `${error.path}: ${error.message}`).join('\n')}`)
  }
  return draft
}
