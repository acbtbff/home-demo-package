const finite = (value) => Number.isFinite(Number(value))

export function validatePhotoRoomDraft(draft) {
  const errors = []
  if (draft?.schemaVersion !== 1) errors.push('schemaVersion must equal 1')
  if (!Array.isArray(draft?.walls)) errors.push('walls must be an array')
  if (draft?.scaleAnchor && (!finite(draft.scaleAnchor.valueMeters) || Number(draft.scaleAnchor.valueMeters) <= 0)) {
    errors.push('scaleAnchor.valueMeters must be positive')
  }
  for (const [index, wall] of (draft?.walls ?? []).entries()) {
    if (!wall.start || !wall.end || !finite(wall.start.x) || !finite(wall.start.z) || !finite(wall.end.x) || !finite(wall.end.z)) {
      errors.push(`walls[${index}] must have finite start/end points`)
    }
  }
  return errors
}

export function assertValidPhotoRoomDraft(draft) {
  const errors = validatePhotoRoomDraft(draft)
  if (errors.length) throw new Error(`Invalid PhotoRoomDraft:\n${errors.join('\n')}`)
  return draft
}
