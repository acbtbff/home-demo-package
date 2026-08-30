// ============================================================================
// InteractionCommand Types
//
// The ONLY vocabulary the Gesture module may send across the INTEGRATION
// BOUNDARY to the Host project.
//
// V0 SUPPORTED:
//   BEGIN_MOVE       - pinch grabbed
//   MOVE_SELECTED    - normalized screen-space drag
//   END_MOVE         - pinch released
//   ROTATE_SELECTED  - index-spin yaw intent (radians)
//   CAMERA_ORBIT     - two-hand horizontal orbit intent (radians)
//   SELECT_FURNITURE - normalized screen point the user pinched to select
//   DESELECT_FURNITURE - open-palm hold intent to clear selection
//
// RESERVED:
//   BEGIN_ROTATE, END_ROTATE
// ============================================================================

export const INTERACTION_COMMANDS = Object.freeze({
  // ---- V0 supported ------------------------------------------------
  BEGIN_MOVE: 'BEGIN_MOVE',
  MOVE_SELECTED: 'MOVE_SELECTED',
  END_MOVE: 'END_MOVE',
  ROTATE_SELECTED: 'ROTATE_SELECTED',
  CAMERA_ORBIT: 'CAMERA_ORBIT',
  SELECT_FURNITURE: 'SELECT_FURNITURE',
  DESELECT_FURNITURE: 'DESELECT_FURNITURE',

  // ---- Reserved (future) -------------------------------------------
  BEGIN_ROTATE: 'BEGIN_ROTATE',
  END_ROTATE: 'END_ROTATE',
});

export const V0_SUPPORTED_COMMANDS = Object.freeze([
  INTERACTION_COMMANDS.BEGIN_MOVE,
  INTERACTION_COMMANDS.MOVE_SELECTED,
  INTERACTION_COMMANDS.END_MOVE,
  INTERACTION_COMMANDS.ROTATE_SELECTED,
  INTERACTION_COMMANDS.CAMERA_ORBIT,
  INTERACTION_COMMANDS.SELECT_FURNITURE,
  INTERACTION_COMMANDS.DESELECT_FURNITURE,
]);

export const V0_RESERVED_COMMANDS = Object.freeze([
  INTERACTION_COMMANDS.BEGIN_ROTATE,
  INTERACTION_COMMANDS.END_ROTATE,
]);

export function isSupportedCommand(type) {
  return V0_SUPPORTED_COMMANDS.includes(type);
}

export function isReservedCommand(type) {
  return V0_RESERVED_COMMANDS.includes(type);
}
