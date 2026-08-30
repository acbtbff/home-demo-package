import { createInteractionCommand } from '../interaction/InteractionCommand.js';
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js';
import { TWO_HAND_MODE, TWO_HAND_ORBIT } from './TwoHandOrbitRecognizer.js';

// ============================================================================
// TwoHandToOrbitAdapter
//
// Maps the TwoHandOrbitRecognizer state to CAMERA_ORBIT intent. It emits only
// while the recognizer is in TWO_HAND_MODE and has an active orbit direction,
// using the recognizer's continuous per-frame angular delta (radians), never a
// fixed-angle jump. It emits no other command types.
//
// Direction convention:
//   recognizer.deltaAngle > 0 -> orbit one way (ORBIT_RIGHT)
//   recognizer.deltaAngle < 0 -> orbit the other way (ORBIT_LEFT)
//   ORBIT_COMMAND_SIGN flips the visual direction at this mapping layer only
//   if manual verification shows the camera orbits the wrong way. It does NOT
//   change TwoHandOrbitRecognizer math.
// ============================================================================

export const ORBIT_COMMAND_SIGN = 1;
export const ORBIT_COMMAND_GAIN = 1.0;

export class TwoHandToOrbitAdapter {
  constructor({ onCommand }) {
    if (typeof onCommand !== 'function') {
      throw new Error('TwoHandToOrbitAdapter requires an onCommand callback.');
    }
    this.onCommand = onCommand;
  }

  handleOrbitState(state) {
    if (!state || state.mode !== TWO_HAND_MODE.TWO_HAND) return null;
    if (state.orbit === TWO_HAND_ORBIT.NONE) return null;
    if (typeof state.deltaAngle !== 'number' || !Number.isFinite(state.deltaAngle)) return null;

    const deltaOrbit = state.deltaAngle * ORBIT_COMMAND_GAIN * ORBIT_COMMAND_SIGN;
    if (deltaOrbit === 0) return null;

    const command = createInteractionCommand(INTERACTION_COMMANDS.CAMERA_ORBIT, {
      deltaOrbit,
    });
    this.onCommand(command);
    return command;
  }
}
