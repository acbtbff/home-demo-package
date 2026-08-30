import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE } from 'three'
import { useNavigate } from 'react-router-dom'
import Room from '../components/Room.jsx'
import FurnitureInstance from '../components/furniture/FurnitureInstance.jsx'
import FurnitureInspector from '../components/furniture/FurnitureInspector.jsx'
import { getExteriorWallsBounds, getWallLength } from '../domain/roomGeometry.js'
import { createGeometryProxyFromFurniture } from '../domain/spatialContracts.js'
import { FURNITURE_CATALOG_V0 } from '../data/furnitureCatalog.js'
import { useSharedRoomDocument } from '../state/useSharedRoomDocument.js'
import { useSharedFurnitureWorkspace } from '../state/useSharedFurnitureWorkspace.js'
import CozyLighting from '../styles/cozy/CozyLighting.jsx'
import FurnitureIntakePanel from '../components/furniture/FurnitureIntakePanel.jsx'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function NumberField({ label, value, min, max, step = 0.01, onChange, suffix = 'm' }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input type="number" value={Number(value.toFixed?.(3) ?? value)} min={min} max={max} step={step} onChange={(event) => onChange(clamp(Number(event.target.value), min, max))} />
        <small>{suffix}</small>
      </span>
    </label>
  )
}

export default function RoomPage() {
  const navigate = useNavigate()
  const { document, dispatch } = useSharedRoomDocument()
  const furnitureWorkspace = useSharedFurnitureWorkspace()
  const [editWalls, setEditWalls] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [styleMode, setStyleMode] = useState('ORIGINAL')
  const [showIntake, setShowIntake] = useState(false)
  const nextStyleMode = () => setStyleMode((value) => value === 'ORIGINAL' ? 'COZY_V0' : value === 'COZY_V0' ? 'COZY_V0_GEOMETRY' : 'ORIGINAL')
  const bounds = useMemo(() => getExteriorWallsBounds(document.walls), [document.walls])
  const defaultFurniture = furnitureWorkspace.furnitureItems[0] ?? null
  const defaultPlacement = defaultFurniture
    ? Object.values(furnitureWorkspace.effectivePlacementsById).find((placement) => placement.furnitureId === defaultFurniture.id) ?? null
    : null
  const inspectorFurniture = furnitureWorkspace.selectedFurniture ?? defaultFurniture
  const inspectorPlacement = furnitureWorkspace.selectedPlacement ?? defaultPlacement
  const inspectorGeometryProxy = inspectorFurniture ? createGeometryProxyFromFurniture(inspectorFurniture) : null
  const inspectorSpatialFacts = inspectorFurniture
    ? furnitureWorkspace.spatialAnalysis.byFurnitureId[inspectorFurniture.id] ?? null
    : null

  const resizeRoom = (field, value) => dispatch({
    type: 'RESIZE_ROOM',
    width: field === 'width' ? value : bounds.width,
    depth: field === 'depth' ? value : bounds.depth,
  })

  const updateOpening = (openingId, patch) => {
    const opening = document.openings.find((candidate) => candidate.id === openingId)
    const wall = opening && document.walls.find((candidate) => candidate.id === opening.wallId)
    if (!opening || !wall) return
    const wallLength = getWallLength(wall)
    const width = clamp(patch.width ?? opening.width, 0.2, Math.max(0.2, wallLength - 0.1))
    const offset = clamp(patch.offset ?? opening.offset, width / 2, Math.max(width / 2, wallLength - width / 2))
    dispatch({ type: 'UPDATE_OPENING', openingId, patch: { ...patch, width, offset } })
  }

  return (
    <main className="app-shell room-page">
      <Canvas shadows camera={{ position: [8.8, 7.2, 8.8], fov: 42, near: 0.1, far: 100 }} dpr={[1, 2]}>
        <color attach="background" args={[styleMode !== 'ORIGINAL' ? '#F2EFE8' : '#cfd9dd']} />
        {styleMode !== 'ORIGINAL' ? <CozyLighting /> : <><ambientLight intensity={0.8} /><directionalLight castShadow position={[4, 9, 6]} intensity={1.5} shadow-mapSize-width={2048} shadow-mapSize-height={2048} /></>}
        <Room
          document={document}
          editWalls={editWalls}
          onDimensionDrag={(field, value) => resizeRoom(field, clamp(value, field === 'width' ? 2 : 2.5, field === 'width' ? 12 : 8))}
          onDragStateChange={setIsDragging}
          styleMode={styleMode}
        />
        {furnitureWorkspace.furnitureItems.map((furniture) => {
          const placement = Object.values(furnitureWorkspace.effectivePlacementsById)
            .find((item) => item.furnitureId === furniture.id)
          return placement ? (
            <FurnitureInstance
              key={furniture.id}
              furniture={furniture}
              placement={placement}
              selected={furnitureWorkspace.selectedFurnitureId === furniture.id}
              showGeometryProxy={furnitureWorkspace.showGeometryProxy}
              spatialFacts={furnitureWorkspace.spatialAnalysis.byFurnitureId[furniture.id] ?? null}
              dispatchFurnitureCommand={furnitureWorkspace.dispatchInteractionCommand}
              onDragStateChange={setIsDragging}
              styleMode={styleMode}
            />
          ) : null
        })}
        <gridHelper args={[14, 28, '#809098', '#b2bdc2']} position={[0, 0.005, 0]} />
        <OrbitControls makeDefault enabled={!isDragging} target={[0, 0.8, 0]} enableDamping minDistance={4} maxDistance={20} mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }} />
      </Canvas>

      <div className="room-topbar">
        <div><strong>3D 小屋</strong><span>按真实尺寸预览家具，拖动或旋转来调整摆放。</span></div>
        <button className="active" type="button" onClick={nextStyleMode}>灯光样式：{styleMode === 'ORIGINAL' ? '标准' : '温馨'}</button>
        <button className={editWalls ? 'active' : ''} onClick={() => setEditWalls((value) => !value)}>{editWalls ? '墙体拖动：开' : '墙体拖动：关'}</button>
      </div>

      <button className="back-to-plan" onClick={() => navigate('/floorplan')}>返回 2D 户型</button>

      <aside className="room-sidebar" aria-label="小屋功能导航">
        <span className="room-sidebar-title">我的小屋</span>
        <button className="selected" type="button">空间分析</button>
        <button type="button" onClick={() => navigate('/floorplan')}>我的户型</button>
        <button type="button" onClick={() => navigate('/furniture')}>我的家具</button>
        <button type="button" onClick={() => setShowIntake(true)}>＋ 添加家具</button>
        <button type="button">愿望清单</button>
        <div className="room-sidebar-divider" />
        <button type="button" disabled>撤销</button>
        <button type="button" disabled>重置</button>
        <button type="button" disabled>保存方案</button>
        <button type="button" disabled>导出</button>
      </aside>

      <aside className="editor-panel room-editor-panel">
        <section>
          <h2>房间参数</h2>
          <p className="hint">拖动橙色尺寸手柄时，选中墙与对面墙会同步对称变化；面向观察方向的墙会自动透明。</p>
          <NumberField label="净宽" value={bounds.width} min={2} max={12} onChange={(value) => resizeRoom('width', value)} />
          <NumberField label="进深" value={bounds.depth} min={2.5} max={8} onChange={(value) => resizeRoom('depth', value)} />
          <NumberField label="层高" value={document.room.defaults.wallHeight} min={2.2} max={4} onChange={(wallHeight) => dispatch({ type: 'UPDATE_WALL_DEFAULTS', patch: { wallHeight } })} />
          <NumberField label="墙厚（模拟）" value={document.room.defaults.wallThickness} min={0.08} max={0.35} onChange={(wallThickness) => dispatch({ type: 'UPDATE_WALL_DEFAULTS', patch: { wallThickness } })} />
        </section>
        <section>
          <h2>门窗</h2>
          {document.openings.map((opening) => {
            const wall = document.walls.find((candidate) => candidate.id === opening.wallId)
            if (!wall) return null
            const wallLength = getWallLength(wall)
            return <div key={opening.id} className="opening-settings">
              <h3>{opening.type === 'door' ? '门' : '窗'} · {opening.wallId}</h3>
              <NumberField label="距墙起点" value={opening.offset} min={opening.width / 2} max={Math.max(opening.width / 2, wallLength - opening.width / 2)} onChange={(offset) => updateOpening(opening.id, { offset })} />
              <NumberField label="宽度" value={opening.width} min={0.2} max={Math.max(0.2, wallLength - 0.1)} onChange={(width) => updateOpening(opening.id, { width })} />
              {opening.type === 'window' && <NumberField label="窗台高" value={opening.sillHeight} min={0} max={2} onChange={(sillHeight) => dispatch({ type: 'UPDATE_OPENING', openingId: opening.id, patch: { sillHeight } })} />}
            </div>
          })}
          {document.openings.length === 0 && <p className="hint">当前户型没有门窗，可返回 2D 编辑器添加。</p>}
        </section>
        <FurnitureInspector
          furnitureItems={furnitureWorkspace.furnitureItems}
          furniture={inspectorFurniture}
          placement={inspectorPlacement}
          geometryProxy={inspectorGeometryProxy}
          spatialFacts={inspectorSpatialFacts}
          selected={Boolean(furnitureWorkspace.selectedFurniture)}
          showGeometryProxy={furnitureWorkspace.showGeometryProxy}
          dispatchFurnitureCommand={furnitureWorkspace.dispatchInteractionCommand}
          catalogItems={FURNITURE_CATALOG_V0}
        />
        <button className="reset-button" onClick={() => navigate('/floorplan')}>返回编辑户型</button>
      </aside>
      <div className="legend"><span className="orange-dot" />家具左键拖动 · Shift/右键拖家具旋转 · 橙色手柄改房间 · 滚轮缩放</div>
      {showIntake && <FurnitureIntakePanel workspace={furnitureWorkspace} onClose={() => setShowIntake(false)} />}
    </main>
  )
}
