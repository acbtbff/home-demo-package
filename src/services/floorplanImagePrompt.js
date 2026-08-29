export const FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT = `You extract architectural geometry from one 2D floor-plan image.
Return geometry in image pixel coordinates with origin at the top-left: x grows right and y grows down.
Trace exterior walls and interior partitions as center-line segments. Bind each visible door and window to the closest wall.
Do not include furniture, labels, or decorative strokes as walls. Do not invent metric scale: set pixelsPerMeter and scale confidence to null unless an unambiguous printed measurement establishes it.
Use conservative confidence scores. The user will calibrate the metric scale before the result becomes a RoomDocument.`

const nullableNumber = { type: ['number', 'null'] }

export const FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'source', 'image', 'bounds', 'scale', 'walls', 'doors', 'windows'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    source: {
      type: 'object', additionalProperties: false,
      required: ['type', 'provider', 'confidence'],
      properties: {
        type: { type: 'string', const: 'floorplan-image' },
        provider: { type: ['string', 'null'] },
        confidence: nullableNumber,
      },
    },
    image: {
      type: 'object', additionalProperties: false,
      required: ['widthPixels', 'heightPixels'],
      properties: { widthPixels: { type: 'number' }, heightPixels: { type: 'number' } },
    },
    bounds: {
      type: 'object', additionalProperties: false,
      required: ['minX', 'minY', 'maxX', 'maxY'],
      properties: { minX: { type: 'number' }, minY: { type: 'number' }, maxX: { type: 'number' }, maxY: { type: 'number' } },
    },
    scale: {
      type: 'object', additionalProperties: false,
      required: ['pixelsPerMeter', 'confidence'],
      properties: { pixelsPerMeter: nullableNumber, confidence: nullableNumber },
    },
    walls: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'kind', 'start', 'end', 'thicknessPixels', 'confidence'],
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['exterior', 'partition'] },
          start: { type: 'object', additionalProperties: false, required: ['x', 'y'], properties: { x: { type: 'number' }, y: { type: 'number' } } },
          end: { type: 'object', additionalProperties: false, required: ['x', 'y'], properties: { x: { type: 'number' }, y: { type: 'number' } } },
          thicknessPixels: nullableNumber,
          confidence: nullableNumber,
        },
      },
    },
    doors: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'wallId', 'center', 'widthPixels', 'heightMeters', 'confidence'],
        properties: {
          id: { type: 'string' }, wallId: { type: 'string' },
          center: { type: 'object', additionalProperties: false, required: ['x', 'y'], properties: { x: { type: 'number' }, y: { type: 'number' } } },
          widthPixels: { type: 'number' }, heightMeters: nullableNumber, confidence: nullableNumber,
        },
      },
    },
    windows: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'wallId', 'center', 'widthPixels', 'heightMeters', 'sillHeightMeters', 'confidence'],
        properties: {
          id: { type: 'string' }, wallId: { type: 'string' },
          center: { type: 'object', additionalProperties: false, required: ['x', 'y'], properties: { x: { type: 'number' }, y: { type: 'number' } } },
          widthPixels: { type: 'number' }, heightMeters: nullableNumber, sillHeightMeters: nullableNumber, confidence: nullableNumber,
        },
      },
    },
  },
}
