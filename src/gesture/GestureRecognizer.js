import { GestureStateMachine, GESTURE_STATE } from './GestureState.js';

// ============================================================================
// GestureRecognizer (V0: pinch move + pinch rotation intent)
//
// Consumes our own HandTrackingResult and produces a MediaPipe-free pinch
// measurement. It drives the existing GestureStateMachine using hysteresis so
// state transitions stay stable near the threshold.
//
// Normalization:
//   handScale = distance(wrist=0, middle MCP=9)
//   normalizedPinchDistance = distance(thumb tip=4, index tip=8) / handScale
//
// Pinch axis:
//   pinchAxis = indexTip - thumbTip
//   pinchAngle = atan2(axis.y, axis.x)   (radians, screen plane)
//
// Hysteresis:
//   enter pinch when normalizedPinchDistance <= PINCH_ENTER_THRESHOLD
//   exit pinch when  normalizedPinchDistance >= PINCH_EXIT_THRESHOLD
//   PINCH_ENTER_THRESHOLD < PINCH_EXIT_THRESHOLD
// ============================================================================

export const PINCH_ENTER_THRESHOLD = 0.5;
export const PINCH_EXIT_THRESHOLD = 0.7;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const WRIST = 0;
const MIDDLE_MCP = 9;

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GestureRecognizer {
  /**
   * @param {object} [config]
   * @param {number} [config.enterThreshold]
   * @param {number} [config.exitThreshold]
   * @param {(state: string) => void} [config.onStateChange]
   */
  constructor({ enterThreshold = PINCH_ENTER_THRESHOLD, exitThreshold = PINCH_EXIT_THRESHOLD, onStateChange } = {}) {
    if (!(enterThreshold < exitThreshold)) {
      throw new Error('[GestureRecognizer] enterThreshold must be less than exitThreshold.');
    }

    this.enterThreshold = enterThreshold;
    this.exitThreshold = exitThreshold;
    this.stateMachine = new GestureStateMachine();
    this.isPinching = false;

    if (onStateChange) this.onStateChange(onStateChange);
  }

  get state() {
    return this.stateMachine.current;
  }

  onStateChange(listener) {
    return this.stateMachine.onTransition(({ to }) => listener(to));
  }

  /**
   * Process one HandTrackingResult. Returns our own pinch measurement and
   * advances the V0 gesture state machine.
   */
  process(frame) {
    const measurement = {
      pinchDistance: 0,
      normalizedPinchDistance: 0,
      isPinching: false,
      pinchAngle: 0,
    };

    const hand = frame?.hands?.[0];
    const landmarks = hand?.landmarks || [];

    if (landmarks.length < 21) {
      this.isPinching = false;
      this._safeReturnToIdle();
      return measurement;
    }

    const thumb = landmarks[THUMB_TIP];
    const index = landmarks[INDEX_TIP];
    const wrist = landmarks[WRIST];
    const middleMcp = landmarks[MIDDLE_MCP];

    const pinchDistance = distance2D(thumb, index);
    const handScale = distance2D(wrist, middleMcp);
    const normalizedPinchDistance =
      handScale > 1e-6 ? pinchDistance / handScale : pinchDistance;

    const axis = { x: index.x - thumb.x, y: index.y - thumb.y };
    const pinchAngle = Math.atan2(axis.y, axis.x);

    if (!this.isPinching && normalizedPinchDistance <= this.enterThreshold) {
      this.isPinching = true;
    } else if (this.isPinching && normalizedPinchDistance >= this.exitThreshold) {
      this.isPinching = false;
    }

    measurement.pinchDistance = pinchDistance;
    measurement.normalizedPinchDistance = normalizedPinchDistance;
    measurement.isPinching = this.isPinching;
    measurement.pinchAngle = pinchAngle;

    const current = this.stateMachine.current;

    if (this.isPinching) {
      if (current === GESTURE_STATE.IDLE) {
        this.stateMachine.transition(GESTURE_STATE.PINCH_START, { ...measurement });
      } else if (current === GESTURE_STATE.PINCH_START) {
        this.stateMachine.transition(GESTURE_STATE.PINCH_HOLD, { ...measurement });
      }
      // PINCH_HOLD stays put while pinching continues.
    } else if (current === GESTURE_STATE.PINCH_HOLD) {
      this.stateMachine.transition(GESTURE_STATE.PINCH_END, { ...measurement });
    } else if (current === GESTURE_STATE.PINCH_END) {
      this.stateMachine.transition(GESTURE_STATE.IDLE, { ...measurement });
    } else if (current === GESTURE_STATE.PINCH_START) {
      this.stateMachine.reset();
    }

    return measurement;
  }

  reset() {
    this.isPinching = false;
    this.stateMachine.reset();
  }

  _safeReturnToIdle() {
    if (this.stateMachine.current !== GESTURE_STATE.IDLE) {
      this.stateMachine.reset();
    }
  }
}
