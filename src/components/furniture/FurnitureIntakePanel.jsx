import { useRef, useState } from 'react'
import { recognizeFurniturePhoto } from '../../domain/furnitureRecognition.js'
import { routeFurnitureModelStrategy } from '../../domain/furnitureRouter.js'
import { createFurnitureFromIntake, OWNERSHIP_LIFECYCLE_OPTIONS } from '../../domain/furnitureIntake.js'
import { createCreateFurnitureCommand, createCreatePlacementCommand } from '../../domain/interactionCommands.js'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const OPTIONS = [
  ['DESK', '书桌'], ['OFFICE_CHAIR', '办公椅'], ['TWO_SEAT_SOFA', '沙发'], ['FLOOR_LAMP', '落地灯'],
  ['CABINET', '柜子'], ['BOOKSHELF', '书架'], ['SINGLE_BED', '床'], ['NIGHTSTAND', '床头柜'], ['OTHER', '其他'],
]

export default function FurnitureIntakePanel({ workspace, onClose }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('OWNED')
  const [product, setProduct] = useState({ name: '', price: '', url: '' })
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [recognition, setRecognition] = useState(null)
  const [archetype, setArchetype] = useState('DESK')
  const [dimensions, setDimensions] = useState({ width: '', depth: '', height: '' })
  const [ownershipKey, setOwnershipKey] = useState('USER')
  const [createdFurnitureId, setCreatedFurnitureId] = useState(null)
  const furnitureIdRef = useRef(null)
  const [error, setError] = useState('')

  const selectedLabel = OPTIONS.find(([value]) => value === archetype)?.[1] ?? archetype
  const selectedStrategy = routeFurnitureModelStrategy({ archetype }) ?? 'GENERATED'

  const chooseFile = (nextFile) => {
    setError('')
    if (!nextFile) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type) || nextFile.size > MAX_FILE_BYTES) {
      setError('请选择 JPG、PNG 或 WEBP 图片（最大 10 MB）。')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(nextFile)
    const result = recognizeFurniturePhoto({ file: nextFile })
    setFile(nextFile); setPreviewUrl(url); setRecognition(result); setArchetype(result.archetype === 'OTHER' ? 'DESK' : result.archetype); setStep(2)
  }

  const create = () => {
    setError('')
    try {
      if (!furnitureIdRef.current) furnitureIdRef.current = `intake-${Date.now()}`
      const furnitureId = furnitureIdRef.current
      const effectiveOwnership = mode === 'WISHLIST' ? 'WISHLIST' : ownershipKey
      const furniture = createFurnitureFromIntake({ id: furnitureId, name: mode === 'WISHLIST' ? product.name : selectedLabel, archetype, dimensionsCm: dimensions, ownershipKey: effectiveOwnership, photo: { ...file, previewUrl } })
      workspace.dispatchInteractionCommand(createCreateFurnitureCommand({
        id: furniture.id, name: furniture.name, archetype, dimensionsCm: dimensions, ownershipKey: effectiveOwnership,
        photo: { name: file?.name, type: file?.type, previewUrl },
        product: mode === 'WISHLIST' ? { name: product.name, price: product.price, url: product.url, imagePreview: previewUrl } : null,
      }))
      setCreatedFurnitureId(furniture.id)
      setStep(4)
    } catch (cause) { setError(cause.message) }
  }

  const place = () => {
    const id = workspace.selectedFurnitureId ?? createdFurnitureId
    if (id && selectedStrategy !== 'GENERATED') workspace.dispatchInteractionCommand(createCreatePlacementCommand(id))
    onClose()
  }

  return <div className="intake-backdrop" role="presentation"><section className="intake-panel" role="dialog" aria-modal="true" aria-labelledby="intake-title">
    <header className="intake-header"><div><span className="eyebrow">FURNITURE INTAKE</span><h2 id="intake-title">添加家具</h2></div><button type="button" onClick={onClose} aria-label="关闭">×</button></header>
    <div className="intake-steps"><span className={step >= 1 ? 'active' : ''}>1 上传照片</span><span className={step >= 2 ? 'active' : ''}>2 识别确认</span><span className={step >= 3 ? 'active' : ''}>3 确认尺寸</span><span className={step >= 4 ? 'active' : ''}>4 加入家具</span></div>
    {error && <p className="intake-error" role="alert">{error}</p>}
    {step === 1 && <div className="intake-body"><p>选择添加方式</p><div className="intake-mode"><button className={mode === 'OWNED' ? 'active' : ''} type="button" onClick={() => setMode('OWNED')}>📷 添加已有家具</button><button className={mode === 'WISHLIST' ? 'active' : ''} type="button" onClick={() => setMode('WISHLIST')}>🛒 添加想买的家具</button></div><p>上传照片或商品截图，图片只用于语义识别和当前会话预览。</p><label className="intake-upload"><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /><strong>选择本地图片</strong><small>JPG / PNG / WEBP · 最大 10 MB</small></label><div className="intake-demo-samples"><span>Demo 示例：</span><button type="button" onClick={() => chooseFile(new File(['desk-demo'], 'demo-desk.jpg', { type: 'image/jpeg' }))}>Desk</button><button type="button" onClick={() => chooseFile(new File(['chair-demo'], 'demo-office-chair.jpg', { type: 'image/jpeg' }))}>Office Chair</button><button type="button" onClick={() => chooseFile(new File(['special-demo'], 'demo-special.jpg', { type: 'image/jpeg' }))}>Special</button></div></div>}
    {step === 2 && <div className="intake-body">{previewUrl && <img className="intake-preview" src={previewUrl} alt="家具照片预览" />}<p><strong>识别结果：</strong>{recognition?.archetype ?? '未识别'}（置信度 {Math.round((recognition?.confidence ?? 0) * 100)}%）</p><label className="intake-field">请确认家具类型<select value={archetype} onChange={(event) => setArchetype(event.target.value)}>{OPTIONS.map(([value, label]) => <option value={value} key={value}>{label} · {value}</option>)}</select></label><p className="intake-note">识别不可用或置信度较低时，请直接手动选择。</p><button className="intake-primary" type="button" onClick={() => setStep(3)}>下一步：确认尺寸</button></div>}
    {step === 3 && <div className="intake-body"><p><strong>{selectedLabel}</strong> · 请输入现实尺寸</p>{mode === 'WISHLIST' && <><label className="intake-field">商品名称<input value={product.name} onChange={(event) => setProduct((p) => ({ ...p, name: event.target.value }))} placeholder="例如：原木书桌" /></label><label className="intake-field">价格（选填）<input type="number" min="0" value={product.price} onChange={(event) => setProduct((p) => ({ ...p, price: event.target.value }))} /></label><label className="intake-field">商品链接（选填）<input value={product.url} onChange={(event) => setProduct((p) => ({ ...p, url: event.target.value }))} placeholder="仅保存，不会解析" /></label></>}<div className="intake-dimensions">{[['width', '宽度'], ['depth', '深度'], ['height', '高度']].map(([key, label]) => <label className="intake-field" key={key}>{label} cm<input type="number" min="0.1" max="2000" step="0.1" value={dimensions[key]} onChange={(event) => setDimensions((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div><p className="intake-note">尺寸将用于空间摆放和碰撞判断，请尽量填写真实尺寸。照片不会自动测量尺寸。</p>{mode === 'OWNED' && <fieldset className="intake-ownership"><legend>家具归属</legend>{Object.entries(OWNERSHIP_LIFECYCLE_OPTIONS).filter(([key]) => key !== 'WISHLIST').map(([key, option]) => <label key={key}><input type="radio" name="ownership" value={key} checked={ownershipKey === key} onChange={() => setOwnershipKey(key)} />{option.label}</label>)}</fieldset>}<button className="intake-primary" type="button" onClick={create}>确认并创建</button></div>}
    {step === 4 && <div className="intake-body intake-success">{previewUrl && <img className="intake-preview small" src={previewUrl} alt="家具照片预览" />}<h3>已加入“我的家具”</h3><p>{selectedStrategy === 'GENERATED' ? '该家具需要生成专属 3D 模型，当前状态为 Pending Generation。' : '系统已自动选择模型路线；真实尺寸已转换为米。'}</p>{selectedStrategy !== 'GENERATED' && <button className="intake-primary" type="button" onClick={place}>放入小屋</button>}<button type="button" onClick={onClose}>{selectedStrategy === 'GENERATED' ? '关闭' : '稍后放置'}</button></div>}
  </section></div>
}
