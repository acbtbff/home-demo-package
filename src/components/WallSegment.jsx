import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getWallAngle, getWallCenter, getWallLength } from '../domain/roomGeometry.js'

function WallBox({ center, span, height, thickness, color, materialRef }) {
  if (span <= 0.001 || height <= 0.001) return null

  return (
    <mesh position={[center, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[span, height, thickness]} />
      <meshStandardMaterial ref={materialRef} color={color} roughness={0.88} metalness={0} />
    </mesh>
  )
}

function wallParts(wall, openings) {
  const length = getWallLength(wall)
  const renderHeight = wall.displayHeight ?? wall.height
  const sortedOpenings = [...openings].sort((a, b) => a.offset - b.offset)
  const parts = []
  let cursor = 0

  for (const opening of sortedOpenings) {
    const openingStart = Math.max(0, opening.offset - opening.width / 2)
    const openingEnd = Math.min(length, opening.offset + opening.width / 2)
    const gap = Math.max(0, openingStart - cursor)
    const openingSpan = Math.max(0, openingEnd - openingStart)
    const sillHeight = Math.min(opening.sillHeight ?? 0, renderHeight)
    const openingHeight = Math.min(opening.height, Math.max(0, renderHeight - sillHeight))
    const headerHeight = Math.max(0, renderHeight - sillHeight - openingHeight)

    if (gap > 0) {
      parts.push({ key: `${opening.id}-before`, center: -length / 2 + cursor + gap / 2, span: gap, y: 0, height: renderHeight })
    }
    if (sillHeight > 0) {
      parts.push({ key: `${opening.id}-sill`, center: -length / 2 + openingStart + openingSpan / 2, span: openingSpan, y: 0, height: sillHeight })
    }
    if (headerHeight > 0) {
      parts.push({
        key: `${opening.id}-header`,
        center: -length / 2 + openingStart + openingSpan / 2,
        span: openingSpan,
        y: sillHeight + openingHeight,
        height: headerHeight,
      })
    }
    cursor = Math.max(cursor, openingEnd)
  }

  if (cursor < length) {
    parts.push({ key: 'after-openings', center: -length / 2 + cursor + (length - cursor) / 2, span: length - cursor, y: 0, height: renderHeight })
  }

  return parts
}

/** Generic wall renderer. Local X follows wall.start -> wall.end. */
function WallSegment({ wall, openings, color, roomCenter = { x: 0, z: 0 } }) {
  const materialsRef = useRef([])
  const length = getWallLength(wall)
  const center = getWallCenter(wall)
  const angle = getWallAngle(wall)
  const parts = wallParts(wall, openings)

  useFrame(({ camera }) => {
    const cameraX = camera.position.x - roomCenter.x
    const cameraZ = camera.position.z - roomCenter.z
    const wallX = center.x - roomCenter.x
    const wallZ = center.z - roomCenter.z
    const facingWall = Math.hypot(wallX, wallZ) > 0.1 && Math.hypot(cameraX, cameraZ) > 0.001
      && wallX * cameraX + wallZ * cameraZ > 0
    materialsRef.current.forEach((material) => {
      if (!material) return
      const nextTransparent = facingWall
      const nextOpacity = facingWall ? 0.16 : 1
      if (material.transparent !== nextTransparent || material.opacity !== nextOpacity || material.depthWrite === facingWall) {
        material.transparent = nextTransparent
        material.opacity = nextOpacity
        material.depthWrite = !facingWall
        material.needsUpdate = true
      }
    })
  })

  return (
    <group
      name={`wall:${wall.id}`}
      position={[center.x, 0, center.z]}
      rotation={[0, -angle, 0]}
      userData={{ wallId: wall.id, length }}
    >
      {parts.map((part, index) => (
        <group key={part.key} position={[0, part.y, 0]}>
          <WallBox center={part.center} span={part.span} height={part.height} thickness={wall.thickness} color={color} materialRef={(material) => { materialsRef.current[index] = material }} />
        </group>
      ))}
      {openings.filter((opening) => opening.type === 'window').map((opening) => (
        <mesh
          key={`${opening.id}-glass`}
          position={[-length / 2 + opening.offset, opening.sillHeight + opening.height / 2, 0]}
        >
          <boxGeometry args={[opening.width, opening.height, wall.thickness * 0.35]} />
          <meshPhysicalMaterial color="#bde3f2" transparent opacity={0.42} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

export default WallSegment
