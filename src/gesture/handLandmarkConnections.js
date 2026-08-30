// ============================================================================
// HAND_CONNECTIONS
//
// Standard 21-point hand skeleton, expressed as landmark index pairs.
// Owned by the gesture layer and independent of MediaPipe so future
// recognizers and debug renderers never need a MediaPipe import.
// ============================================================================

export const HAND_CONNECTIONS = Object.freeze([
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm
]);
