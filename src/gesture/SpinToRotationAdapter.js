import { createInteractionCommand } from '../interaction/InteractionCommand.js';
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js';

// ============================================================================
// SpinToRotationAdapter
//
// Maps the IndexSpinRecognizer result to ROTATE_SELECTED intent. It only
// emits when the recognizer's anti-false-trigger gates are active, and it
// keeps the Gesture layer unaware of Sandbox sensitivity or mesh state.
//
// Direction convention:
//   recognizer.angularDelta > 0 -> CLOCKWISE (screen)
//   SPIN_ROTATION_SIGN can be flipped to -1 if manual verification shows the
//   Sandbox cube spins the wrong way for the webcam coordinate system.
// ============================================================================

export const SPIN_ROTATION_SIGN = 1;
export const SPIN_ROTATION_GAIN = 1.0;

export class SpinToRotationAdapter {
  /**
   * @param {object} config
   * @param {(command: object) => void} config.onCommand - ROTATE_SELECTED sink.
   */
  constructor({ onCommand }) {
    if (typeof onCommand !== 'function') {
      throw new Error('SpinToRotationAdapter requires an onCommand callback.');
    }
    this.onCommand = onCommand;
  }

  /**
   * Convert one recognizer state into an optional ROTATE_SELECTED command.
   * Returns null when rotation is not gated in.
   */
  handleSpinState(state) {
    if (!state || !state.active) return null;
    if (typeof state.angularDelta !== 'number' || !Number.isFinite(state.angularDelta)) return null;

    const deltaRotation = state.angularDelta * SPIN_ROTATION_GAIN * SPIN_ROTATION_SIGN;
    if (deltaRotation === 0) return null;

    const command = createInteractionCommand(INTERACTION_COMMANDS.ROTATE_SELECTED, {
      deltaRotation,
    });
    this.onCommand(command);
    return command;
  }
}
