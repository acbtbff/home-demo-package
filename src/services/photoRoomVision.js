import sampleDraft from '../../fixtures/photo-room/sample-draft.json'
import { PHOTO_ROOM_DRAFT_JSON_SCHEMA, PHOTO_ROOM_VISION_SYSTEM_PROMPT } from './photoRoomPrompt.js'

export const PHOTO_ANALYSIS_MODE = import.meta.env.VITE_PHOTO_VISION_MODE === 'real' ? 'REAL_PHOTO_VISION' : 'MOCK_PHOTO_ANALYSIS'

/** Replace this service with a backend call when a Vision provider is configured. */
async function analyzeMock({ images = [], scaleAnchor }) {
  await new Promise((resolve) => setTimeout(resolve, 450))
  return structuredClone({
    ...sampleDraft,
    source: { ...sampleDraft.source, imageCount: images.length, provider: 'mock-photo-vision' },
    scaleAnchor,
  })
}

async function analyzeReal({ images = [], scaleAnchor }) {
  const imagePayload = await Promise.all(images.map(async (image, index) => {
    try {
      const bytes = new Uint8Array(await image.arrayBuffer())
      let binary = ''
      const chunkSize = 0x8000
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
      }
      return { dataUrl: `data:${image.type || 'image/jpeg'};base64,${btoa(binary)}`, type: image.type || 'image/jpeg' }
    } catch {
      throw new Error(`无法读取第 ${index + 1} 张照片内容`)
    }
  }))
  const response = await fetch('/api/analyze-room', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ images: imagePayload, scaleAnchor, prompt: PHOTO_ROOM_VISION_SYSTEM_PROMPT, responseSchema: PHOTO_ROOM_DRAFT_JSON_SCHEMA }),
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.error || `Vision backend unavailable (${response.status})`)
  }
  const draft = await response.json()
  if (draft?.schemaVersion !== 1) throw new Error('Vision backend returned an invalid PhotoRoomDraft')
  return draft
}

export async function analyzeRoomPhotos(payload) {
  if (PHOTO_ANALYSIS_MODE === 'REAL_PHOTO_VISION') return analyzeReal(payload)
  return analyzeMock(payload)
}

export { PHOTO_ROOM_DRAFT_JSON_SCHEMA, PHOTO_ROOM_VISION_SYSTEM_PROMPT }
