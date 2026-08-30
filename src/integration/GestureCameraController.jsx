import { useEffect, useRef } from 'react'
import { Spherical, Vector3 } from 'three'
import { GestureInputAdapter } from '../gesture/GestureInputAdapter.js'
import { GestureRecognizer } from '../gesture/GestureRecognizer.js'
import { GESTURE_STATE } from '../gesture/GestureState.js'
import { HandTracker } from '../gesture/HandTracker.js'
import { IndexSpinRecognizer } from '../gesture/IndexSpinRecognizer.js'
import { OpenPalmRecognizer } from '../gesture/OpenPalmRecognizer.js'
import { OpenPalmToDeselectAdapter } from '../gesture/OpenPalmToDeselectAdapter.js'
import { SpinToRotationAdapter } from '../gesture/SpinToRotationAdapter.js'
import { TwoHandOrbitRecognizer, TWO_HAND_MODE } from '../gesture/TwoHandOrbitRecognizer.js'
import { TwoHandToOrbitAdapter } from '../gesture/TwoHandToOrbitAdapter.js'
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js'
import { HostGestureBridge } from './HostGestureBridge.js'

const TARGET_RADIUS = 0.14

const pinchMidpoint = (frame) => {
  const points = frame?.hands?.[0]?.landmarks
  if (!points || points.length < 21) return null
  return { x: (points[4].x + points[8].x) / 2, y: (points[4].y + points[8].y) / 2 }
}

export default function GestureCameraController({ furnitureWorkspace, canvasStateRef, orbitControlsRef, onStatus, onManipulationChange }) {
  const videoRef = useRef(null)
  const workspaceRef = useRef(furnitureWorkspace)

  useEffect(() => { workspaceRef.current = furnitureWorkspace }, [furnitureWorkspace])

  useEffect(() => {
    const video = videoRef.current
    let disposed = false
    let animationFrame = 0
    let stream = null
    let tracker = null
    let activeFurnitureId = null
    let lastStatus = ''

    const setStatus = (value) => {
      if (lastStatus === value || disposed) return
      lastStatus = value
      onStatus?.(value)
    }
    const canvas = () => canvasStateRef.current
    const selectedId = () => workspaceRef.current.selectedFurnitureId
    const selectedPlacement = () => Object.values(workspaceRef.current.effectivePlacementsById)
      .find((item) => item.furnitureId === (activeFurnitureId ?? selectedId())) ?? null

    const mapMoveToWorld = (delta) => {
      const camera = canvas()?.camera
      if (!camera) return { x: delta?.x ?? 0, z: delta?.y ?? 0 }
      const placement = selectedPlacement()
      const target = new Vector3(placement?.position?.x ?? 0, placement?.position?.y ?? 0, placement?.position?.z ?? 0)
      const distance = Math.max(0.001, target.distanceTo(camera.position))
      const worldHeight = 2 * distance * Math.tan(camera.fov * Math.PI / 360)
      const worldWidth = worldHeight * (camera.aspect || 1)
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize()
      const forward = new Vector3()
      camera.getWorldDirection(forward)
      forward.setY(0).normalize()
      const movement = right.multiplyScalar((delta?.x ?? 0) * worldWidth)
        .add(forward.multiplyScalar(-(delta?.y ?? 0) * worldHeight))
      return { x: movement.x, z: movement.z }
    }

    const applyCameraOrbit = (delta) => {
      const camera = canvas()?.camera
      const controls = orbitControlsRef.current
      if (!camera || !controls) return
      const offset = camera.position.clone().sub(controls.target)
      const spherical = new Spherical().setFromVector3(offset)
      spherical.theta -= delta
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      camera.lookAt(controls.target)
      controls.update()
    }

    const nearestFurniture = (point) => {
      const camera = canvas()?.camera
      if (!camera || !point) return selectedId()
      let nearest = null
      for (const furniture of workspaceRef.current.furnitureItems) {
        const placement = Object.values(workspaceRef.current.effectivePlacementsById)
          .find((item) => item.furnitureId === furniture.id)
        if (!placement) continue
        const projected = new Vector3(
          placement.position.x,
          placement.position.y + (furniture.physical?.dimensionsM?.height ?? 0) * 0.5,
          placement.position.z,
        ).project(camera)
        const distance = Math.hypot((projected.x + 1) / 2 - point.x, (1 - projected.y) / 2 - point.y)
        if (projected.z > -1 && projected.z < 1 && (!nearest || distance < nearest.distance)) nearest = { id: furniture.id, distance }
      }
      return nearest?.distance <= TARGET_RADIUS ? nearest.id : selectedId()
    }

    const bridge = new HostGestureBridge({
      getSelectedFurnitureId: selectedId,
      dispatchHostCommand: (command) => workspaceRef.current.dispatchInteractionCommand(command),
      mapMoveToWorld,
      applyCameraOrbit,
      onManipulationChange,
    })
    const recognizer = new GestureRecognizer()
    const spinRecognizer = new IndexSpinRecognizer()
    const orbitRecognizer = new TwoHandOrbitRecognizer()
    const palmRecognizer = new OpenPalmRecognizer()
    const spinAdapter = new SpinToRotationAdapter({ onCommand: (command) => bridge.handleCommand(command) })
    const orbitAdapter = new TwoHandToOrbitAdapter({ onCommand: (command) => bridge.handleCommand(command) })
    const palmAdapter = new OpenPalmToDeselectAdapter({ onCommand: (command) => bridge.handleCommand(command) })
    const inputAdapter = new GestureInputAdapter({
      mirrorVideo: false,
      onCommand: (command) => {
        if (command.type === INTERACTION_COMMANDS.SELECT_FURNITURE) {
          activeFurnitureId = nearestFurniture(command.screenPoint)
          const result = bridge.handleCommand(command, { furnitureId: activeFurnitureId })
          setStatus(result.selected ? '识别到：移动家具' : '未找到可选择的家具')
          return
        }
        bridge.handleCommand(command, { furnitureId: activeFurnitureId })
        if (command.type === INTERACTION_COMMANDS.END_MOVE) activeFurnitureId = null
      },
    })
    const unsubscribe = recognizer.onStateChange((state) => {
      if ([GESTURE_STATE.PINCH_START, GESTURE_STATE.PINCH_HOLD, GESTURE_STATE.PINCH_END].includes(state)) {
        inputAdapter.handleGestureEvent({ type: state })
      }
    })

    const loop = () => {
      if (disposed) return
      try {
        const frame = tracker.detectForVideo(performance.now())
        if (frame) {
          if (frame.hands.length === 0) setStatus('未检测到手部')
          const orbit = orbitRecognizer.process(frame)
          if (orbit.mode === TWO_HAND_MODE.TWO_HAND && !bridge.moving) {
            activeFurnitureId = null
            orbitAdapter.handleOrbitState(orbit)
            setStatus('识别到：旋转视角')
          } else {
            const measurement = recognizer.process(frame)
            const point = pinchMidpoint(frame)
            if (point) inputAdapter.handlePinchPoint(point)
            if (!measurement.isPinching) {
              const spin = spinRecognizer.process(frame, { pinching: false })
              const rotation = spinAdapter.handleSpinState(spin)
              if (rotation) setStatus('识别到：旋转家具')
              const palm = palmRecognizer.process(frame, { allow: !spin.active })
              if (palmRecognizer.consumeFire()) {
                palmAdapter.handleOpenPalmState(palm)
                setStatus('识别到：取消选择')
              }
            } else {
              spinRecognizer.reset()
              palmRecognizer.reset()
            }
          }
        }
      } catch (error) {
        console.warn('[GestureCameraController] frame skipped', error)
      }
      animationFrame = requestAnimationFrame(loop)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNAVAILABLE')
      setStatus('正在启动手势控制…')
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (disposed) return
      video.srcObject = stream
      await video.play()
      tracker = new HandTracker({ numHands: 2 })
      await tracker.start(video)
      if (disposed) return
      setStatus('手势控制：已开启')
      animationFrame = requestAnimationFrame(loop)
    }

    start().catch((error) => {
      console.warn('[GestureCameraController] unavailable', error)
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
      setStatus(denied ? '未获得摄像头权限，可继续使用鼠标操作。' : '手势控制暂不可用，可继续使用鼠标操作。')
    })

    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      unsubscribe()
      inputAdapter.reset()
      bridge.dispose()
      tracker?.close()
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
      onManipulationChange?.(false)
    }
  }, [canvasStateRef, onManipulationChange, onStatus, orbitControlsRef])

  return <video ref={videoRef} className="gesture-camera-source" muted playsInline aria-hidden="true" />
}
