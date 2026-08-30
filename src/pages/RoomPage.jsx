import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE } from 'three'
import { useNavigate } from 'react-router-dom'
import Room from '../components/Room.jsx'
import FurnitureInstance from '../components/furniture/FurnitureInstance.jsx'
import FurnitureInspector from '../components/furniture/FurnitureInspector.jsx'
import { getExteriorWallsBounds } from '../domain/roomGeometry.js'
import { createGeometryProxyFromFurniture } from '../domain/spatialContracts.js'
import { FURNITURE_CATALOG_V0 } from '../data/furnitureCatalog.js'
import { useSharedRoomDocument } from '../state/useSharedRoomDocument.js'
import { useSharedFurnitureWorkspace } from '../state/useSharedFurnitureWorkspace.js'
import CozyLighting from '../styles/cozy/CozyLighting.jsx'
import FurnitureIntakePanel from '../components/furniture/FurnitureIntakePanel.jsx'
import { createSelectFurnitureCommand } from '../domain/interactionCommands.js'

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

  return (
    <main className="app-shell room-page">
      <Canvas shadows camera={{ position: [8.8, 7.2, 8.8], fov: 42, near: 0.1, far: 100 }} dpr={[1, 2]} onPointerMissed={() => furnitureWorkspace.dispatchInteractionCommand(createSelectFurnitureCommand(null))}>
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

      <button className="back-to-plan" onClick={() => navigate('/floorplan')}>我的户型</button>

      <aside className="room-sidebar" aria-label="小屋功能导航">
        <span className="room-sidebar-title">我的小屋</span>
        <button className="selected" type="button">当前空间</button>
        <button type="button" onClick={() => navigate('/floorplan')}>我的户型</button>
        <button type="button" onClick={() => navigate('/furniture')}>我的家具</button>
        <button type="button" onClick={() => setShowIntake(true)}>＋ 添加家具</button>
        <button type="button" onClick={() => navigate('/furniture')}>愿望清单</button>
        <div className="room-sidebar-divider" />
        <span className="room-sidebar-note">拖动家具调整位置<br />右键或 Shift 旋转</span>
      </aside>

      <aside className="editor-panel room-editor-panel">
        {!furnitureWorkspace.selectedFurniture ? <section className="context-empty"><span className="context-empty-icon">✦</span><h2>选择一件家具</h2><p className="hint">点击小屋中的家具，在这里查看尺寸、归属和摆放状态。</p><button type="button" className="furniture-room-action" onClick={() => setShowIntake(true)}>＋ 添加家具</button><details className="room-settings-details"><summary>房间设置</summary><div className="room-settings-body"><p className="hint">拖动橙色尺寸手柄时，选中墙与对面墙会同步变化。</p><NumberField label="净宽" value={bounds.width} min={2} max={12} onChange={(value) => resizeRoom('width', value)} /><NumberField label="进深" value={bounds.depth} min={2.5} max={8} onChange={(value) => resizeRoom('depth', value)} /><NumberField label="层高" value={document.room.defaults.wallHeight} min={2.2} max={4} onChange={(wallHeight) => dispatch({ type: 'UPDATE_WALL_DEFAULTS', patch: { wallHeight } })} /></div></details></section> : <FurnitureInspector
          furnitureItems={furnitureWorkspace.furnitureItems}
          furniture={inspectorFurniture}
          placement={inspectorPlacement}
          geometryProxy={inspectorGeometryProxy}
          spatialFacts={inspectorSpatialFacts}
          selected
          showGeometryProxy={furnitureWorkspace.showGeometryProxy}
          dispatchFurnitureCommand={furnitureWorkspace.dispatchInteractionCommand}
          catalogItems={FURNITURE_CATALOG_V0}
          roomDocument={document}
          spatialAnalysis={furnitureWorkspace.spatialAnalysis}
        />}
      </aside>
      <div className="legend"><span className="orange-dot" />家具左键拖动 · Shift/右键拖家具旋转 · 橙色手柄改房间 · 滚轮缩放</div>
      {showIntake && <FurnitureIntakePanel workspace={furnitureWorkspace} onClose={() => setShowIntake(false)} />}
    </main>
  )
}
