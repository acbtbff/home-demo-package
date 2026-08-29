import { useEffect, useMemo, useRef, useState } from 'react'
import { floorplanImageDraftToRoomDocument, getCalibrationReferencePixels } from '../../adapters/floorplanImageAdapter.js'
import { FLOORPLAN_ANALYSIS_MODE, parseFloorplanImage } from '../../services/floorplanImageParser.js'
import './FloorPlanImport.css'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

function FileSummary({ file }) {
  if (!file) return null
  return <span>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
}

export default function FloorPlanImport({ currentDocument, onComplete, onUseExisting }) {
  const inputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [draft, setDraft] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [error, setError] = useState('')
  const [calibrationType, setCalibrationType] = useState('overall-width')
  const [referenceWallId, setReferenceWallId] = useState('')
  const [knownLength, setKnownLength] = useState('')
  const [wallHeight, setWallHeight] = useState(String(currentDocument.room.defaults.wallHeight ?? 2.8))

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const setFile = (file) => {
    if (!file) return
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setDraft(null)
    setError('')
    setKnownLength('')
  }

  const loadDemo = async () => {
    setIsLoadingDemo(true)
    setError('')
    try {
      const response = await fetch('/fixtures/floorplan-demo.svg')
      if (!response.ok) throw new Error('无法加载内置示例户型图。')
      const blob = await response.blob()
      setFile(new File([blob], 'floorplan-demo.svg', { type: 'image/svg+xml' }))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoadingDemo(false)
    }
  }

  const parseImage = async () => {
    if (!imageFile) return
    setIsParsing(true)
    setError('')
    try {
      const nextDraft = await parseFloorplanImage({ image: imageFile })
      setDraft(nextDraft)
      const firstExteriorWall = nextDraft.walls.find((wall) => wall.kind === 'exterior') ?? nextDraft.walls[0]
      setReferenceWallId(firstExteriorWall?.id ?? '')
    } catch (parseError) {
      setDraft(null)
      setError(parseError.message || '户型图解析失败。')
    } finally {
      setIsParsing(false)
    }
  }

  const calibration = useMemo(() => ({
    type: calibrationType,
    wallId: calibrationType === 'wall' ? referenceWallId : null,
    valueMeters: Number(knownLength),
  }), [calibrationType, knownLength, referenceWallId])

  const referencePixels = useMemo(() => {
    if (!draft) return 0
    try {
      return getCalibrationReferencePixels(draft, calibration)
    } catch {
      return 0
    }
  }, [calibration, draft])

  const finishImport = () => {
    setError('')
    try {
      const document = floorplanImageDraftToRoomDocument(draft, calibration, { wallHeight: Number(wallHeight) })
      onComplete(document, {
        provider: draft.source.provider,
        confidence: draft.source.confidence,
        pixelsPerMeter: referencePixels / Number(knownLength),
        calibrationType,
        wallCount: draft.walls.length,
        openingCount: draft.doors.length + draft.windows.length,
      })
    } catch (conversionError) {
      setError(conversionError.message || '无法生成 RoomDocument。')
    }
  }

  const knownLengthNumber = Number(knownLength)
  const wallHeightNumber = Number(wallHeight)
  const canFinish = draft && knownLength !== '' && Number.isFinite(knownLengthNumber) && knownLengthNumber > 0
    && Number.isFinite(wallHeightNumber) && wallHeightNumber >= 2.2 && wallHeightNumber <= 4

  return (
    <main className="floorplan-import-shell">
      <header className="floorplan-import-header">
        <div>
          <strong>通过户型图创建数字房间</strong>
          <span>上传图片 → 提取墙体与门窗 → 校准尺寸 → 进入可编辑 2D 户型</span>
        </div>
        <button onClick={onUseExisting}>直接编辑当前户型</button>
      </header>

      <section className="floorplan-import-content">
        <div className="floorplan-import-card">
          <div>
            <span className="import-step">步骤 1</span>
            <h1>上传户型图</h1>
            <p>支持 JPG、PNG、WebP、GIF、SVG；图片只用于解析，不会作为编辑器背景冒充几何。</p>
          </div>

          <input ref={inputRef} className="visually-hidden" type="file" accept={ACCEPT} onChange={(event) => setFile(event.target.files?.[0])} />
          <button
            className={`floorplan-dropzone ${imageFile ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); setFile(event.dataTransfer.files?.[0]) }}
          >
            <strong>{imageFile ? '更换户型图' : '选择或拖入户型图'}</strong>
            <FileSummary file={imageFile} />
          </button>

          <div className="import-button-row">
            <button onClick={loadDemo} disabled={isLoadingDemo}>{isLoadingDemo ? '正在加载…' : '使用内置示例户型图'}</button>
            <button className="primary" onClick={parseImage} disabled={!imageFile || isParsing}>{isParsing ? '正在解析…' : '生成可编辑户型'}</button>
          </div>
          <p className="parser-mode-note">
            {FLOORPLAN_ANALYSIS_MODE === 'REAL_FLOORPLAN_VISION'
              ? '当前已启用真实视觉解析；内置示例仍优先走确定性 fixture。'
              : '当前为本地演示模式：内置示例可确定性解析；普通图片上传成功后仍需启用真实视觉服务才能识别。'}
          </p>

          {draft && (
            <section className="calibration-card">
              <span className="import-step">步骤 2</span>
              <h2>确认尺寸并校准比例</h2>
              <p>解析得到的是图片像素几何。请输入图纸上一个可靠的真实长度，再转换为米制 RoomDocument。</p>
              <div className="draft-summary">
                <span><strong>{draft.walls.filter((wall) => wall.kind === 'exterior').length}</strong> 外墙</span>
                <span><strong>{draft.walls.filter((wall) => wall.kind === 'partition').length}</strong> 内墙</span>
                <span><strong>{draft.doors.length}</strong> 门</span>
                <span><strong>{draft.windows.length}</strong> 窗</span>
                <span><strong>{Math.round((draft.source.confidence ?? 0) * 100)}%</strong> 解析置信度</span>
              </div>

              <label className="import-field">
                <span>校准依据</span>
                <select value={calibrationType} onChange={(event) => setCalibrationType(event.target.value)}>
                  <option value="overall-width">整体宽度</option>
                  <option value="overall-height">整体进深</option>
                  <option value="wall">某面已知墙长</option>
                </select>
              </label>
              {calibrationType === 'wall' && (
                <label className="import-field">
                  <span>参考墙</span>
                  <select value={referenceWallId} onChange={(event) => setReferenceWallId(event.target.value)}>
                    {draft.walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.id} · {wall.kind === 'exterior' ? '外墙' : '内墙'}</option>)}
                  </select>
                </label>
              )}
              <label className="import-field">
                <span>已知真实长度</span>
                <span className="import-input-unit"><input type="number" min="0.1" max="100" step="0.01" value={knownLength} placeholder="例如 9.6" onChange={(event) => setKnownLength(event.target.value)} /><small>m</small></span>
              </label>
              <label className="import-field">
                <span>层高</span>
                <span className="import-input-unit"><input type="number" min="2.2" max="4" step="0.05" value={wallHeight} onChange={(event) => setWallHeight(event.target.value)} /><small>m</small></span>
              </label>
              <div className="calibration-result">
                <span>参考像素长度</span>
                <strong>{referencePixels.toFixed(1)} px</strong>
                <span>换算比例</span>
                <strong>{knownLengthNumber > 0 ? `${(referencePixels / knownLengthNumber).toFixed(2)} px/m` : '等待输入'}</strong>
              </div>
              <button className="primary import-finish" onClick={finishImport} disabled={!canFinish}>按此比例生成并进入 2D 编辑</button>
            </section>
          )}

          {error && <div className="floorplan-import-error" role="alert">{error}</div>}
        </div>

        <aside className="floorplan-preview-card">
          {previewUrl
            ? <img src={previewUrl} alt="已上传户型图预览" />
            : <div className="preview-placeholder"><strong>图片预览</strong><span>选择户型图后在这里确认文件</span></div>}
          <div className="preview-caption">
            <strong>{draft ? '结构已提取，等待尺寸校准' : imageFile ? '图片已就绪' : '尚未选择图片'}</strong>
            <span>{draft ? `像素边界 ${draft.bounds.maxX - draft.bounds.minX} × ${draft.bounds.maxY - draft.bounds.minY}` : '内置示例标有 9.6m × 6.0m，可用于完整演示。'}</span>
          </div>
        </aside>
      </section>
    </main>
  )
}
