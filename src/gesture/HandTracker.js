import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { fromMediaPipeLandmarkerResult } from './HandTrackingResult.js';

// ============================================================================
// HandTracker
//
// Thin wrapper around MediaPipe Hand Landmarker for Web. Owned by the gesture
// layer ONLY. It exposes a MediaPipe-free HandTrackingResult via onResult, so
// the future GestureRecognizer never has to import MediaPipe types.
//
// Pipeline for GESTURE-002:
//   Webcam -> HandTracker -> HandTrackingResult -> Debug Visualization
//
// MediaPipe resources (documented in README.md):
//   - WASM + loader: jsDelivr CDN for @mediapipe/tasks-vision
//   - model: Google storage hand_landmarker.task (float16)
// ============================================================================

export const HAND_LANDMARKER_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';

export const HAND_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  /**
   * @param {object} [config]
   * @param {(result: object) => void} [config.onResult] - receives HandTrackingResult.
   * @param {number} [config.numHands] - max hands to detect (V0 default 1).
   */
  constructor({ onResult, numHands = 1 } = {}) {
    this.onResult = onResult || (() => {});
    this.numHands = numHands;
    this.landmarker = null;
    this.video = null;
    this.started = false;
  }

  /**
   * Initialize the detector once and attach the source video. Repeated calls
   * reuse the existing detector instead of creating a duplicate.
   * @param {HTMLVideoElement} video
   */
  async start(video) {
    if (!(video instanceof HTMLVideoElement)) {
      throw new TypeError('[HandTracker] start() expects an HTMLVideoElement.');
    }

    if (!this.landmarker) {
      const vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM_BASE);

      const create = (delegate) =>
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_LANDMARKER_MODEL_URL,
            delegate,
          },
          runningMode: 'VIDEO',
          numHands: this.numHands,
        });

      try {
        this.landmarker = await create('GPU');
      } catch (error) {
        console.warn('[HandTracker] GPU delegate unavailable, falling back to CPU.', error);
        this.landmarker = await create('CPU');
      }
    }

    this.video = video;
    this.started = true;
    return this.landmarker;
  }

  /**
   * Run one VIDEO-mode detection and emit a normalized HandTrackingResult.
   * Throws if the detector has not been initialized. Skips detection (returns
   * null) while the video has no current frame yet.
   * @param {number} timestampMs - monotonically increasing frame timestamp.
   */
  detectForVideo(timestampMs) {
    if (!this.landmarker) {
      throw new Error('[HandTracker] Not initialized. Call start(video) first.');
    }
    if (!this.video) {
      throw new Error('[HandTracker] No video element attached. Call start(video) first.');
    }
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const mpResult = this.landmarker.detectForVideo(this.video, timestampMs);
    const result = fromMediaPipeLandmarkerResult(mpResult, timestampMs);
    this.onResult(result);
    return result;
  }

  /** Release the detector and clear video reference. */
  close() {
    this.started = false;
    this.video = null;
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }
}
