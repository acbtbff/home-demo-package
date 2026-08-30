import { Vector2, Vector3 } from 'three'
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js'
import { assertValidInteractionCommand } from '../interaction/InteractionCommand.js'
import {
  createBeginFurnitureInteractionCommand,
  createEndFurnitureInteractionCommand,
  createMoveFurnitureCommand,
  createRotateFurnitureYCommand,
  createSelectFurnitureCommand,
} from '../domain/interactionCommands.js'

const MOVE_SMOOTHING_ALPHA = 0.55
const ROTATION_SMOOTHING_ALPHA = 0.45
const CAMERA_ORBIT_SMOOTHING_ALPHA = 0.65

export class HostGestureBridge {
  constructor({
    getCamera,
    getRaycaster,
    getScene,
    getSelectedFurnitureId,
    getPlacementForFurniture,
    getViewportSize,
    dispatchHostCommand,
    applyCameraOrbit,
    moveSensitivity = 1,
    rotationSensitivity = 1,
    orbitSensitivity = 1,
  } = {}) {
    this.getCamera = getCamera
    this.getRaycaster = getRaycaster
    this.getScene = getScene
    this.getHostSelectedFurnitureId = getSelectedFurnitureId
    this.getPlacementForFurniture = getPlacementForFurniture
    this.getViewportSize = getViewportSize
    this.dispatchHostCommand = dispatchHostCommand
    this.applyCameraOrbit = applyCameraOrbit
    this.moveSensitivity = moveSensitivity
    this.rotationSensitivity = rotationSensitivity
    this.orbitSensitivity = orbitSensitivity

    this.gestureSelectedFurnitureId = null
    this.movePreviousDelta = null
    this.rotationPreviousDelta = null
    this.orbitPreviousDelta = null
  }

  handleCommand(command, context = {}) {
    try {
      assertValidInteractionCommand(command)
    } catch (error) {
      console.warn('[HostGestureBridge] invalid command', command, error)
      return { handled: false }
    }

    switch (command.type) {
      case INTERACTION_COMMANDS.SELECT_FURNITURE: {
        const furnitureId = context.furnitureId || this.raycastFurniture(command.screenPoint)
        if (!furnitureId) return { handled: true, selected: false }

        this.gestureSelectedFurnitureId = furnitureId
        this.resetSmoothing()
        this.dispatch(createSelectFurnitureCommand(furnitureId))
        return { handled: true, selected: true, furnitureId }
      }

      case INTERACTION_COMMANDS.BEGIN_MOVE: {
        const furnitureId = this.getSelectedFurnitureId()
        if (!furnitureId) return { handled: true, selected: false }
        this.resetMoveSmoothing()
        this.dispatch(createBeginFurnitureInteractionCommand(furnitureId))
        return { handled: true, selected: true, furnitureId }
      }

      case INTERACTION_COMMANDS.MOVE_SELECTED: {
        const furnitureId = this.getSelectedFurnitureId()
        if (!furnitureId) return { handled: true, selected: false }

        const delta = this.smoothMove(command.delta)
        const worldDelta = this.mapMoveToWorld(delta)
        this.dispatch(createMoveFurnitureCommand({
          furnitureId,
          deltaX: worldDelta.x,
          deltaZ: worldDelta.z,
        }))
        return { handled: true, selected: true, furnitureId }
      }

      case INTERACTION_COMMANDS.END_MOVE: {
        const furnitureId = this.getSelectedFurnitureId()
        if (!furnitureId) return { handled: true, selected: false }
        this.dispatch(createEndFurnitureInteractionCommand(furnitureId))
        this.resetMoveSmoothing()
        return { handled: true, selected: true, furnitureId }
      }

      case INTERACTION_COMMANDS.ROTATE_SELECTED: {
        const furnitureId = this.getSelectedFurnitureId()
        if (!furnitureId) return { handled: true, selected: false }
        const deltaRadians = this.smoothRotation(command.deltaRotation)
        this.dispatch(createRotateFurnitureYCommand({
          furnitureId,
          deltaRadians,
        }))
        return { handled: true, selected: true, furnitureId }
      }

      case INTERACTION_COMMANDS.CAMERA_ORBIT: {
        const deltaOrbit = this.smoothOrbit(command.deltaOrbit)
        this.applyCameraOrbit?.(deltaOrbit)
        return { handled: true, selected: true }
      }

      case INTERACTION_COMMANDS.DESELECT_FURNITURE: {
        this.gestureSelectedFurnitureId = null
        this.resetSmoothing()
        this.dispatch(createSelectFurnitureCommand(null))
        return { handled: true, selected: false }
      }

      default:
        return { handled: false }
    }
  }

  getSelectedFurnitureId() {
    return this.gestureSelectedFurnitureId ?? this.getHostSelectedFurnitureId?.()
  }

  getSelectedPlacement() {
    const furnitureId = this.getSelectedFurnitureId()
    if (!furnitureId || typeof this.getPlacementForFurniture !== 'function') return null
    return this.getPlacementForFurniture(furnitureId) ?? null
  }

  raycastFurniture(screenPoint) {
    if (!screenPoint || !Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) return null

    const camera = this.getCamera?.()
    const raycaster = this.getRaycaster?.()
    const scene = this.getScene?.()
    if (!camera || !raycaster || !scene) return null

    const ndcX = screenPoint.x * 2 - 1
    const ndcY = 1 - screenPoint.y * 2
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera)

    const hitboxes = []
    scene.traverse((object) => {
      if (object.isMesh && object.userData?.hitbox && object.userData?.furnitureId) {
        hitboxes.push(object)
      }
    })

    const hits = raycaster.intersectObjects(hitboxes, false)
    hits.sort((a, b) => a.distance - b.distance)
    return hits[0]?.object.userData.furnitureId ?? null
  }

  mapMoveToWorld(delta) {
    const camera = this.getCamera?.()
    if (!camera) {
      return { x: delta.x * this.moveSensitivity, z: delta.y * this.moveSensitivity }
    }

    const placement = this.getSelectedPlacement()
    const target = placement?.position
      ? new Vector3(placement.position.x, placement.position.y, placement.position.z)
      : new Vector3(0, 0, 0)
    const toTarget = target.clone().sub(camera.position)
    const distance = Math.max(0.001, toTarget.length())
    const viewport = this.getViewportSize?.() ?? { width: 1, height: 1 }
    const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0
      ? camera.aspect
      : (viewport.width / Math.max(1, viewport.height))
    const verticalFov = camera.fov * Math.PI / 180
    const worldHeight = 2 * distance * Math.tan(verticalFov / 2)
    const worldWidth = worldHeight * aspect

    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    right.y = 0
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
    right.normalize()

    const forward = new Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1)
    forward.normalize()

    const moveRight = right.clone().multiplyScalar(delta.x * worldWidth)
    const moveForward = forward.clone().multiplyScalar(-delta.y * worldHeight)
    const worldDelta = moveRight.add(moveForward)

    return {
      x: worldDelta.x * this.moveSensitivity,
      z: worldDelta.z * this.moveSensitivity,
    }
  }

  smoothMove(delta) {
    const raw = {
      x: Number.isFinite(delta?.x) ? delta.x : 0,
      y: Number.isFinite(delta?.y) ? delta.y : 0,
    }
    const previous = this.movePreviousDelta
    const smoothed = previous
      ? {
          x: MOVE_SMOOTHING_ALPHA * raw.x + (1 - MOVE_SMOOTHING_ALPHA) * previous.x,
          y: MOVE_SMOOTHING_ALPHA * raw.y + (1 - MOVE_SMOOTHING_ALPHA) * previous.y,
        }
      : { ...raw }
    this.movePreviousDelta = { ...smoothed }
    return smoothed
  }

  smoothRotation(deltaRadians) {
    const raw = Number.isFinite(deltaRadians) ? deltaRadians : 0
    const previous = this.rotationPreviousDelta
    const smoothed = previous === null
      ? raw
      : ROTATION_SMOOTHING_ALPHA * raw + (1 - ROTATION_SMOOTHING_ALPHA) * previous
    this.rotationPreviousDelta = smoothed
    return smoothed * this.rotationSensitivity
  }

  smoothOrbit(deltaOrbit) {
    const raw = Number.isFinite(deltaOrbit) ? deltaOrbit : 0
    const previous = this.orbitPreviousDelta
    const smoothed = previous === null
      ? raw
      : CAMERA_ORBIT_SMOOTHING_ALPHA * raw + (1 - CAMERA_ORBIT_SMOOTHING_ALPHA) * previous
    this.orbitPreviousDelta = smoothed
    return smoothed * this.orbitSensitivity
  }

  resetSmoothing() {
    this.resetMoveSmoothing()
    this.resetRotationSmoothing()
    this.resetOrbitSmoothing()
  }

  resetMoveSmoothing() {
    this.movePreviousDelta = null
  }

  resetRotationSmoothing() {
    this.rotationPreviousDelta = null
  }

  resetOrbitSmoothing() {
    this.orbitPreviousDelta = null
  }

  dispatch(command) {
    if (typeof this.dispatchHostCommand === 'function') {
      this.dispatchHostCommand(command)
    }
  }
}
