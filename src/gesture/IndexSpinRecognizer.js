// ============================================================================
// IndexSpinRecognizer (prototype)
//
// Detects a small circular / arcing "spin" motion of the index fingertip in
// screen space. It does NOT emit commands by itself; it exposes per-frame
// signed angular delta + an `active` gate for the intent-mapping layer.
//
// Screen-space angle convention (y grows downward):
//   positive signed delta -> CLOCKWISE (visual)
//   negative signed delta -> COUNTERCLOCKWISE (visual)
// This mapping must be confirmed by manual verification.
//
// Anti-false-trigger requires:
//   - minimum trajectory length
//   - minimum local radius
//   - minimum accumulated wrapped angle
//   - index finger extended
//   - thumb-index pinch NOT active
// ============================================================================

export const INDEX_SPIN_DIRECTION = Object.freeze({
  NONE: 'NONE',
  CLOCKWISE: 'CLOCKWISE',
  COUNTERCLOCKWISE: 'COUNTERCLOCKWISE',
});

export const INDEX_SPIN_TRAJECTORY_WINDOW = 16;
export const INDEX_SPIN_MIN_POINTS = 8;
export const INDEX_SPIN_MIN_RADIUS = 0.05;
export const INDEX_SPIN_MIN_ANGLE = Math.PI * 0.75;
export const INDEX_SPIN_RESET_FRAMES = 12;

const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wrapAngleDelta(delta) {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
}

function isIndexExtended(landmarks) {
  const mcp = landmarks[INDEX_MCP];
  const pip = landmarks[INDEX_PIP];
  const tip = landmarks[INDEX_TIP];
  if (!mcp || !pip || !tip) return false;
  return distance2D(mcp, tip) > distance2D(mcp, pip) * 1.5;
}

export class IndexSpinRecognizer {
  constructor() {
    this.trajectory = [];
    this.direction = INDEX_SPIN_DIRECTION.NONE;
    this.framesSinceDetection = 0;
    this.accumulatedAngle = 0;
    this.radius = 0;
    this.angularDelta = 0;
    this.active = false;
  }

  get state() {
    return {
      direction: this.direction,
      trajectoryPoints: this.trajectory.length,
      accumulatedAngle: this.accumulatedAngle,
      radius: this.radius,
      angularDelta: this.angularDelta,
      active: this.active,
    };
  }

  process(frame, { pinching = false } = {}) {
    const hand = frame?.hands?.[0];
    const landmarks = hand?.landmarks || [];
    const indexExtended = landmarks.length >= 21 ? isIndexExtended(landmarks) : false;

    if (pinching || !indexExtended) {
      this.active = false;
      this.angularDelta = 0;
      this._tickReset();
      return {
        ...this.state,
        indexExtended,
        pinching,
      };
    }

    const tip = landmarks[INDEX_TIP];
    this.trajectory.push({
      x: tip.x,
      y: tip.y,
      timestamp: typeof frame.timestamp === 'number' ? frame.timestamp : 0,
    });

    if (this.trajectory.length > INDEX_SPIN_TRAJECTORY_WINDOW) {
      this.trajectory.shift();
    }

    this._detect();

    return {
      ...this.state,
      indexExtended,
      pinching,
    };
  }

  reset() {
    this.trajectory = [];
    this.direction = INDEX_SPIN_DIRECTION.NONE;
    this.framesSinceDetection = 0;
    this.accumulatedAngle = 0;
    this.radius = 0;
    this.angularDelta = 0;
    this.active = false;
  }

  _detect() {
    const points = this.trajectory;

    if (points.length < INDEX_SPIN_MIN_POINTS) {
      this.active = false;
      this.angularDelta = 0;
      this._tickReset();
      return;
    }

    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    const radii = points.map((p) => Math.hypot(p.x - centerX, p.y - centerY));
    const radius = radii.reduce((sum, r) => sum + r, 0) / radii.length;

    if (radius < INDEX_SPIN_MIN_RADIUS) {
      this.active = false;
      this.angularDelta = 0;
      this._tickReset();
      return;
    }

    let sum = 0;
    let lastDelta = 0;
    let previous = Math.atan2(points[0].y - centerY, points[0].x - centerX);
    for (let i = 1; i < points.length; i += 1) {
      const angle = Math.atan2(points[i].y - centerY, points[i].x - centerX);
      lastDelta = wrapAngleDelta(angle - previous);
      sum += lastDelta;
      previous = angle;
    }

    this.accumulatedAngle = sum;
    this.radius = radius;
    this.angularDelta = lastDelta;

    if (Math.abs(sum) < INDEX_SPIN_MIN_ANGLE) {
      this.active = false;
      this._tickReset();
      return;
    }

    this.direction =
      sum > 0 ? INDEX_SPIN_DIRECTION.CLOCKWISE : INDEX_SPIN_DIRECTION.COUNTERCLOCKWISE;
    this.active = true;
    this.framesSinceDetection = 0;
  }

  _tickReset() {
    if (this.direction === INDEX_SPIN_DIRECTION.NONE) {
      this.framesSinceDetection = 0;
      return;
    }

    this.framesSinceDetection += 1;
    if (this.framesSinceDetection >= INDEX_SPIN_RESET_FRAMES) {
      this.direction = INDEX_SPIN_DIRECTION.NONE;
      this.framesSinceDetection = 0;
    }
  }
}
