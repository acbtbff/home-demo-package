import { useEffect, useRef, useState } from 'react'
import { analyzeRoomPhotos, PHOTO_ANALYSIS_MODE } from '../services/photoRoomVision.js'
import { adaptPhotoRoomDraft } from '../adapters/photoRoomAdapter.js'
import { createPhotoRealityTestRecord } from '../domain/photoRealityMetrics.js'
import './PhotoRoomCapture.css'

function PhotoRoomCapture({ onCancel, onDraftReady }) {
  const [photos, setPhotos] = useState([])
  const [anchorValue, setAnchorValue] = useState('3.6')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [resultSummary, setResultSummary] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)
  const resultSummaryRef = useRef(null)

  useEffect(() => {
    if (resultSummary) resultSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [resultSummary])

  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.url)), [photos])

  const addPhotos = (event) => {
    const next = [...event.target.files].slice(0, 8 - photos.length).map((file) => ({ file, url: URL.createObjectURL(file), name: file.name }))
    setPhotos((current) => [...current, ...next])
    event.target.value = ''
  }

  const removePhoto = (index) => setPhotos((current) => {
    const removed = current[index]
    if (removed) URL.revokeObjectURL(removed.url)
    return current.filter((_, itemIndex) => itemIndex !== index)
  })

  const analyze = async () => {
    const valueMeters = Number(anchorValue)
    if (photos.length < 4 || photos.length > 8 || !Number.isFinite(valueMeters) || valueMeters <= 0) return
    setStatus('analyzing')
    setError('')
    const startedAt = new Date().toISOString()
    try {
      const draft = await analyzeRoomPhotos({ images: photos.map((photo) => photo.file), scaleAnchor: { type: 'roomWidth', valueMeters } })
      const result = adaptPhotoRoomDraft(draft)
      if (result.diagnostics.validationErrors.length) throw new Error('生成的 RoomDocument 未通过数据校验')
      const metrics = createPhotoRealityTestRecord({ photoCount: photos.length, analysisMode: PHOTO_ANALYSIS_MODE, draftValidationPassed: true, startedAt, completedAt: new Date().toISOString() })
      const diagnostics = { ...result.diagnostics, metrics }
      setResultSummary({ walls: result.document.walls.length, doors: result.document.openings.filter((opening) => opening.type === 'door').length, windows: result.document.openings.filter((opening) => opening.type === 'window').length })
      setPendingResult({ document: result.document, diagnostics })
      setStatus('ready')
    } catch (reason) {
      setError(reason.message ?? '照片分析失败')
      setStatus('idle')
    }
  }

  return (
    <main className="photo-capture-shell">
      <header className="photo-capture-header"><div><strong>实拍扫描房间（实验）</strong><span>Phase 3A.2 · {PHOTO_ANALYSIS_MODE}</span></div><button onClick={onCancel}>返回现有户型</button></header>
      <section className="photo-capture-card">
        <h1>拍摄 / 上传房间照片</h1>
        <p className="photo-capture-hint">站在房间中心附近，依次拍摄房间四周。尽量让相邻照片有重叠区域，并覆盖墙面、门和窗。</p>
        <label className="photo-upload-button">添加照片<input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} /></label>
        <span className="photo-count">已添加 {photos.length} / 8 张照片（至少 4 张）</span>
        <div className="photo-preview-grid">{photos.map((photo, index) => <figure key={`${photo.name}-${index}`}><img src={photo.url} alt={photo.name} /><button onClick={() => removePhoto(index)} aria-label={`删除 ${photo.name}`}>×</button><figcaption>{photo.name}</figcaption></figure>)}</div>
        <label className="photo-anchor-field"><span>已知房间宽度</span><span><input type="number" min="0.5" max="30" step="0.01" value={anchorValue} onChange={(event) => setAnchorValue(event.target.value)} /><small>m</small></span></label>
        <p className="photo-anchor-note">尺度锚点只用于确定性归一化，AI 不会自行决定绝对尺寸。</p>
        {error && <div className="photo-error">{error}</div>}
        <button className="photo-analyze-button" disabled={photos.length < 4 || status === 'analyzing' || status === 'ready'} onClick={analyze}>{status === 'analyzing' ? '正在生成房间草稿…' : status === 'ready' ? '已生成户型草稿' : '生成户型草稿'}</button>
        {resultSummary && <div ref={resultSummaryRef} className="photo-result-summary"><strong>识别摘要</strong><span>{resultSummary.walls} 面墙 · {resultSummary.doors} 扇门 · {resultSummary.windows} 扇窗</span>{pendingResult && <button className="photo-check-button" onClick={() => onDraftReady(pendingResult.document, pendingResult.diagnostics)}>检查户型</button>}</div>}
        <p className="photo-mock-note">当前模式：{PHOTO_ANALYSIS_MODE}。真实模式仅通过 `/api/analyze-room` 后端调用 Vision Provider，不在浏览器保存 API Key。</p>
      </section>
    </main>
  )
}

export default PhotoRoomCapture
