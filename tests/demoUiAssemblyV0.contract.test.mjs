import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = async (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('demo room assembly keeps the real room runtime and user-facing context flow', async () => {
  const roomPage = await source('../src/pages/RoomPage.jsx')
  const inspector = await source('../src/components/furniture/FurnitureInspector.jsx')
  const layout = await source('../src/components/layout/AppLayout.jsx')
  assert.match(roomPage, /<Canvas\b/)
  assert.match(roomPage, /selectedFurniture/)
  assert.match(roomPage, /createSelectFurnitureCommand\(null\)/)
  assert.match(inspector, /getFurnitureRelationLabel/)
  assert.match(inspector, /getSpatialStatusLabel/)
  assert.match(layout, /MYROOMIE/)
  assert.match(layout, /to="\/room"[^>]*>我的小屋/)
  for (const fakeCopy of ['空间利用率 85', '★★★★', 'AI建议：带走', 'furnitureItems.length || 18']) {
    assert.doesNotMatch(roomPage, new RegExp(fakeCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
