import {
  createSelectFurnitureCommand,
  createToggleGeometryProxyCommand,
  createUpdateFurnitureDimensionsCommand,
  createRotateFurnitureYCommand,
  createAddFurnitureCommand,
  createRemoveFurnitureCommand,
} from '../../domain/interactionCommands.js'
import {
  formatFurnitureDimensions,
  getFurnitureName,
  getFurnitureRelationLabel,
  getFurnitureTypeLabel,
  getSpatialStatusLabel,
} from '../../presentation/furnitureLabels.js'
import DecisionCard from './DecisionCard.jsx'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const metersToCm = (value) => Math.round((value ?? 0) * 100)
const cmToMeters = (value) => Number((value / 100).toFixed(3))
const radiansToDegrees = (value) => Math.round((value * 180) / Math.PI)
const degreesToRadians = (value) => Number(((value * Math.PI) / 180).toFixed(4))

function CmField({ label, valueM, minCm, maxCm, onChange }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input
          type="number"
          value={metersToCm(valueM)}
          min={minCm}
          max={maxCm}
          step="1"
          onChange={(event) => onChange(cmToMeters(clamp(Number(event.target.value), minCm, maxCm)))}
        />
        <small>cm</small>
      </span>
    </label>
  )
}

function DegreeField({ label, value, onChange }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input
          type="number"
          value={radiansToDegrees(value)}
          min="-180"
          max="180"
          step="1"
          onChange={(event) => onChange(degreesToRadians(clamp(Number(event.target.value), -180, 180)))}
        />
        <small>deg</small>
      </span>
    </label>
  )
}

export default function FurnitureInspector({
  furnitureItems = [],
  furniture,
  placement,
  geometryProxy,
  spatialFacts = null,
  selected,
  showGeometryProxy,
  dispatchFurnitureCommand,
  catalogItems = [],
  roomDocument = null,
  spatialAnalysis = null,
  userProfile = {},
}) {
  const toggleSelection = () => {
    if (!furniture || !dispatchFurnitureCommand) return
    dispatchFurnitureCommand(createSelectFurnitureCommand(selected ? null : furniture.id))
  }
  const updateDimensions = (patch) => {
    if (!furniture || !dispatchFurnitureCommand) return
    dispatchFurnitureCommand(createUpdateFurnitureDimensionsCommand({ furnitureId: furniture.id, patch }))
  }
  const updateRotation = (rotationY) => {
    if (!furniture || !placement || !dispatchFurnitureCommand) return
    dispatchFurnitureCommand(createRotateFurnitureYCommand({ furnitureId: furniture.id, deltaRadians: rotationY - placement.rotationY }))
  }

  if (!selected || !furniture || !placement) {
    return (
      <section>
        <h2>家具</h2>
        <p className="hint">单击家具或从列表选择后可拖动、旋转并编辑尺寸。</p>
        <h3>添加家具</h3>
        <div className="furniture-list">
          {catalogItems.map((item) => (
            <button key={item.catalogId} onClick={() => dispatchFurnitureCommand(createAddFurnitureCommand(item))}>
              放入小屋 · {getFurnitureName(item)}
            </button>
          ))}
        </div>
        <div className="furniture-list">
          {furnitureItems.map((item) => (
            <button
              key={item.id}
              className={item.id === furniture.id ? 'primary' : ''}
              onClick={() => dispatchFurnitureCommand(createSelectFurnitureCommand(item.id))}
            >
              {getFurnitureName(item)}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2>{getFurnitureName(furniture)}</h2>
      <p className="hint">{getFurnitureTypeLabel(furniture)} · {formatFurnitureDimensions(furniture)} · {getFurnitureRelationLabel(furniture)}</p>
      {furniture.product?.price != null && <p className="geometry-proxy-readout">价格：¥{furniture.product.price}</p>}
      {furniture.product?.url && <p className="hint">商品来源：{furniture.product.url}</p>}
      <button className="active" onClick={toggleSelection}>取消选中</button>
      <button onClick={() => dispatchFurnitureCommand(createRemoveFurnitureCommand(furniture.id))}>删除家具</button>
      <CmField label="宽度" valueM={furniture.physical.dimensionsM.width} minCm={60} maxCm={300} onChange={(width) => updateDimensions({ width })} />
      <CmField label="深度" valueM={furniture.physical.dimensionsM.depth} minCm={35} maxCm={120} onChange={(depth) => updateDimensions({ depth })} />
      <CmField label="高度" valueM={furniture.physical.dimensionsM.height} minCm={45} maxCm={120} onChange={(height) => updateDimensions({ height })} />
      <DegreeField label="旋转" value={placement.rotationY} onChange={updateRotation} />
      {import.meta.env.DEV && <>
        <label className="debug-toggle">
          <input type="checkbox" checked={showGeometryProxy} onChange={(event) => dispatchFurnitureCommand(createToggleGeometryProxyCommand(event.target.checked))} />
          <span>显示调试碰撞框</span>
        </label>
        {geometryProxy && <p className="geometry-proxy-readout">
          调试尺寸 · {metersToCm(geometryProxy.dimensionsM.width)} × {metersToCm(geometryProxy.dimensionsM.depth)} × {metersToCm(geometryProxy.dimensionsM.height)} cm
        </p>}
      </>}
      {getSpatialStatusLabel(spatialFacts) && <p className={`spatial-status ${spatialFacts?.collisionDetected || spatialFacts?.outOfBounds ? 'warning' : 'ok'}`}>
        {getSpatialStatusLabel(spatialFacts)}
      </p>}
      <DecisionCard key={furniture.id} furniture={furniture} placement={placement} roomDocument={roomDocument} spatialAnalysis={spatialAnalysis} userProfile={userProfile} />
      <div className="furniture-list">
        {furnitureItems.map((item) => (
          <button
            key={item.id}
            className={item.id === furniture.id ? 'primary' : ''}
            onClick={() => dispatchFurnitureCommand(createSelectFurnitureCommand(item.id))}
          >
            {getFurnitureName(item)}
          </button>
        ))}
      </div>
      <h3>添加家具</h3>
      <div className="furniture-list">
        {catalogItems.map((item) => (
          <button key={item.catalogId} onClick={() => dispatchFurnitureCommand(createAddFurnitureCommand(item))}>
            放入小屋 · {getFurnitureName(item)}
          </button>
        ))}
      </div>
    </section>
  )
}
