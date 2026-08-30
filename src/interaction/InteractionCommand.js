import { INTERACTION_COMMANDS } from './InteractionCommandTypes.js'

const knownTypes = new Set(Object.values(INTERACTION_COMMANDS))

export function createInteractionCommand(type, payload = {}) {
  const command = { type, ...payload }
  assertValidInteractionCommand(command)
  return command
}

export function assertValidInteractionCommand(command) {
  if (!command || !knownTypes.has(command.type)) throw new TypeError('Unknown gesture interaction command.')
  return command
}
