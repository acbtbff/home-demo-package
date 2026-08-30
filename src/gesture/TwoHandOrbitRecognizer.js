// ============================================================================
// TwoHandOrbitRecognizer (prototype)
//
// Detects a two-hand horizontal "orbit space" rotation intent. This prototype
// only reports ORBIT_LEFT / ORBIT_RIGHT / NONE; it does NOT emit CAMERA_ORBIT
// and does not move or rotate anything.
//
// Formula:
//   leftCenter  = stable center of the hand with smaller screen x
//   rightCenter = stable center of the hand with larger screen x
//   vector      = rightCenter - leftCenter
//   angle       = atan2(vector.y, vector.x)
//   deltaAngle  = wrap(currentAngle - previousAngle) to [-PI, PI]
//
// Direction convention (y grows downward, subject to manual verification):
//   accumulatedAngle > 0 -> ORBIT_RIGHT
//   accumulatedAngle < 0 -> ORBIT_LEFT
// ============================================================================

export const TWO_HAND_ORBIT = Object.freeze({
  NONE: 'NONE',
  ORBIT_LEFT: 'ORBIT_LEFT',
  ORBIT_RIGHT: 'ORBIT_RIGHT',
});

export const TWO_HAND_MODE = Object.freeze({
  IDLE: 'IDLE',
  TWO_HAND: 'TWO_HAND_MODE',
  COOLDOWN: 'COOLDOWN',
});

export const TWO_HAND_STABLE_FRAMES = 5;
export const TWO_HAND_COOLDOWN_FRAMES = 6;
export const TWO_HAND_MIN_SEPARATION = 0.12;
export const TWO_HAND_MIN_ORBIT_DELTA = 0.03;
export const TWO_HAND_MIN_ORBIT_FRAMES = 3;
export const TWO_HAND_MIN_ACCUMULATED_ANGLE = 0.25;
export const TWO_HAND_ORBIT_RESET_FRAMES = 8;

const HAND_CENTER_INDICES = [0, 5, 9, 13, 17];

function wrapAngleDelta(delta) {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
}

function handCenter(hand) {
  const landmarks = hand?.landmarks;
  if (!landmarks || landmarks.length < 21) return null;
  let x = 0;
  let y = 0;
  for (const index of HAND_CENTER_INDICES) {
    x += landmarks[index].x;
    y += landmarks[index].y;
  }
  return { x: x / HAND_CENTER_INDICES.length, y: y / HAND_CENTER_INDICES.length };
}

export class TwoHandOrbitRecognizer {
  constructor() {
    this.mode = TWO_HAND_MODE.IDLE;
    this.stableFrames = 0;
    this.cooldownFrames = 0;
    this.previousAngle = null;
    this.angle = 0;
    this.deltaAngle = 0;
    this.separation = 0;
    this.accumulatedAngle = 0;
    this.validOrbitFrames = 0;
    this.framesSinceValid = 0;
    this.orbit = TWO_HAND_ORBIT.NONE;
    this.handsDetected = 0;
  }

  get state() {
    return {
      mode: this.mode,
      orbit: this.orbit,
      separation: this.separation,
      angle: this.angle,
      deltaAngle: this.deltaAngle,
      stableFrames: this.stableFrames,
      cooldownFrames: this.cooldownFrames,
      handsDetected: this.handsDetected,
      accumulatedAngle: this.accumulatedAngle,
    };
  }

  process(frame) {
    const hands = frame?.hands || [];
    this.handsDetected = hands.length;

    if (hands.length < 2) {
      this._exitTwoHand();
      return this.state;
    }

    const first = handCenter(hands[0]);
    const second = handCenter(hands[1]);
    if (!first || !second) {
      this._exitTwoHand();
      return this.state;
    }

    const left = first.x <= second.x ? first : second;
    const right = first.x <= second.x ? second : first;
    this.separation = Math.hypot(right.x - left.x, right.y - left.y);
    this.angle = Math.atan2(right.y - left.y, right.x - left.x);

    this.stableFrames += 1;
    this.cooldownFrames = 0;

    if (this.stableFrames < TWO_HAND_STABLE_FRAMES) {
      this.previousAngle = this.angle;
      this.orbit = TWO_HAND_ORBIT.NONE;
      this.mode = TWO_HAND_MODE.IDLE;
      return this.state;
    }

    this.mode = TWO_HAND_MODE.TWO_HAND;

    if (this.previousAngle === null) {
      this.previousAngle = this.angle;
      this.deltaAngle = 0;
      return this.state;
    }

    this.deltaAngle = wrapAngleDelta(this.angle - this.previousAngle);
    this.previousAngle = this.angle;
    this._updateOrbit();
    return this.state;
  }

  reset() {
    this.mode = TWO_HAND_MODE.IDLE;
    this.stableFrames = 0;
    this.cooldownFrames = 0;
    this.previousAngle = null;
    this.angle = 0;
    this.deltaAngle = 0;
    this.separation = 0;
    this.accumulatedAngle = 0;
    this.validOrbitFrames = 0;
    this.framesSinceValid = 0;
    this.orbit = TWO_HAND_ORBIT.NONE;
    this.handsDetected = 0;
  }

  _updateOrbit() {
    if (
      this.separation >= TWO_HAND_MIN_SEPARATION &&
      Math.abs(this.deltaAngle) >= TWO_HAND_MIN_ORBIT_DELTA
    ) {
      this.accumulatedAngle += this.deltaAngle;
      this.validOrbitFrames += 1;
      this.framesSinceValid = 0;

      if (
        this.validOrbitFrames >= TWO_HAND_MIN_ORBIT_FRAMES &&
        Math.abs(this.accumulatedAngle) >= TWO_HAND_MIN_ACCUMULATED_ANGLE
      ) {
        this.orbit =
          this.accumulatedAngle > 0
            ? TWO_HAND_ORBIT.ORBIT_RIGHT
            : TWO_HAND_ORBIT.ORBIT_LEFT;
      }
    } else {
      this.framesSinceValid += 1;
      if (this.framesSinceValid >= TWO_HAND_ORBIT_RESET_FRAMES) {
        this.accumulatedAngle = 0;
        this.validOrbitFrames = 0;
        this.orbit = TWO_HAND_ORBIT.NONE;
      }
    }
  }

  _exitTwoHand() {
    this.stableFrames = 0;
    this.previousAngle = null;
    this.angle = 0;
    this.deltaAngle = 0;
    this.separation = 0;
    this.accumulatedAngle = 0;
    this.validOrbitFrames = 0;
    this.framesSinceValid = 0;
    this.orbit = TWO_HAND_ORBIT.NONE;

    if (this.mode === TWO_HAND_MODE.TWO_HAND) {
      this.mode = TWO_HAND_MODE.COOLDOWN;
      this.cooldownFrames = TWO_HAND_COOLDOWN_FRAMES;
    } else if (this.mode === TWO_HAND_MODE.COOLDOWN) {
      this.cooldownFrames -= 1;
      if (this.cooldownFrames <= 0) {
        this.mode = TWO_HAND_MODE.IDLE;
        this.cooldownFrames = 0;
      }
    } else {
      this.mode = TWO_HAND_MODE.IDLE;
    }
  }
}
