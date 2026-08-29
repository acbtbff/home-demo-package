import { GEOMETRY_PROXY_PIVOTS, GEOMETRY_PROXY_SHAPES } from '../../domain/spatialContracts.js'

export default function GeometryProxyBox({ geometryProxy, warning = false }) {
  if (geometryProxy?.shape !== GEOMETRY_PROXY_SHAPES.BOX || geometryProxy?.pivot !== GEOMETRY_PROXY_PIVOTS.BOTTOM_CENTER) return null

  const width = geometryProxy.dimensionsM.width ?? 0.01
  const depth = geometryProxy.dimensionsM.depth ?? 0.01
  const height = geometryProxy.dimensionsM.height ?? 0.01

  return (
    <mesh
      name={`geometry-proxy:${geometryProxy.furnitureId}`}
      position={[0, height / 2, 0]}
      userData={{ geometryProxy: true, furnitureId: geometryProxy.furnitureId }}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={warning ? '#ef4444' : '#0ea5e9'} transparent opacity={warning ? 0.28 : 0.16} roughness={0.4} wireframe />
    </mesh>
  )
}
