// ============================================================================
// HandTrackingResult
//
// OUR OWN simple result structure, deliberately independent of MediaPipe raw
// objects. Future GestureRecognizer code consumes this shape, not MediaPipe.
//
// shape:
//   {
//     timestamp: number,                       // ms epoch
//     hands: [
//       {
//         handedness: 'Left' | 'Right' | 'Unknown',
//         landmarks: [ { x, y, z }, ... ]      // x/y normalized camera coords 0..1
//       }
//     ]
//   }
//
// x/y are normalized camera coordinates: 0..1, origin at the TOP-LEFT of the
// video frame. z is MediaPipe's relative depth (smaller = closer to camera).
// ============================================================================

export function createHandTrackingResult(timestamp, hands = []) {
  return { timestamp, hands };
}

/** Convert a MediaPipe HandLandmarker result into our own data structure. */
export function fromMediaPipeLandmarkerResult(mpResult, timestamp = Date.now()) {
  const hands = (mpResult.landmarks || []).map((landmarks, index) => ({
    handedness: normalizeHandedness(mpResult.handedness?.[index]?.[0]?.categoryName),
    landmarks: landmarks.map((lm) => ({
      x: clampUnit(lm.x),
      y: clampUnit(lm.y),
      z: typeof lm.z === 'number' && Number.isFinite(lm.z) ? lm.z : 0,
    })),
  }));

  return createHandTrackingResult(timestamp, hands);
}

function normalizeHandedness(categoryName) {
  if (categoryName === 'Left' || categoryName === 'Right') return categoryName;
  return 'Unknown';
}

function clampUnit(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
