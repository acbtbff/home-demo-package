import { useMemo, useRef, useState } from 'react'
import { getExteriorWallsBounds, getWallDirection, getWallLength } from '../../domain/roomGeometry.js'
import { analyzeWallClosure, getConnectedWallEndpoints, getConnectedWallEndpointsForWall } from '../../domain/wallTopology.js'
import { findNearestWallSnap, snapWallByTranslation, WALL_SNAP_RELEASE_THRESHOLD, WALL_SNAP_THRESHOLD } from '../../domain/wallSnapping.js'
import DimensionLabel from './DimensionLabel.jsx'
import Opening2D from './Opening2D.jsx'
import Wall2D from './Wall2D.jsx'
import WallHandle from './WallHandle.jsx'
import { createFloorPlanTransform, FLOOR_PLAN_VIEWBOX, getFloorPlanBounds } from './floorPlanCoordinates.js'
import './FloorPlanEditor.css'

const MIN_WALL_LENGTH = 0.2
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function NumericField({ label, value, min = 0, max = 20, step = 0.01, onChange, readOnly = false }) {
  return (
    <label className="plan-field">
      <span>{label}</span>
      <span className="plan-input-unit">
        <input
          aria-label={label}
          type="number"
          value={Number(value.toFixed?.(3) ?? value)}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          onChange={(event) => onChange?.(clamp(Number(event.target.value), min, max))}
        />
        <small>m</small>
      </span>
    </label>
  )
}

function getSvgPoint(event, svg) {
  const rect = svg.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) * FLOOR_PLAN_VIEWBOX.width / rect.width,
    y: (event.clientY - rect.top) * FLOOR_PLAN_VIEWBOX.height / rect.height,
  }
}

function snapPoint(point, anchor, walls, excludedWallId) {
  let next = { ...point }
  if (Math.abs(next.x - anchor.x) <= WALL_SNAP_THRESHOLD) next.x = anchor.x
  if (Math.abs(next.z - anchor.z) <= WALL_SNAP_THRESHOLD) next.z = anchor.z
  return findNearestWallSnap(next, walls, { excludedWallId, maxDistance: WALL_SNAP_THRESHOLD })?.point ?? next
}

function clampOpeningPatch(opening, wall, patch) {
  const wallLength = getWallLength(wall)
  const width = clamp(patch.width ?? opening.width, 0.2, Math.max(0.2, wallLength - 0.1))
  const half = width / 2
  const offset = clamp(patch.offset ?? opening.offset, half, Math.max(half, wallLength - half))
  return { ...patch, width, offset }
}

export default function FloorPlanEditor({ document, dispatch, validationErrors, onConfirm3D, onFloorplanImport, floorplanDiagnostics, onPhotoCapture, photoDiagnostics }) {
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const idCounterRef = useRef(0)
  const [selection, setSelection] = useState({ type: 'wall', id: document.walls[0]?.id ?? null })
  const [drawStart, setDrawStart] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [fitBounds, setFitBounds] = useState(() => getFloorPlanBounds(document.walls))
  const transform = useMemo(() => createFloorPlanTransform(fitBounds, zoom), [fitBounds, zoom])
  const selectedWall = selection.type === 'wall' ? document.walls.find((wall) => wall.id === selection.id) : null
  const selectedOpening = selection.type === 'opening' ? document.openings.find((opening) => opening.id === selection.id) : null
  const openingWall = selectedOpening ? document.walls.find((wall) => wall.id === selectedOpening.wallId) : null
  const roomBounds = useMemo(() => getExteriorWallsBounds(document.walls), [document.walls])
  // Interior partitions may intentionally end at a doorway. The room shell is
  // defined by exterior walls, so only that graph blocks entry into 3D.
  const closureReport = useMemo(() => analyzeWallClosure(document.walls.filter((wall) => wall.kind === 'exterior')), [document.walls])
  const openWallIds = [...new Set(closureReport.openEndpoints.map((endpoint) => endpoint.wallId))]
  const canConfirm3D = validationErrors.length === 0

  const fitView = () => {
    setFitBounds(getFloorPlanBounds(document.walls))
    setZoom(1)
  }

  const pointFromEvent = (event) => transform.screenToWorld(getSvgPoint(event, svgRef.current))

  const beginWallDrag = (event, wall) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection({ type: 'wall', id: wall.id })
    dragRef.current = {
      type: 'wall',
      wallId: wall.id,
      startPoint: pointFromEvent(event),
      initialWall: structuredClone(wall),
      connectedEndpoints: getConnectedWallEndpointsForWall(document.walls, wall.id),
      snap: null,
    }
  }

  const beginWallEndpointDrag = (event, wall, endpoint) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection({ type: 'wall', id: wall.id })
    dragRef.current = {
      type: 'wall-endpoint',
      wallId: wall.id,
      endpoint,
      connectionAnchor: { ...wall[endpoint] },
      connectedEndpoints: getConnectedWallEndpoints(document.walls, wall.id, endpoint),
      snap: null,
    }
  }

  const beginOpeningDrag = (event, opening) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection({ type: 'opening', id: opening.id })
    dragRef.current = { type: 'opening', openingId: opening.id }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.type === 'wall') {
      const wall = document.walls.find((item) => item.id === drag.wallId)
      if (!wall) return
      const point = pointFromEvent(event)
      const rawDelta = { x: point.x - drag.startPoint.x, z: point.z - drag.startPoint.z }
      const direction = getWallDirection(drag.initialWall)
      const normal = { x: -direction.z, z: direction.x }
      const distance = rawDelta.x * normal.x + rawDelta.z * normal.z
      const delta = { x: normal.x * distance, z: normal.z * distance }
      const translated = {
        ...drag.initialWall,
        start: { x: drag.initialWall.start.x + delta.x, z: drag.initialWall.start.z + delta.z },
        end: { x: drag.initialWall.end.x + delta.x, z: drag.initialWall.end.z + delta.z },
      }
      const connectedWallIds = drag.connectedEndpoints.map((ref) => ref.wallId)
      let snapped = drag.snap
      if (snapped) {
        const stillSnapped = Math.hypot(translated[snapped.movingEndpoint].x - snapped.point.x, translated[snapped.movingEndpoint].z - snapped.point.z) <= WALL_SNAP_RELEASE_THRESHOLD
        if (!stillSnapped) snapped = null
      }
      if (!snapped) {
        const candidate = snapWallByTranslation(translated, document.walls, {
          maxDistance: WALL_SNAP_THRESHOLD,
          excludedWallIds: connectedWallIds,
        })
        snapped = candidate.snapped ? candidate.snap : null
      }
      drag.snap = snapped
      const nextWall = snapped
        ? {
          ...translated,
          start: { x: translated.start.x + snapped.point.x - translated[snapped.movingEndpoint].x, z: translated.start.z + snapped.point.z - translated[snapped.movingEndpoint].z },
          end: { x: translated.end.x + snapped.point.x - translated[snapped.movingEndpoint].x, z: translated.end.z + snapped.point.z - translated[snapped.movingEndpoint].z },
        }
        : translated
      dispatch({ type: 'MOVE_WALL_PARALLEL', wallId: wall.id, delta: { x: nextWall.start.x - wall.start.x, z: nextWall.start.z - wall.start.z }, connectedEndpoints: drag.connectedEndpoints })
      return
    }
    if (drag.type === 'wall-endpoint') {
      const wall = document.walls.find((item) => item.id === drag.wallId)
      if (!wall) return
      const rawPoint = pointFromEvent(event)
      if (drag.connectedEndpoints.length > 0 && Math.hypot(rawPoint.x - drag.connectionAnchor.x, rawPoint.z - drag.connectionAnchor.z) > WALL_SNAP_RELEASE_THRESHOLD) {
        drag.connectedEndpoints = []
      }
      const excludedWallIds = drag.connectedEndpoints.map((ref) => ref.wallId)
      if (drag.snap && Math.hypot(rawPoint.x - drag.snap.point.x, rawPoint.z - drag.snap.point.z) > WALL_SNAP_RELEASE_THRESHOLD) drag.snap = null
      if (!drag.snap) {
        drag.snap = findNearestWallSnap(rawPoint, document.walls, {
          excludedWallId: wall.id,
          excludedWallIds,
          maxDistance: WALL_SNAP_THRESHOLD,
        })
      }
      const point = drag.snap?.point ?? rawPoint
      const otherEndpoint = drag.endpoint === 'start' ? wall.end : wall.start
      if (Math.hypot(point.x - otherEndpoint.x, point.z - otherEndpoint.z) < MIN_WALL_LENGTH) return
      dispatch({ type: 'MOVE_WALL_ENDPOINT', wallId: wall.id, endpoint: drag.endpoint, point, connectedEndpoints: drag.connectedEndpoints })
      return
    }

    const opening = document.openings.find((item) => item.id === drag.openingId)
    const wall = opening && document.walls.find((item) => item.id === opening.wallId)
    if (!opening || !wall) return
    const point = pointFromEvent(event)
    const direction = getWallDirection(wall)
    const projected = (point.x - wall.start.x) * direction.x + (point.z - wall.start.z) * direction.z
    dispatch({ type: 'UPDATE_OPENING', openingId: opening.id, patch: clampOpeningPatch(opening, wall, { offset: projected }) })
  }

  const handlePointerUp = () => { dragRef.current = null }

  const handleCanvasClick = (event) => {
    if (event.target !== svgRef.current && event.target.dataset.canvas !== 'true') return
    if (!drawStart) {
      setSelection({ type: 'none', id: null })
      return
    }
    const point = pointFromEvent(event)
    if (drawStart === 'waiting') {
      setDrawStart(snapPoint(point, point, document.walls))
      return
    }
    const end = snapPoint(point, drawStart, document.walls)
    if (Math.hypot(end.x - drawStart.x, end.z - drawStart.z) < MIN_WALL_LENGTH) return
    idCounterRef.current += 1
    const id = `wall-new-${idCounterRef.current}`
    dispatch({
      type: 'ADD_WALL',
      wall: {
        id,
        kind: 'partition',
        start: drawStart,
        end,
        height: document.room.defaults.wallHeight,
        thickness: document.room.defaults.wallThickness,
        materialId: 'wall-default',
      },
    })
    setSelection({ type: 'wall', id })
    setDrawStart(null)
  }

  const deleteWall = () => {
    const attached = document.openings.filter((opening) => opening.wallId === selectedWall.id)
    if (attached.length > 0 && !window.confirm(`这面墙包含 ${attached.length} 个门窗，删除墙体会一并删除，是否继续？`)) return
    dispatch({ type: 'REMOVE_WALL', wallId: selectedWall.id })
    setSelection({ type: 'none', id: null })
  }

  const addOpening = (type) => {
    if (!selectedWall) return
    const length = getWallLength(selectedWall)
    const width = Math.min(type === 'door' ? 0.9 : 1.2, Math.max(0.2, length - 0.1))
    idCounterRef.current += 1
    const id = `${type}-new-${idCounterRef.current}`
    dispatch({
      type: 'ADD_OPENING',
      opening: {
        id,
        type,
        wallId: selectedWall.id,
        offset: length / 2,
        width,
        height: type === 'door' ? 2.1 : 1.2,
        sillHeight: type === 'door' ? 0 : 0.9,
      },
    })
    setSelection({ type: 'opening', id })
  }

  const confirm3D = () => {
    if (!canConfirm3D) return
    onConfirm3D()
  }

  const updateSelectedWallLength = (length) => {
    if (!selectedWall) return
    const direction = getWallDirection(selectedWall)
    dispatch({
      type: 'MOVE_WALL_ENDPOINT',
      wallId: selectedWall.id,
      endpoint: 'end',
      point: {
        x: selectedWall.start.x + direction.x * length,
        z: selectedWall.start.z + direction.z * length,
      },
    })
  }

  return (
    <main className="floorplan-shell">
      <header className="floorplan-toolbar">
        <div>
          <strong>通过户型图创建数字房间</strong>
          <span>图片解析结果已转换为 RoomDocument · 墙体、门窗和尺寸均可继续修改</span>
        </div>
        <div className="floorplan-actions">
          {onFloorplanImport && <button onClick={onFloorplanImport}>重新上传户型图</button>}
          {onPhotoCapture && <button onClick={onPhotoCapture}>实拍扫描房间</button>}
          <button className={drawStart ? 'active' : ''} onClick={() => setDrawStart(drawStart ? null : 'waiting')}>{drawStart ? '取消画墙' : '新增墙体'}</button>
          <button onClick={() => setZoom((value) => clamp(value - 0.15, 0.5, 2.5))} aria-label="缩小">−</button>
          <button onClick={() => setZoom((value) => clamp(value + 0.15, 0.5, 2.5))} aria-label="放大">＋</button>
          <button onClick={fitView}>Fit</button>
          <button className="primary" onClick={confirm3D} disabled={!canConfirm3D} title={canConfirm3D ? '进入 3D 场景' : '请先修复 RoomDocument 数据错误'}>确认户型，进入 3D</button>
        </div>
      </header>

      <section className="floorplan-workspace">
        <svg
          ref={svgRef}
          className={`floorplan-canvas ${drawStart ? 'drawing' : ''}`}
          viewBox={`0 0 ${FLOOR_PLAN_VIEWBOX.width} ${FLOOR_PLAN_VIEWBOX.height}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleCanvasClick}
        >
          <defs>
            <pattern id="small-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e7ebed" strokeWidth="1" /></pattern>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#small-grid)" /><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d4dbde" strokeWidth="1.5" /></pattern>
          </defs>
          <rect data-canvas="true" width="100%" height="100%" fill="url(#grid)" />
          {document.walls.map((wall) => (
            <Wall2D
              key={wall.id}
              wall={wall}
              start={transform.worldToScreen(wall.start)}
              end={transform.worldToScreen(wall.end)}
              scale={transform.scale}
              selected={selection.type === 'wall' && selection.id === wall.id}
              onPointerDown={(event) => beginWallDrag(event, wall)}
            />
          ))}
          {document.openings.map((opening) => {
            const wall = document.walls.find((item) => item.id === opening.wallId)
            return wall ? <Opening2D key={opening.id} opening={opening} wall={wall} transform={transform} selected={selection.type === 'opening' && selection.id === opening.id} onPointerDown={(event) => beginOpeningDrag(event, opening)} /> : null
          })}
          {selectedWall && <>
            <DimensionLabel start={transform.worldToScreen(selectedWall.start)} end={transform.worldToScreen(selectedWall.end)} length={getWallLength(selectedWall)} />
            <WallHandle wallId={selectedWall.id} endpoint="start" point={transform.worldToScreen(selectedWall.start)} onPointerDown={(event) => beginWallEndpointDrag(event, selectedWall, 'start')} />
            <WallHandle wallId={selectedWall.id} endpoint="end" point={transform.worldToScreen(selectedWall.end)} onPointerDown={(event) => beginWallEndpointDrag(event, selectedWall, 'end')} />
          </>}
          {closureReport.openEndpoints.map((endpoint) => {
            const point = transform.worldToScreen(endpoint.point)
            return <circle key={`${endpoint.wallId}-${endpoint.endpoint}`} className="open-wall-endpoint" cx={point.x} cy={point.y} r="10" />
          })}
          {drawStart && drawStart !== 'waiting' && <circle className="draw-start" cx={transform.worldToScreen(drawStart).x} cy={transform.worldToScreen(drawStart).y} r="8" />}
        </svg>

        <aside className="floorplan-panel">
          <section className="room-settings">
            <h2>房间参数</h2>
            <p className="plan-section-hint">拖动墙面可平行移动；拖动橙色端点可调整墙长。吸附进入 {WALL_SNAP_THRESHOLD.toFixed(2)}m，离开 {WALL_SNAP_RELEASE_THRESHOLD.toFixed(2)}m 后解除。</p>
            <NumericField label="整体宽度" value={roomBounds.width} min={0.5} max={50} onChange={(width) => dispatch({ type: 'RESIZE_ROOM', width, depth: roomBounds.depth })} />
            <NumericField label="整体进深" value={roomBounds.depth} min={0.5} max={50} onChange={(depth) => dispatch({ type: 'RESIZE_ROOM', width: roomBounds.width, depth })} />
            <NumericField label="层高" value={document.room.defaults.wallHeight} min={2.2} max={4} onChange={(wallHeight) => dispatch({ type: 'UPDATE_WALL_DEFAULTS', patch: { wallHeight } })} />
          </section>
          <div className={`closure-status ${closureReport.isClosed ? 'closed' : 'open'}`}>
            <strong>{closureReport.isClosed ? '外轮廓已闭合' : '外轮廓未闭合'}</strong>
            <span>{closureReport.isClosed ? '外墙端点均已吸附连接，可以进入 3D。' : `有 ${openWallIds.length} 面外墙存在未连接端点；请拖动红色端点完成吸附。`}</span>
          </div>
          {floorplanDiagnostics && <div className="floorplan-import-status">户型图已转换 · {floorplanDiagnostics.wallCount} 面墙 · {floorplanDiagnostics.openingCount} 个门窗 · {floorplanDiagnostics.pixelsPerMeter.toFixed(2)} px/m · 置信度 {Math.round((floorplanDiagnostics.confidence ?? 0) * 100)}%</div>}
          {photoDiagnostics && <div className="photo-import-status">已导入照片房间草稿 · 尺度 ×{photoDiagnostics.scale.toFixed(2)} · 不确定项 {photoDiagnostics.uncertaintyCount}</div>}
          {selectedWall && <>
            <h2>墙体属性</h2>
            <p className="plan-selection-id">{selectedWall.id} · {selectedWall.kind === 'exterior' ? '外墙' : '隔墙'}</p>
            <NumericField label="墙长" value={getWallLength(selectedWall)} min={0.2} max={50} onChange={updateSelectedWallLength} />
            <NumericField label="墙高" value={selectedWall.height} min={1.8} max={5} onChange={(height) => dispatch({ type: 'UPDATE_WALL', wallId: selectedWall.id, patch: { height } })} />
            <NumericField label="墙厚" value={selectedWall.thickness} min={0.05} max={0.5} onChange={(thickness) => dispatch({ type: 'UPDATE_WALL', wallId: selectedWall.id, patch: { thickness } })} />
            <div className="plan-button-row"><button onClick={() => addOpening('door')}>添加门</button><button onClick={() => addOpening('window')}>添加窗</button></div>
            <button className="danger" onClick={deleteWall}>删除墙体</button>
          </>}
          {selectedOpening && openingWall && <>
            <h2>{selectedOpening.type === 'door' ? '门' : '窗'}属性</h2>
            <p className="plan-selection-id">{selectedOpening.id} · {openingWall.id}</p>
            <NumericField label="宽度" value={selectedOpening.width} min={0.2} max={Math.max(0.2, getWallLength(openingWall) - 0.1)} onChange={(width) => dispatch({ type: 'UPDATE_OPENING', openingId: selectedOpening.id, patch: clampOpeningPatch(selectedOpening, openingWall, { width }) })} />
            <NumericField label="高度" value={selectedOpening.height} min={0.2} max={4} onChange={(height) => dispatch({ type: 'UPDATE_OPENING', openingId: selectedOpening.id, patch: { height } })} />
            <NumericField label="墙上偏移" value={selectedOpening.offset} min={selectedOpening.width / 2} max={Math.max(selectedOpening.width / 2, getWallLength(openingWall) - selectedOpening.width / 2)} onChange={(offset) => dispatch({ type: 'UPDATE_OPENING', openingId: selectedOpening.id, patch: clampOpeningPatch(selectedOpening, openingWall, { offset }) })} />
            {selectedOpening.type === 'window' && <NumericField label="窗台高" value={selectedOpening.sillHeight} min={0} max={3} onChange={(sillHeight) => dispatch({ type: 'UPDATE_OPENING', openingId: selectedOpening.id, patch: { sillHeight } })} />}
            <button className="danger" onClick={() => { dispatch({ type: 'REMOVE_OPENING', openingId: selectedOpening.id }); setSelection({ type: 'none', id: null }) }}>删除门窗</button>
          </>}
          {!selectedWall && !selectedOpening && <div className="plan-empty-state"><strong>选择一个对象</strong><p>直接拖动墙面可平行移动；选中墙体后拖动橙色端点可调整长度。</p></div>}
          {drawStart && <div className="draw-instruction"><strong>画墙模式</strong><span>{drawStart === 'waiting' ? '单击确定起点' : '再次单击确定终点'}</span></div>}
        </aside>
      </section>

      <footer className="floorplan-status">
        <span>{document.walls.length} 面墙 · {document.openings.length} 个门窗</span>
        <span className={validationErrors.length || !closureReport.isClosed ? 'has-errors' : ''}>{validationErrors.length ? `${validationErrors.length} 个数据校验提示` : closureReport.isClosed ? 'RoomDocument 校验通过' : `${openWallIds.length} 面外墙未闭合`}</span>
      </footer>
    </main>
  )
}
