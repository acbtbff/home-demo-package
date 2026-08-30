import { useEffect, useRef, useState } from 'react'
import { Spherical, Vector3 } from 'three'
import { HandTracker } from '../gesture/HandTracker.js'
import { GestureRecognizer } from '../gesture/GestureRecognizer.js'
import { GestureInputAdapter } from '../gesture/GestureInputAdapter.js'
import { GESTURE_STATE } from '../gesture/GestureState.js'
import { IndexSpinRecognizer } from '../gesture/IndexSpinRecognizer.js'
import { TwoHandOrbitRecognizer, TWO_HAND_MODE } from '../gesture/TwoHandOrbitRecognizer.js'
import { SpinToRotationAdapter } from '../gesture/SpinToRotationAdapter.js'
import { TwoHandToOrbitAdapter } from '../gesture/TwoHandToOrbitAdapter.js'
import { OpenPalmRecognizer, OPEN_PALM_GRACE_MS } from '../gesture/OpenPalmRecognizer.js'
import { OpenPalmToDeselectAdapter } from '../gesture/OpenPalmToDeselectAdapter.js'
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js'
import { HostGestureBridge } from './HostGestureBridge.js'

const CAMERA_STATUS = {
  LOADING: 'LOADING',
  READY: 'READY',
  ERROR: 'ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
}

const GRAB_ENTER_RADIUS = 60
const GRAB_EXIT_RADIUS = 80
const GRAB_STABLE_FRAMES = 3
const GRAB_ANCHOR_Y_OFFSET = 0.35
const SPIN_DESELECT_GRACE_MS = 600

function computePinchMidpoint(hand) {
  const landmarks = hand?.landmarks
  if (!landmarks || landmarks.length < 21) return null
  const thumb = landmarks[4]
  const index = landmarks[8]
  return {
    x: (thumb.x + index.x) / 2,
    y: (thumb.y + index.y) / 2,
  }
}

export default function GestureCameraController({
  furnitureWorkspace,
  canvasStateRef,
  orbitControlsRef,
  onReadyFurnitureIdChange,
}) {
  const videoRef = useRef(null)
  const workspaceRef = useRef(furnitureWorkspace)
  const onReadyFurnitureIdChangeRef = useRef(onReadyFurnitureIdChange)

  const [cameraStatus, setCameraStatus] = useState(CAMERA_STATUS.LOADING)
  const [gestureCursorPoint, setGestureCursorPoint] = useState(null)
  const [grabTargets, setGrabTargets] = useState([])
  const [readyFurnitureId, setReadyFurnitureId] = useState(null)
  const [interactionMode, setInteractionMode] = useState('IDLE')

  useEffect(() => {
    workspaceRef.current = furnitureWorkspace
  }, [furnitureWorkspace])

  useEffect(() => {
    onReadyFurnitureIdChangeRef.current = onReadyFurnitureIdChange
  }, [onReadyFurnitureIdChange])

  useEffect(() => {
    const videoElement = videoRef.current
    let disposed = false
    let rafId = 0
    let moveModeActive = false
    let spinWasActive = false
    let twoHandWasActive = false
    let wasPinching = false
    let lastPinchEndAt = 0
    let lastSpinActiveAt = 0
    let candidateFurnitureId = null
    let candidateStableFrames = 0
    let grabReady = false
    let moveAllowed = false

    const getCamera = () => canvasStateRef.current?.camera ?? null
    const getRaycaster = () => canvasStateRef.current?.raycaster ?? null
    const getScene = () => canvasStateRef.current?.scene ?? null
    const getViewportSize = () => {
      const size = canvasStateRef.current?.size
      return {
        width: Number.isFinite(size?.width) && size.width > 0 ? size.width : 1,
        height: Number.isFinite(size?.height) && size.height > 0 ? size.height : 1,
      }
    }
    const getSelectedFurnitureId = () => workspaceRef.current.selectedFurnitureId
    const getPlacementForFurniture = (furnitureId) =>
      Object.values(workspaceRef.current.effectivePlacementsById).find(
        (placement) => placement.furnitureId === furnitureId,
      ) ?? null
    const dispatchHostCommand = (command) => workspaceRef.current.dispatchInteractionCommand(command)

    const applyCameraOrbit = (deltaOrbit) => {
      const camera = getCamera()
      const controls = orbitControlsRef.current
      if (!camera || !controls) return

      const target = controls.target ?? new Vector3(0, 0.8, 0)
      const offset = camera.position.clone().sub(target)
      const radius = Math.min(20, Math.max(4, offset.length()))
      const spherical = new Spherical().setFromVector3(offset)
      spherical.theta -= deltaOrbit
      offset.setFromSpherical(spherical)
      offset.setLength(radius)
      camera.position.copy(target).add(offset)
      camera.lookAt(target)
      controls.update()
    }

    const bridge = new HostGestureBridge({
      getCamera,
      getRaycaster,
      getScene,
      getSelectedFurnitureId,
      getPlacementForFurniture,
      getViewportSize,
      dispatchHostCommand,
      applyCameraOrbit,
    })

    const tracker = new HandTracker({ numHands: 2 })
    const recognizer = new GestureRecognizer()
    const spinRecognizer = new IndexSpinRecognizer()
    const twoHandOrbitRecognizer = new TwoHandOrbitRecognizer()
    const openPalmRecognizer = new OpenPalmRecognizer()

    const spinToRotationAdapter = new SpinToRotationAdapter({
      onCommand: (command) => {
        if (!disposed) bridge.handleCommand(command)
      },
    })

    const twoHandToOrbitAdapter = new TwoHandToOrbitAdapter({
      onCommand: (command) => {
        if (!disposed) bridge.handleCommand(command)
      },
    })

    const openPalmToDeselectAdapter = new OpenPalmToDeselectAdapter({
      onCommand: (command) => {
        if (!disposed) bridge.handleCommand(command)
      },
    })

    const adapter = new GestureInputAdapter({
      onCommand: (command) => {
        if (disposed) return

        if (command.type === INTERACTION_COMMANDS.SELECT_FURNITURE) {
          if (!grabReady || !candidateFurnitureId) {
            moveAllowed = false
            return
          }
          const result = bridge.handleCommand(command, { furnitureId: candidateFurnitureId })
          moveAllowed = result.selected
          if (moveAllowed) setInteractionMode('MOVE_MODE')
          return
        }

        if (
          command.type === INTERACTION_COMMANDS.BEGIN_MOVE ||
          command.type === INTERACTION_COMMANDS.MOVE_SELECTED ||
          command.type === INTERACTION_COMMANDS.END_MOVE
        ) {
          if (!moveAllowed) return
          bridge.handleCommand(command)
          return
        }

        bridge.handleCommand(command)
      },
      mirrorVideo: false,
    })

    const unsubscribeState = recognizer.onStateChange((next) => {
      if (disposed) return
      if (
        next === GESTURE_STATE.PINCH_START ||
        next === GESTURE_STATE.PINCH_HOLD ||
        next === GESTURE_STATE.PINCH_END
      ) {
        adapter.handleGestureEvent({ type: next })
      }
    })

    const projectGrabTargets = () => {
      const camera = getCamera()
      const items = workspaceRef.current.furnitureItems ?? []
      return items.map((furniture) => {
        const placement = Object.values(workspaceRef.current.effectivePlacementsById)
          .find((item) => item.furnitureId === furniture.id)
        if (!placement || !camera) {
          return { furnitureId: furniture.id, x: 0, y: 0, visible: false }
        }
        const height = furniture.physical?.dimensionsM?.height ?? 0
        const anchor = new Vector3(
          placement.position.x,
          placement.position.y + height + GRAB_ANCHOR_Y_OFFSET,
          placement.position.z,
        )
        const projected = anchor.project(camera)
        return {
          furnitureId: furniture.id,
          x: (projected.x + 1) / 2,
          y: (1 - projected.y) / 2,
          visible: projected.z < 1 && projected.z > -1,
        }
      })
    }

    const resolveCandidate = (cursorPoint, currentFurnitureId, targets) => {
      if (!cursorPoint || !Number.isFinite(cursorPoint.x) || !Number.isFinite(cursorPoint.y)) {
        return { furnitureId: null }
      }

      const { width, height } = getViewportSize()
      const scored = targets.map((target) => ({
        ...target,
        distancePx: Math.hypot(
          (target.x - cursorPoint.x) * width,
          (target.y - cursorPoint.y) * height,
        ),
      }))

      let candidate = null
      const current = currentFurnitureId
        ? scored.find((target) => target.furnitureId === currentFurnitureId)
        : null

      if (current && current.distancePx <= GRAB_EXIT_RADIUS) {
        candidate = current.furnitureId
      } else {
        const nearest = [...scored].sort((a, b) => a.distancePx - b.distancePx)[0]
        if (nearest && nearest.distancePx <= GRAB_ENTER_RADIUS) {
          candidate = nearest.furnitureId
        }
      }

      return { furnitureId: candidate }
    }

    const clearCandidate = () => {
      candidateFurnitureId = null
      candidateStableFrames = 0
      grabReady = false
      setGestureCursorPoint(null)
      setReadyFurnitureId(null)
      onReadyFurnitureIdChangeRef.current?.(null)
    }

    const setReady = (furnitureId) => {
      setReadyFurnitureId(furnitureId)
      onReadyFurnitureIdChangeRef.current?.(furnitureId)
    }

    const loop = () => {
      if (disposed) return
      const now = performance.now()

      try {
        const result = tracker.detectForVideo(now)
        if (result) {
          const targets = projectGrabTargets()
          setGrabTargets(targets)
          const twoHandState = twoHandOrbitRecognizer.process(result)

          if (twoHandState.mode === TWO_HAND_MODE.TWO_HAND) {
            if (!twoHandWasActive) {
              recognizer.reset()
              adapter.reset()
              spinRecognizer.reset()
              openPalmRecognizer.reset()
              bridge.resetSmoothing()
            }
            twoHandWasActive = true
            moveAllowed = false
            clearCandidate()
            twoHandToOrbitAdapter.handleOrbitState(twoHandState)
            setInteractionMode('TWO_HAND_MODE')
          } else {
            if (twoHandWasActive) bridge.resetOrbitSmoothing()
            twoHandWasActive = false

            if (twoHandState.mode === 'COOLDOWN') {
              moveAllowed = false
              clearCandidate()
              setInteractionMode('IDLE')
            } else {
              const measurement = recognizer.process(result)
              const pinchActive = measurement.isPinching
              const currentState = recognizer.state

              if (currentState === GESTURE_STATE.PINCH_END) lastPinchEndAt = now
              if (wasPinching && !pinchActive) lastPinchEndAt = now
              wasPinching = pinchActive

              const pinchGestureState =
                currentState === GESTURE_STATE.PINCH_START ||
                currentState === GESTURE_STATE.PINCH_HOLD ||
                currentState === GESTURE_STATE.PINCH_END
              const moveMode = pinchGestureState && (grabReady || moveModeActive)

              if (moveMode && !moveModeActive) {
                spinRecognizer.reset()
                bridge.resetSmoothing()
              }
              moveModeActive = moveMode

              const spinState = spinRecognizer.process(result, { pinching: pinchActive })
              if (spinState.active !== spinWasActive) {
                bridge.resetRotationSmoothing()
                if (spinState.active) bridge.resetOrbitSmoothing()
              }
              spinWasActive = spinState.active
              if (spinState.active) lastSpinActiveAt = now

              const allowOpenPalm =
                Boolean(workspaceRef.current.selectedFurnitureId) &&
                result.hands.length === 1 &&
                !pinchActive &&
                !moveMode &&
                !spinState.active &&
                now - lastPinchEndAt >= OPEN_PALM_GRACE_MS &&
                now - lastSpinActiveAt >= SPIN_DESELECT_GRACE_MS

              const openPalmState = openPalmRecognizer.process(result, { allow: allowOpenPalm })
              const deselectHoldActive = allowOpenPalm && openPalmState.openPalm

              if (openPalmState.armed && openPalmRecognizer.consumeFire()) {
                openPalmToDeselectAdapter.handleOpenPalmState(openPalmState)
              }

              setInteractionMode(
                moveMode
                  ? 'MOVE_MODE'
                  : spinState.active
                    ? 'SPIN_MODE'
                    : deselectHoldActive
                      ? 'DESELECT_HOLD'
                      : 'IDLE',
              )

              spinToRotationAdapter.handleSpinState(spinState)

              const midpoint = computePinchMidpoint(result.hands[0])
              if (pinchActive && midpoint) {
                adapter.handlePinchPoint(midpoint)
              } else {
                adapter.reset()
                moveAllowed = false
              }

              const showGrabCursor =
                !moveMode &&
                !spinState.active &&
                !pinchActive &&
                !deselectHoldActive &&
                result.hands.length === 1 &&
                Boolean(midpoint)

              if (showGrabCursor && midpoint) {
                const resolved = resolveCandidate(midpoint, candidateFurnitureId, targets)
                const nextFurnitureId = resolved.furnitureId
                const previousFurnitureId = candidateFurnitureId
                candidateFurnitureId = nextFurnitureId

                if (nextFurnitureId) {
                  candidateStableFrames =
                    previousFurnitureId === nextFurnitureId
                      ? candidateStableFrames + 1
                      : 1
                } else {
                  candidateStableFrames = 0
                }

                grabReady = Boolean(nextFurnitureId) && candidateStableFrames >= GRAB_STABLE_FRAMES
                setGestureCursorPoint(midpoint)
                setReady(grabReady ? nextFurnitureId : null)
              } else {
                clearCandidate()
              }
            }
          }
        }
      } catch (error) {
        console.error('[GestureCameraController] detection failed', error)
      }

      rafId = requestAnimationFrame(loop)
    }

    const boot = async () => {
      setCameraStatus(CAMERA_STATUS.LOADING)
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        if (!videoElement) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error('Gesture video element is unavailable.')
        }

        videoElement.srcObject = stream
        await videoElement.play()
        await tracker.start(videoElement)
        setCameraStatus(CAMERA_STATUS.READY)
        rafId = requestAnimationFrame(loop)
      } catch (error) {
        if (disposed) return
        setCameraStatus(
          error?.name === 'NotAllowedError'
            ? CAMERA_STATUS.PERMISSION_DENIED
            : CAMERA_STATUS.ERROR,
        )
        console.error('[GestureCameraController] camera boot failed', error)
      }
    }

    boot()

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      unsubscribeState()
      const stream = videoElement?.srcObject
      if (stream) stream.getTracks().forEach((track) => track.stop())
      tracker.close()
    }
  }, [canvasStateRef, orbitControlsRef])

  const selectedFurnitureId = furnitureWorkspace.selectedFurnitureId

  return (
    <>
      <video ref={videoRef} className="gesture-video" autoPlay muted playsInline />
      <div className="gesture-overlay" aria-hidden="true">
        {gestureCursorPoint && (
          <span
            className="gesture-cursor"
            style={{
              left: `${gestureCursorPoint.x * 100}%`,
              top: `${gestureCursorPoint.y * 100}%`,
            }}
          />
        )}
        {grabTargets.filter((target) => target.visible).map((target) => {
          const ready = target.furnitureId === readyFurnitureId
          const selected = target.furnitureId === selectedFurnitureId
          return (
            <span
              key={target.furnitureId}
              className={[
                'gesture-grab-handle',
                ready ? 'is-ready' : '',
                selected ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: `${target.x * 100}%`,
                top: `${target.y * 100}%`,
              }}
            />
          )
        })}
        {cameraStatus !== CAMERA_STATUS.READY && (
          <div className={`gesture-status gesture-status-${cameraStatus.toLowerCase()}`}>
            {cameraStatus === CAMERA_STATUS.LOADING
              ? 'Camera loading'
              : cameraStatus === CAMERA_STATUS.PERMISSION_DENIED
                ? 'Camera permission denied'
                : 'Camera unavailable'}
          </div>
        )}
        {cameraStatus === CAMERA_STATUS.READY && interactionMode !== 'IDLE' && (
          <div className="gesture-mode-label">{interactionMode}</div>
        )}
      </div>
    </>
  )
}
