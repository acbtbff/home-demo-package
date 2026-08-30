import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { HostGestureBridge } from '../src/integration/HostGestureBridge.js'
import { createInteractionCommand } from '../src/interaction/InteractionCommand.js'
import { INTERACTION_COMMANDS } from '../src/interaction/InteractionCommandTypes.js'
import { FURNITURE_COMMAND_TYPES } from '../src/domain/interactionCommands.js'

const root = process.cwd()
const read = (path) => readFile(join(root, path), 'utf8')

test('gesture bridge delegates selection, movement, and rotation to formal product commands', () => {
  const dispatched = []
  let selectedFurnitureId = 'chair-1'
  const bridge = new HostGestureBridge({
    getSelectedFurnitureId: () => selectedFurnitureId,
    dispatchHostCommand: (command) => dispatched.push(command),
    mapMoveToWorld: () => ({ x: 0.25, z: -0.4 }),
  })

  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.BEGIN_MOVE))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.MOVE_SELECTED, { delta: { x: 1, y: 1 } }))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.END_MOVE))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.ROTATE_SELECTED, { deltaRotation: 0.2 }))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.DESELECT_FURNITURE))

  assert.deepEqual(dispatched.map((command) => command.type), [
    FURNITURE_COMMAND_TYPES.BEGIN_FURNITURE_INTERACTION,
    FURNITURE_COMMAND_TYPES.MOVE_FURNITURE,
    FURNITURE_COMMAND_TYPES.END_FURNITURE_INTERACTION,
    FURNITURE_COMMAND_TYPES.ROTATE_FURNITURE_Y,
    FURNITURE_COMMAND_TYPES.SELECT_FURNITURE,
  ])
  assert.deepEqual(dispatched[1], { type: FURNITURE_COMMAND_TYPES.MOVE_FURNITURE, furnitureId: 'chair-1', deltaX: 0.25, deltaZ: -0.4 })
  assert.equal(dispatched[3].deltaRadians, 0.2)
  assert.equal('deltaY' in dispatched[1], false)
  assert.equal('rotationX' in dispatched[3], false)
  assert.equal('rotationZ' in dispatched[3], false)
})

test('furniture manipulation wins arbitration over camera orbit', () => {
  let orbitCalls = 0
  const bridge = new HostGestureBridge({
    getSelectedFurnitureId: () => 'desk-1',
    dispatchHostCommand: () => {},
    applyCameraOrbit: () => { orbitCalls += 1 },
  })
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.BEGIN_MOVE))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.CAMERA_ORBIT, { deltaOrbit: 0.2 }))
  assert.equal(orbitCalls, 0)
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.END_MOVE))
  bridge.handleCommand(createInteractionCommand(INTERACTION_COMMANDS.CAMERA_ORBIT, { deltaOrbit: 0.2 }))
  assert.equal(orbitCalls, 1)
})

test('gesture is opt-in, local-only, and degrades without breaking the room', async () => {
  const room = await read('src/pages/RoomPage.jsx')
  const controller = await read('src/integration/GestureCameraController.jsx')
  assert.match(room, /gestureEnabled && <GestureCameraController/)
  assert.match(room, /摄像头画面仅用于本地手势识别，不会上传/)
  assert.match(controller, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(controller, /未获得摄像头权限，可继续使用鼠标操作/)
  assert.match(controller, /getTracks\(\)\.forEach/)
  assert.doesNotMatch(controller, /fetch\(|XMLHttpRequest|localStorage|MediaRecorder/)
})

test('gesture adds no furniture state, scaling, Agent calls, API keys, or persistent mesh mutation', async () => {
  const files = [
    'src/integration/HostGestureBridge.js',
    'src/integration/GestureCameraController.jsx',
    'src/gesture/GestureInputAdapter.js',
  ]
  const source = (await Promise.all(files.map(read))).join('\n')
  assert.doesNotMatch(source, /gestureSelectedFurniture|furnitureList|createFurnitureWorkspaceState/)
  assert.doesNotMatch(source, /scaleFurniture|dimensionsM\s*=|mesh\.position|\.scale\./)
  assert.doesNotMatch(source, /agent-reason|AgentProvider|OPENAI_API_KEY|sk-[A-Za-z0-9]/)
})

test('MediaPipe production resources are HTTPS and product routes remain present', async () => {
  const tracker = await read('src/gesture/HandTracker.js')
  const app = await read('src/App.jsx')
  assert.match(tracker, /https:\/\/cdn\.jsdelivr\.net/)
  assert.match(tracker, /@mediapipe\/tasks-vision@0\.10\.17\/wasm/)
  assert.match(tracker, /https:\/\/storage\.googleapis\.com/)
  for (const route of ['/room', '/furniture', '/floorplan']) assert.ok(app.includes(route), `missing ${route}`)
})
