import demoFloorplanDraft from '../../fixtures/floorplan/demo-floorplan-draft.json'
import { assertValidFloorplanImageDraft } from '../domain/floorplanImageDraft.js'
import { FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA, FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT } from './floorplanImagePrompt.js'

const DEMO_FIXTURE_SHA256 = '157a2b3277a6cc52868fbbd6cef9279b706a3998c383baf32f7c39281203a639'
const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ACCEPTED_TYPES = new Set([...RASTER_TYPES, 'image/svg+xml'])

export const FLOORPLAN_ANALYSIS_MODE = import.meta.env.VITE_FLOORPLAN_VISION_MODE === 'real'
  ? 'REAL_FLOORPLAN_VISION'
  : 'FIXTURE_ONLY'

export class FloorplanImageParserError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'FloorplanImageParserError'
    this.code = code
  }
}

async function sha256(file) {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function toDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
  }
  return `data:${file.type};base64,${btoa(binary)}`
}

function validateFile(image) {
  if (!(image instanceof File)) throw new FloorplanImageParserError('NO_IMAGE', '请先选择一张户型图图片。')
  if (!ACCEPTED_TYPES.has(image.type)) throw new FloorplanImageParserError('UNSUPPORTED_TYPE', '支持 JPG、PNG、WebP、GIF 和 SVG 户型图。')
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) throw new FloorplanImageParserError('INVALID_SIZE', '图片必须小于 15 MB。')
}

async function parseWithVision(image) {
  if (!RASTER_TYPES.has(image.type)) {
    throw new FloorplanImageParserError('VISION_TYPE_UNSUPPORTED', '真实视觉解析仅接收 JPG、PNG、WebP 或 GIF；SVG 只用于内置示例。')
  }
  const response = await fetch('/api/analyze-floorplan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      images: [{ dataUrl: await toDataUrl(image), type: image.type }],
      prompt: FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT,
      responseSchema: FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA,
    }),
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new FloorplanImageParserError('VISION_FAILED', failure?.error || `户型图视觉服务不可用（${response.status}）。`)
  }
  return response.json()
}

export async function parseFloorplanImage({ image }) {
  validateFile(image)
  const imageFingerprint = await sha256(image)

  if (imageFingerprint === DEMO_FIXTURE_SHA256) {
    return assertValidFloorplanImageDraft(structuredClone({
      ...demoFloorplanDraft,
      source: { ...demoFloorplanDraft.source, imageFingerprint },
    }))
  }

  if (FLOORPLAN_ANALYSIS_MODE !== 'REAL_FLOORPLAN_VISION') {
    throw new FloorplanImageParserError(
      'FIXTURE_NOT_FOUND',
      '这是解析模式限制，不是图片损坏：当前本地演示模式只识别内置示例户型图。要识别自己的 JPG/PNG 户型图，请配置 OPENAI_API_KEY，启动 pnpm vision:server，并使用 VITE_FLOORPLAN_VISION_MODE=real；系统不会用假结果替代识别。',
    )
  }

  const draft = await parseWithVision(image)
  return assertValidFloorplanImageDraft({
    ...draft,
    source: { ...draft.source, imageFingerprint },
  })
}

export { FLOORPLAN_IMAGE_DRAFT_JSON_SCHEMA, FLOORPLAN_IMAGE_VISION_SYSTEM_PROMPT }
