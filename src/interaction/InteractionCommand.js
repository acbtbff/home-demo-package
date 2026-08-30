import { INTERACTION_COMMANDS, V0_SUPPORTED_COMMANDS, isSupportedCommand } from './InteractionCommandTypes.js';

// ============================================================================
// InteractionCommand
//
// Three.js-free data contract crossing the INTEGRATION BOUNDARY.
//
// V0 shape:
//   {
//     type:          'MOVE_SELECTED',
//     delta:         { x, y } | undefined,   // MOVE_SELECTED only
//     deltaRotation: number | undefined,     // ROTATE_SELECTED only (radians)
//     deltaOrbit:    number | undefined,     // CAMERA_ORBIT only (radians)
//     screenPoint:   { x, y } | undefined,   // SELECT_FURNITURE only
//     (DESELECT_FURNITURE has no extra payload fields)
//     timestamp:     number,
//     id:            number,
//     origin:        'gesture-module'
//   }
//
// The Gesture module NEVER emits camera position, world coordinates,
// furniture ids, or Three.js types.
// ============================================================================

let sequence = 0;

function now() {
  return typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number'
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

export function createInteractionCommand(type, options = {}) {
  if (!isSupportedCommand(type)) {
    throw new Error(
      `InteractionCommand type "${type}" is not supported in V0. ` +
        `Supported: ${V0_SUPPORTED_COMMANDS.join(', ')}`,
    );
  }

  const command = {
    type,
    timestamp: now(),
    id: ++sequence,
    origin: 'gesture-module',
  };

  if (type === INTERACTION_COMMANDS.MOVE_SELECTED) {
    if (!options.delta || typeof options.delta !== 'object') {
      throw new Error(
        'InteractionCommand[MOVE_SELECTED] requires a normalized screen-space delta { x, y }.',
      );
    }
    command.delta = normalizeDelta(options.delta);
  }

  if (type === INTERACTION_COMMANDS.ROTATE_SELECTED) {
    command.deltaRotation = normalizeScalar(options.deltaRotation);
  }

  if (type === INTERACTION_COMMANDS.CAMERA_ORBIT) {
    command.deltaOrbit = normalizeScalar(options.deltaOrbit);
  }

  if (type === INTERACTION_COMMANDS.SELECT_FURNITURE) {
    command.screenPoint = normalizeScreenPoint(options.screenPoint);
  }

  return command;
}

function normalizeDelta(delta) {
  const x = typeof delta.x === 'number' && Number.isFinite(delta.x) ? delta.x : 0;
  const y = typeof delta.y === 'number' && Number.isFinite(delta.y) ? delta.y : 0;
  return { x, y };
}

function normalizeScalar(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeScreenPoint(point) {
  const x = point && typeof point.x === 'number' && Number.isFinite(point.x) ? point.x : 0;
  const y = point && typeof point.y === 'number' && Number.isFinite(point.y) ? point.y : 0;
  return { x, y };
}

export function assertValidInteractionCommand(command) {
  if (!command || typeof command !== 'object') {
    throw new Error('InteractionCommand must be an object.');
  }
  if (!isSupportedCommand(command.type)) {
    throw new Error(`InteractionCommand type "${command.type}" is not supported in V0.`);
  }
  if (typeof command.timestamp !== 'number') {
    throw new Error('InteractionCommand must include a numeric timestamp.');
  }
  if (command.type === INTERACTION_COMMANDS.MOVE_SELECTED) {
    const d = command.delta;
    if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') {
      throw new Error('InteractionCommand[MOVE_SELECTED] must include a numeric delta { x, y }.');
    }
  }
  if (command.type === INTERACTION_COMMANDS.ROTATE_SELECTED) {
    if (typeof command.deltaRotation !== 'number') {
      throw new Error('InteractionCommand[ROTATE_SELECTED] must include a numeric deltaRotation.');
    }
  }
  if (command.type === INTERACTION_COMMANDS.CAMERA_ORBIT) {
    if (typeof command.deltaOrbit !== 'number') {
      throw new Error('InteractionCommand[CAMERA_ORBIT] must include a numeric deltaOrbit.');
    }
  }
  if (command.type === INTERACTION_COMMANDS.SELECT_FURNITURE) {
    const p = command.screenPoint;
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') {
      throw new Error('InteractionCommand[SELECT_FURNITURE] must include a numeric screenPoint { x, y }.');
    }
  }
  return true;
}