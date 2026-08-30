import { GestureStateMachine, GESTURE_STATE } from './GestureState.js';
import { createInteractionCommand } from '../interaction/InteractionCommand.js';
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js';

// ============================================================================
// GestureInputAdapter
//
// The interface between the Gesture module and the INTEGRATION BOUNDARY.
//
// V0 PINCH SEMANTICS: thumb + index pinch is MOVE ONLY, but the first pinch
// frame first emits SELECT_FURNITURE with the pinch midpoint so the Host can
// decide which object was grabbed.
//
// INPUT:
//   handleGestureEvent({ type })   - PINCH_START / PINCH_HOLD / PINCH_END
//   handlePinchPoint({ x, y })     - normalized pinch midpoint, 0..1
//
// OUTPUT (to the Host project):
//   config.onCommand(InteractionCommand) - the ONLY channel to the Host.
//
// SCREEN-SPACE DIRECTION CONTRACT
//   delta.x > 0 : the tracked point moved visually RIGHT on screen.
//   delta.y > 0 : the tracked point moved visually DOWN on screen.
//
// Selection is emitted once per pinch, before BEGIN_MOVE, using the pinch
// midpoint. The adapter never knows object ids, never raycasts, and never
// touches Three.js types.
// ============================================================================

export class GestureInputAdapter {
  /**
   * @param {object} config
   * @param {(command: object) => void} config.onCommand - REQUIRED Host sink.
   * @param {boolean} [config.mirrorVideo]
   */
  constructor({ onCommand, mirrorVideo = false }) {
    if (typeof onCommand !== 'function') {
      throw new Error(
        'GestureInputAdapter requires an onCommand callback (the Host sink at the INTEGRATION BOUNDARY).',
      );
    }
    this.onCommand = onCommand;
    this.stateMachine = new GestureStateMachine();
    this.lastPinchPoint = null;
    this.startPinchPoint = null;
    this._activeMove = false;
    this._selectionEmitted = false;
    this._xSign = mirrorVideo ? -1 : 1;

    this.stateMachine.onTransition(({ from, to }) => this._onStateChange(from, to));
  }

  get state() {
    return this.stateMachine.current;
  }

  handleGestureEvent(event) {
    if (!event || typeof event.type !== 'string') return;

    switch (event.type) {
      case GESTURE_STATE.PINCH_START:
        this.stateMachine.transition(GESTURE_STATE.PINCH_START, event);
        break;
      case GESTURE_STATE.PINCH_HOLD:
        this.stateMachine.transition(GESTURE_STATE.PINCH_HOLD, event);
        break;
      case GESTURE_STATE.PINCH_END:
        this.stateMachine.transition(GESTURE_STATE.PINCH_END, event);
        break;
      default:
        break;
    }
  }

  handlePinchPoint(point) {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

    const current = this.stateMachine.current;

    if (current === GESTURE_STATE.PINCH_START) {
      this.startPinchPoint = { x: point.x, y: point.y };
      this.lastPinchPoint = { x: point.x, y: point.y };
      if (!this._selectionEmitted) {
        this._selectionEmitted = true;
        this.emit(INTERACTION_COMMANDS.SELECT_FURNITURE, {
          screenPoint: { x: point.x, y: point.y },
        });
        this.emit(INTERACTION_COMMANDS.BEGIN_MOVE, {});
      }
      return;
    }

    if (current !== GESTURE_STATE.PINCH_HOLD) return;

    const prev = this.lastPinchPoint;
    this.lastPinchPoint = { x: point.x, y: point.y };
    if (!prev) return;

    const delta = {
      x: (point.x - prev.x) * this._xSign,
      y: point.y - prev.y,
    };

    if (delta.x !== 0 || delta.y !== 0) {
      this.emit(INTERACTION_COMMANDS.MOVE_SELECTED, { delta });
    }
  }

  reset() {
    this.stateMachine.reset();
    this.lastPinchPoint = null;
    this.startPinchPoint = null;
    this._activeMove = false;
    this._selectionEmitted = false;
  }

  _onStateChange(from, to) {
    if (to === GESTURE_STATE.PINCH_START && !this._activeMove) {
      this._activeMove = true;
      this._selectionEmitted = false;
    } else if (to === GESTURE_STATE.PINCH_END) {
      if (this._activeMove) {
        this._activeMove = false;
        this.emit(INTERACTION_COMMANDS.END_MOVE, {});
      }
      this.lastPinchPoint = null;
      this.startPinchPoint = null;
      this._selectionEmitted = false;
      // PINCH_END is transient: resolve back to IDLE immediately.
      this.stateMachine.transition(GESTURE_STATE.IDLE);
    }
  }

  emit(type, options) {
    const command = createInteractionCommand(type, options);
    this.onCommand(command);
    return command;
  }
}
