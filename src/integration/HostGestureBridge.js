import {
  createBeginFurnitureInteractionCommand,
  createEndFurnitureInteractionCommand,
  createMoveFurnitureCommand,
  createRotateFurnitureYCommand,
  createSelectFurnitureCommand,
} from '../domain/interactionCommands.js'
import { assertValidInteractionCommand } from '../interaction/InteractionCommand.js'
import { INTERACTION_COMMANDS } from '../interaction/InteractionCommandTypes.js'

const finite = (value) => Number.isFinite(value) ? value : 0

export class HostGestureBridge {
  constructor({ getSelectedFurnitureId, dispatchHostCommand, mapMoveToWorld, applyCameraOrbit, onManipulationChange } = {}) {
    this.getSelectedFurnitureId = getSelectedFurnitureId
    this.dispatchHostCommand = dispatchHostCommand
    this.mapMoveToWorld = mapMoveToWorld ?? ((delta) => ({ x: finite(delta?.x), z: finite(delta?.y) }))
    this.applyCameraOrbit = applyCameraOrbit
    this.onManipulationChange = onManipulationChange
    this.moving = false
  }

  handleCommand(command, context = {}) {
    assertValidInteractionCommand(command)
    if (command.type === INTERACTION_COMMANDS.SELECT_FURNITURE) {
      const furnitureId = context.furnitureId ?? null
      if (!furnitureId) return { handled: true, selected: false }
      this.dispatch(createSelectFurnitureCommand(furnitureId))
      return { handled: true, selected: true, furnitureId }
    }
    if (command.type === INTERACTION_COMMANDS.DESELECT_FURNITURE) {
      this.finishMove()
      this.dispatch(createSelectFurnitureCommand(null))
      return { handled: true, selected: false }
    }

    const furnitureId = context.furnitureId ?? this.getSelectedFurnitureId?.() ?? null
    if (command.type === INTERACTION_COMMANDS.BEGIN_MOVE) {
      if (!furnitureId) return { handled: true, selected: false }
      this.moving = true
      this.onManipulationChange?.(true)
      this.dispatch(createBeginFurnitureInteractionCommand(furnitureId))
      return { handled: true, selected: true, furnitureId }
    }
    if (command.type === INTERACTION_COMMANDS.MOVE_SELECTED) {
      if (!furnitureId || !this.moving) return { handled: true, selected: false }
      const delta = this.mapMoveToWorld(command.delta)
      this.dispatch(createMoveFurnitureCommand({ furnitureId, deltaX: finite(delta?.x), deltaZ: finite(delta?.z) }))
      return { handled: true, selected: true, furnitureId }
    }
    if (command.type === INTERACTION_COMMANDS.END_MOVE) {
      if (furnitureId && this.moving) this.dispatch(createEndFurnitureInteractionCommand(furnitureId))
      this.finishMove()
      return { handled: true, selected: Boolean(furnitureId), furnitureId }
    }
    if (command.type === INTERACTION_COMMANDS.ROTATE_SELECTED) {
      if (!furnitureId || this.moving) return { handled: true, selected: false }
      this.dispatch(createRotateFurnitureYCommand({ furnitureId, deltaRadians: finite(command.deltaRotation) }))
      return { handled: true, selected: true, furnitureId }
    }
    if (command.type === INTERACTION_COMMANDS.CAMERA_ORBIT) {
      if (!this.moving) this.applyCameraOrbit?.(finite(command.deltaOrbit))
      return { handled: true, selected: Boolean(furnitureId) }
    }
    return { handled: false }
  }

  finishMove() {
    if (!this.moving) return
    this.moving = false
    this.onManipulationChange?.(false)
  }

  dispose() { this.finishMove() }
  dispatch(command) { this.dispatchHostCommand?.(command) }
}
