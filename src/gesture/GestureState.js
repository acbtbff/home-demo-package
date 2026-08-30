// ============================================================================
// Gesture State Machine (V0: pinch only)
//
// Transient states PINCH_START / PINCH_END exist so the adapter can emit
// BEGIN_MOVE / END_MOVE exactly once per interaction, and PINCH_HOLD emits
// MOVE_SELECTED deltas repeatedly while the pinch is maintained.
//
//   IDLE --pinch detected--> PINCH_START --still pinched--> PINCH_HOLD
//   PINCH_HOLD --pinch released--> PINCH_END --(auto)--> IDLE
//
// Reserved states (future, defined but NOT reachable in V0): SELECT_*, ROTATE_*.
// ============================================================================

export const GESTURE_STATE = Object.freeze({
  IDLE: 'IDLE',
  PINCH_START: 'PINCH_START', // transient
  PINCH_HOLD: 'PINCH_HOLD',
  PINCH_END: 'PINCH_END', // transient

  // Reserved for future phases:
  SELECT_START: 'SELECT_START',
  SELECT_HOLD: 'SELECT_HOLD',
  SELECT_END: 'SELECT_END',
  ROTATE_START: 'ROTATE_START',
  ROTATE_HOLD: 'ROTATE_HOLD',
  ROTATE_END: 'ROTATE_END',
});

// Allowed transitions for the V0 pinch machine. Invalid transitions return false.
const TRANSITIONS = Object.freeze({
  [GESTURE_STATE.IDLE]: [GESTURE_STATE.PINCH_START],
  [GESTURE_STATE.PINCH_START]: [GESTURE_STATE.PINCH_HOLD],
  [GESTURE_STATE.PINCH_HOLD]: [GESTURE_STATE.PINCH_END],
  [GESTURE_STATE.PINCH_END]: [GESTURE_STATE.IDLE],
});

export class GestureStateMachine {
  constructor() {
    this.state = GESTURE_STATE.IDLE;
    this.listeners = [];
    this.history = [];
  }

  get current() {
    return this.state;
  }

  /** Subscribe to transitions. Returns an unsubscribe function. */
  onTransition(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  /** Attempt a transition; returns false when the V0 machine forbids it. */
  transition(next, meta = {}) {
    const allowed = TRANSITIONS[this.state] || [];
    if (!allowed.includes(next)) {
      return false;
    }
    const prev = this.state;
    this.state = next;
    const entry = { from: prev, to: next, at: Date.now(), meta };
    this.history.push(entry);
    if (this.history.length > 100) this.history.shift();
    for (const listener of [...this.listeners]) {
      listener({ ...entry });
    }
    return true;
  }

  reset() {
    this.state = GESTURE_STATE.IDLE;
    this.history.length = 0;
  }
}
