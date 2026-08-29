import { useNavigate } from 'react-router-dom'
import { FURNITURE_CATALOG_V0 } from '../data/furnitureCatalog.js'
import {
  createAddFurnitureCommand,
  createRemoveFurnitureCommand,
  createSelectFurnitureCommand,
} from '../domain/interactionCommands.js'
import { MODEL_STRATEGIES, routeFurnitureModelStrategy } from '../domain/furnitureRouter.js'
import { useSharedFurnitureWorkspace } from '../state/useSharedFurnitureWorkspace.js'

const STRATEGY_LABELS = {
  [MODEL_STRATEGIES.PARAMETRIC]: 'PARAMETRIC · 参数化',
  [MODEL_STRATEGIES.LIBRARY]: 'LIBRARY · 素材库',
  [MODEL_STRATEGIES.GENERATED]: 'GENERATED · 图片生成',
}

export default function FurniturePage() {
  const navigate = useNavigate()
  const workspace = useSharedFurnitureWorkspace()

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
        <button className="furniture-room-action" type="button" onClick={() => navigate('/room')}>进入 3D 小屋</button>
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
            return (
              <article key={furniture.id} className="furniture-owned-row">
                <div>
                  <strong>{furniture.name}</strong>
                  <span>{furniture.semantic.archetype} · {STRATEGY_LABELS[furniture.modelStrategy.resolved] ?? '未解析'}</span>
                </div>
                <div className="furniture-owned-meta">
                  <span>{Math.round(furniture.physical.dimensionsM.width * 100)} × {Math.round(furniture.physical.dimensionsM.depth * 100)} × {Math.round(furniture.physical.dimensionsM.height * 100)} cm</span>
                  <span>{facts?.outOfBounds ? '越界' : facts?.collisionDetected ? '存在碰撞' : '空间状态正常'}</span>
                  <span>{placement ? `x ${placement.position.x.toFixed(2)} / z ${placement.position.z.toFixed(2)}` : '未放置'}</span>
                </div>
                <div className="furniture-owned-actions">
                  <button type="button" onClick={() => editInRoom(furniture.id)}>在 3D 中编辑</button>
                  <button type="button" onClick={() => workspace.dispatchInteractionCommand(createRemoveFurnitureCommand(furniture.id))}>移除</button>
                </div>
              </article>
            )
          })}
          {workspace.furnitureItems.length === 0 && <p className="furniture-empty">当前没有家具。请从上方选择一个样板添加。</p>}
        </div>
      </section>
    </main>
  )
}
