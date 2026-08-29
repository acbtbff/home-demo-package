export const PHOTO_ROOM_DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'source', 'scaleAnchor', 'walls', 'doors', 'windows', 'uncertainties'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    source: { type: 'object', additionalProperties: false, required: ['type', 'provider', 'imageCount', 'confidence'], properties: { type: { type: 'string' }, provider: { type: 'string' }, imageCount: { type: ['integer', 'null'] }, confidence: { type: ['number', 'null'] } } },
    scaleAnchor: { type: 'object', additionalProperties: false, required: ['type', 'valueMeters'], properties: { type: { type: 'string', enum: ['roomWidth', 'roomDepth', 'doorWidth'] }, valueMeters: { type: 'number', exclusiveMinimum: 0 } } },
    walls: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'start', 'end', 'height', 'thickness', 'kind', 'confidence', 'estimated'], properties: { id: { type: 'string' }, start: { $ref: '#/$defs/point' }, end: { $ref: '#/$defs/point' }, height: { type: ['number', 'null'] }, thickness: { type: ['number', 'null'] }, kind: { type: ['string', 'null'] }, confidence: { type: 'number' }, estimated: { type: 'boolean' } } } },
    doors: { type: 'array', items: { $ref: '#/$defs/opening' } },
    windows: { type: 'array', items: { $ref: '#/$defs/opening' } },
    uncertainties: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 'message'], properties: { type: { type: 'string' }, message: { type: 'string' } } } },
  },
  $defs: {
    point: { type: 'object', additionalProperties: false, required: ['x', 'z'], properties: { x: { type: 'number' }, z: { type: 'number' } } },
    opening: { type: 'object', additionalProperties: false, required: ['id', 'wallId', 'center', 'width', 'height', 'sillHeight', 'confidence', 'estimated'], properties: { id: { type: 'string' }, wallId: { type: 'string' }, center: { $ref: '#/$defs/point' }, width: { type: 'number' }, height: { type: 'number' }, sillHeight: { type: 'number' }, confidence: { type: 'number' }, estimated: { type: 'boolean' } } },
  },
}

export const PHOTO_ROOM_VISION_SYSTEM_PROMPT = `You analyze 4-8 photos of the same room from different viewpoints. Return ONLY valid JSON matching the PhotoRoomDraft schema; never natural-language explanations. Cross-view reasoning is required. Identify room structure only: room shape, exterior walls, visible partition walls, wall geometry, doors, windows, generic architectural openings, scale anchor consistency, dimensions, confidence, and structural uncertainties. Ignore decor, appliances, loose objects, and movable items. Do not output object categories, positions, dimensions, rotations, duplicate flags, meshes, GLB, textures, visual resources, or movable-item evidence. Use the supplied scaleAnchor as the only absolute scale source. Preserve wall topology consistency and include uncertainties for occluded or inferred architectural structure.`
