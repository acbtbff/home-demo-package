import { useNavigate } from 'react-router-dom'
import { FURNITURE_CATALOG_V0 } from '../data/furnitureCatalog.js'
import {
  createAddFurnitureCommand,
  createCreatePlacementCommand,
  createRemoveFurnitureCommand,
  createSelectFurnitureCommand,
  createUpdateFurnitureInfoCommand,
  createPurchaseFurnitureCommand,
} from '../domain/interactionCommands.js'
import { MODEL_STRATEGIES, routeFurnitureModelStrategy } from '../domain/furnitureRouter.js'
import { useSharedFurnitureWorkspace } from '../state/useSharedFurnitureWorkspace.js'
import FurnitureIntakePanel from '../components/furniture/FurnitureIntakePanel.jsx'
import { useState } from 'react'

function FurnitureInfoEditor({ furniture, onSave, onClose }) {
  const [name, setName] = useState(furniture.name ?? '')
  const [dims, setDims] = useState(Object.fromEntries(Object.entries(furniture.physical.dimensionsM).map(([key, value]) => [key, Math.round(value * 100)])))
  const [ownership, setOwnership] = useState(furniture.ownership.type === 'NONE' ? 'WISHLIST' : furniture.ownership.type)
  const [price, setPrice] = useState(furniture.product?.price ?? '')
  const [url, setUrl] = useState(furniture.product?.url ?? '')
  const save = () => onSave({ name, dimensionsM: { width: Number(dims.width) / 100, depth: Number(dims.depth) / 100, height: Number(dims.height) / 100 }, ownershipType: ownership === 'WISHLIST' ? 'NONE' : ownership, lifecycleStatus: ownership === 'WISHLIST' ? 'WISHLIST' : 'OWNED', product: { price, url, name: furniture.product?.name ?? null, imagePreview: furniture.product?.imagePreview ?? null } })
  return <div className="intake-backdrop"><section className="intake-panel info-editor" role="dialog" aria-modal="true"><header className="intake-header"><h2>编辑家具信息</h2><button type="button" onClick={onClose}>×</button></header><div className="intake-body"><label className="intake-field">家具名称<input value={name} onChange={(e) => setName(e.target.value)} /></label><p className="intake-note">类型：{furniture.semantic.archetype}（只读）</p><div className="intake-dimensions">{['width', 'depth', 'height'].map((key) => <label className="intake-field" key={key}>{key === 'width' ? '宽度' : key === 'depth' ? '深度' : '高度'} cm<input type="number" min="0.1" value={dims[key]} onChange={(e) => setDims((d) => ({ ...d, [key]: e.target.value }))} /></label>)}</div><fieldset className="intake-ownership"><legend>状态</legend><label><input type="radio" checked={ownership === 'USER'} onChange={() => setOwnership('USER')} />我的家具</label><label><input type="radio" checked={ownership === 'LANDLORD'} onChange={() => setOwnership('LANDLORD')} />房东家具</label><label><input type="radio" checked={ownership === 'WISHLIST'} onChange={() => setOwnership('WISHLIST')} />想购买</label></fieldset>{(furniture.product || ownership === 'WISHLIST') && <><label className="intake-field">价格<input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></label><label className="intake-field">商品链接<input value={url} onChange={(e) => setUrl(e.target.value)} /></label></>}<button className="intake-primary" type="button" onClick={save}>保存修改</button></div></section></div>
}

const STRATEGY_LABELS = {
  [MODEL_STRATEGIES.PARAMETRIC]: 'PARAMETRIC · 参数化',
  [MODEL_STRATEGIES.LIBRARY]: 'LIBRARY · 素材库',
  [MODEL_STRATEGIES.GENERATED]: 'GENERATED · 图片生成',
}

export default function FurniturePage() {
  const navigate = useNavigate()
  const workspace = useSharedFurnitureWorkspace()
  const [showIntake, setShowIntake] = useState(false)
  const [editingFurniture, setEditingFurniture] = useState(null)

  const addFurniture = (item) => {
    workspace.dispatchInteractionCommand(createAddFurnitureCommand(item))
    navigate('/room')
  }

  const editInRoom = (furnitureId) => {
    workspace.dispatchInteractionCommand(createSelectFurnitureCommand(furnitureId))
    navigate('/room')
  }

  return (
    <main className="furniture-page">
      <header className="furniture-page-header">
        <div>
          <span className="eyebrow">FURNITURE RUNTIME V0</span>
          <h1>我的家具</h1>
          <p>家具来源不同，但最终都进入同一套 Furniture + Placement + GeometryProxy + VisualModel 运行时。</p>
        </div>
        <div className="furniture-header-actions"><button className="furniture-room-action" type="button" onClick={() => setShowIntake(true)}>＋ 添加家具</button><button type="button" onClick={() => navigate('/room')}>进入 3D 小屋</button></div>
      </header>

      <section className="furniture-section">
        <div className="furniture-section-heading">
          <div>
            <h2>可添加样板</h2>
            <p>当前已接入 PARAMETRIC 与 LIBRARY。GENERATED 接口保留，等待补回之前的图片生成 3D 实验资产。</p>
          </div>
        </div>
        <div className="furniture-catalog-grid">
          {FURNITURE_CATALOG_V0.map((item) => (
            <article className="furniture-catalog-card" key={item.catalogId}>
              <span className={`strategy-badge strategy-${item.modelStrategy.toLowerCase()}`}>{STRATEGY_LABELS[item.modelStrategy]}</span>
              <h3>{item.name}</h3>
              <p>{item.category} / {item.archetype}</p>
              <small>{Math.round(item.defaultDimensionsM.width * 100)} × {Math.round(item.defaultDimensionsM.depth * 100)} × {Math.round(item.defaultDimensionsM.height * 100)} cm</small>
              <button type="button" onClick={() => addFurniture(item)}>添加到房间</button>
            </article>
          ))}

          <article className="furniture-catalog-card furniture-pending-card">
            <span className="strategy-badge strategy-generated">{STRATEGY_LABELS[MODEL_STRATEGIES.GENERATED]}</span>
            <h3>Generated 试验位</h3>
            <p>图片 → 3D → GLB 的长尾路线</p>
            <small>GENERATED Runtime 已保留 GLB 接口；V0 Router 中 LADDER_SPECIAL 仍映射为 {routeFurnitureModelStrategy({ archetype: 'LADDER_SPECIAL' })}。后续可补回你们之前实际做过的任意图片生成模型，不要求必须是梯子。</small>
            <button type="button" disabled>待补实际 Generated 资产</button>
          </article>
        </div>
      </section>

      <section className="furniture-section">
        <div className="furniture-section-heading">
          <div>
            <h2>当前房间家具</h2>
            <p>Furniture 与 Placement 分离；从这里进入 3D 后可拖动、旋转、查看碰撞与越界状态。</p>
          </div>
          <strong>{workspace.furnitureItems.length} 件</strong>
        </div>
        <div className="furniture-owned-list">
          {workspace.furnitureItems.map((furniture) => {
            const placement = Object.values(workspace.effectivePlacementsById).find((item) => item.furnitureId === furniture.id)
            const facts = workspace.spatialAnalysis.byFurnitureId[furniture.id]
            const pending = furniture.representation?.status === 'PENDING_GENERATION'
            return (
              <article key={furniture.id} className="furniture-owned-row">
                <div>
                  <strong>{furniture.name}</strong>
                  <span>{furniture.semantic.archetype} · {STRATEGY_LABELS[furniture.modelStrategy.resolved] ?? '未解析'} · {furniture.representation?.status ?? 'READY'}</span>
                </div>
                <div className="furniture-owned-meta">
                  {furniture.intakeMetadata?.previewUrl && <img className="furniture-thumb" src={furniture.intakeMetadata.previewUrl} alt="" />}<span>{Math.round(furniture.physical.dimensionsM.width * 100)} × {Math.round(furniture.physical.dimensionsM.depth * 100)} × {Math.round(furniture.physical.dimensionsM.height * 100)} cm</span>
                  <span>{furniture.ownership?.type ?? '未指定'} · {furniture.lifecycle?.status ?? '未指定'}</span>
                  <span>{facts?.outOfBounds ? '越界' : facts?.collisionDetected ? '存在碰撞' : '空间状态正常'}</span>
                  <span>{placement ? `x ${placement.position.x.toFixed(2)} / z ${placement.position.z.toFixed(2)}` : '未放置'}</span>
                </div>
                <div className="furniture-owned-actions">
                  <button type="button" onClick={() => setEditingFurniture(furniture)}>编辑信息</button>
                  {pending ? <button type="button" disabled>等待生成模型</button> : placement ? <button type="button" onClick={() => editInRoom(furniture.id)}>在 3D 中编辑</button> : <button type="button" onClick={() => workspace.dispatchInteractionCommand(createCreatePlacementCommand(furniture.id))}>放入小屋</button>}
                  {furniture.ownership.type === 'NONE' && furniture.lifecycle.status === 'WISHLIST' && <button type="button" onClick={() => workspace.dispatchInteractionCommand(createPurchaseFurnitureCommand(furniture.id))}>已购买</button>}
                  <button type="button" onClick={() => workspace.dispatchInteractionCommand(createRemoveFurnitureCommand(furniture.id))}>移除</button>
                </div>
              </article>
            )
          })}
          {workspace.furnitureItems.length === 0 && <p className="furniture-empty">当前没有家具。请从上方选择一个样板添加。</p>}
        </div>
      </section>
      {showIntake && <FurnitureIntakePanel workspace={workspace} onClose={() => setShowIntake(false)} />}
      {editingFurniture && <FurnitureInfoEditor furniture={editingFurniture} onClose={() => setEditingFurniture(null)} onSave={(patch) => { workspace.dispatchInteractionCommand(createUpdateFurnitureInfoCommand({ furnitureId: editingFurniture.id, patch })); setEditingFurniture(null) }} />}
    </main>
  )
}
