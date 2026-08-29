import {
  createSelectFurnitureCommand,
  createToggleGeometryProxyCommand,
  createUpdateFurnitureDimensionsCommand,
  createRotateFurnitureYCommand,
  createAddFurnitureCommand,
  createRemoveFurnitureCommand,
} from '../../domain/interactionCommands.js'

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
        <h3>Furniture</h3>
        <div className="furniture-list">
          {catalogItems.map((item) => (
            <button key={item.catalogId} onClick={() => dispatchFurnitureCommand(createAddFurnitureCommand(item))}>
              添加 {item.name}
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
              {item.name}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2>{furniture.name}</h2>
      <p className="hint">{furniture.semantic.category} · {furniture.semantic.archetype} · {furniture.modelStrategy.resolved} · {furniture.lifecycle.status === 'WISHLIST' ? '想购买' : furniture.lifecycle.status}</p>
      {furniture.product?.price != null && <p className="geometry-proxy-readout">价格：¥{furniture.product.price}</p>}
      {furniture.product?.url && <p className="hint">商品来源：{furniture.product.url}</p>}
      <button className="active" onClick={toggleSelection}>取消选中</button>
      <button onClick={() => dispatchFurnitureCommand(createRemoveFurnitureCommand(furniture.id))}>Remove</button>
      <CmField label="宽度" valueM={furniture.physical.dimensionsM.width} minCm={60} maxCm={300} onChange={(width) => updateDimensions({ width })} />
      <CmField label="深度" valueM={furniture.physical.dimensionsM.depth} minCm={35} maxCm={120} onChange={(depth) => updateDimensions({ depth })} />
      <CmField label="高度" valueM={furniture.physical.dimensionsM.height} minCm={45} maxCm={120} onChange={(height) => updateDimensions({ height })} />
      <DegreeField label="旋转" value={placement.rotationY} onChange={updateRotation} />
      <label className="debug-toggle">
        <input type="checkbox" checked={showGeometryProxy} onChange={(event) => dispatchFurnitureCommand(createToggleGeometryProxyCommand(event.target.checked))} />
        <span>Show GeometryProxy</span>
      </label>
      <p className="geometry-proxy-readout">
        Proxy BOX · {metersToCm(geometryProxy.dimensionsM.width)} × {metersToCm(geometryProxy.dimensionsM.depth)} × {metersToCm(geometryProxy.dimensionsM.height)} cm
      </p>
      {spatialFacts && (
        <p className="geometry-proxy-readout">
          {spatialFacts.collisionDetected ? 'Collision: yes' : 'Collision: no'} · {spatialFacts.outOfBounds ? 'Out of bounds: yes' : 'Out of bounds: no'}
        </p>
      )}
      <div className="furniture-list">
        {furnitureItems.map((item) => (
          <button
            key={item.id}
            className={item.id === furniture.id ? 'primary' : ''}
            onClick={() => dispatchFurnitureCommand(createSelectFurnitureCommand(item.id))}
          >
            {item.name}
          </button>
        ))}
      </div>
      <h3>Furniture</h3>
      <div className="furniture-list">
        {catalogItems.map((item) => (
          <button key={item.catalogId} onClick={() => dispatchFurnitureCommand(createAddFurnitureCommand(item))}>
            添加 {item.name}
          </button>
        ))}
      </div>
    </section>
  )
}
