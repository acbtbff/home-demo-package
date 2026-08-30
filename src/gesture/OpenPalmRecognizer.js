// ============================================================================
// OpenPalmRecognizer (v0)
//
// Detects a single open palm from our own HandTrackingResult using simple
// landmark geometry and a 600ms hold-to-confirm timer. It does not emit
// commands; it exposes hold/progress/armed state and a one-shot consumeFire().
//
// Geometry: requires exactly one hand and at least four clearly extended
// fingers (index, middle, ring, pinky). The demo gates this recognizer so it
// never runs during MOVE / SPIN / TWO_HAND modes or within the post-pinch
// grace period.
// ============================================================================

export const OPEN_PALM_HOLD_MS = 600;
export const OPEN_PALM_GRACE_MS = 300;

const FINGER_MCP = [5, 9, 13, 17];
const FINGER_PIP = [6, 10, 14, 18];
const FINGER_TIP = [8, 12, 16, 20];
const MIN_EXTENDED_FINGERS = 4;
const FINGER_EXTENSION_RATIO = 1.25;
const MIN_LANDMARKS = 21;

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFingerExtended(landmarks, mcpIndex, pipIndex, tipIndex) {
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[pipIndex];
  const tip = landmarks[tipIndex];
  if (!mcp || !pip || !tip) return false;
  return distance2D(mcp, tip) > distance2D(mcp, pip) * FINGER_EXTENSION_RATIO;
}

export class OpenPalmRecognizer {
  constructor() {
    this.openPalm = false;
    this.holdMs = 0;
    this.progress = 0;
    this.armed = false;
    this.fired = false;
    this.lastTimestamp = null;
  }

  get state() {
    return {
      openPalm: this.openPalm,
      holdMs: this.holdMs,
      progress: this.progress,
      armed: this.armed,
    };
  }

  process(frame, { allow = false } = {}) {
    const hand = frame && frame.hands ? frame.hands[0] : null;
    const landmarks = frame && frame.hands && frame.hands.length === 1 && hand
      ? hand.landmarks || []
      : [];

    let detected = false;
    if (landmarks.length >= MIN_LANDMARKS) {
      let extendedFingers = 0;
      for (let i = 0; i < FINGER_TIP.length; i += 1) {
        if (isFingerExtended(landmarks, FINGER_MCP[i], FINGER_PIP[i], FINGER_TIP[i])) {
          extendedFingers += 1;
        }
      }
      detected = extendedFingers >= MIN_EXTENDED_FINGERS;
    }

    const timestamp =
      frame && typeof frame.timestamp === "number" && Number.isFinite(frame.timestamp)
        ? frame.timestamp
        : 0;

    if (!allow || !detected) {
      this._resetHold();
      this.openPalm = detected;
      return this.state;
    }

    const dt =
      this.lastTimestamp === null || timestamp <= this.lastTimestamp
        ? 0
        : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.holdMs = Math.min(OPEN_PALM_HOLD_MS, this.holdMs + dt);

    this.openPalm = true;
    this.progress = Math.min(1, this.holdMs / OPEN_PALM_HOLD_MS);
    if (this.holdMs >= OPEN_PALM_HOLD_MS && !this.fired) {
      this.armed = true;
    }

    return this.state;
  }

  consumeFire() {
    if (!this.armed || this.fired) return false;
    this.fired = true;
    return true;
  }

  reset() {
    this.openPalm = false;
    this._resetHold();
  }

  _resetHold() {
    this.holdMs = 0;
    this.progress = 0;
    this.armed = false;
    this.fired = false;
    this.lastTimestamp = null;
  }
}
