import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { Box3, Color, Vector3 } from 'three'
import { calculateLibraryVisualCalibration } from '../../domain/furnitureAssets.js'
import { applyCozyMaterial } from '../../styles/cozy/cozyMaterial.js'

const WARNING_COLOR = new Color('#ef4444')

export default function LibraryGlbModel({ furniture, asset, warning = false, styleMode = 'ORIGINAL' }) {
  const { scene } = useGLTF(asset.modelUrl)
  const { model, offset, scale, aspectRatioWarning } = useMemo(() => {
    const cloned = scene.clone(true)
    const normalization = asset.normalization
    cloned.rotation.set(
      normalization.rotationX,
      normalization.rotationY,
      normalization.rotationZ,
      normalization.rotationOrder,
    )
    cloned.position.set(normalization.offsetX, normalization.offsetY, normalization.offsetZ)
    cloned.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(cloned)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const dimensions = furniture.physical.dimensionsM
    const calibration = calculateLibraryVisualCalibration({
      assetDimensionsM: { width: size.x, depth: size.z, height: size.y },
      targetDimensionsM: dimensions,
    })

    cloned.traverse((object) => {
      if (!object.isMesh) return
      object.castShadow = true
      object.receiveShadow = true
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const clonedMaterials = materials.map((material) => {
        const next = material.clone()
        if (warning && next.color) next.color.copy(WARNING_COLOR)
        return next
      })
      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0]
    })
    if (styleMode === 'COZY_V0') applyCozyMaterial(cloned)

    return {
      model: cloned,
      offset: [-center.x, -bounds.min.y, -center.z],
      scale: calibration.scale ?? [1, 1, 1],
      aspectRatioWarning: calibration.severeAspectMismatch,
    }
  }, [asset.normalization, furniture.physical.dimensionsM, scene, warning, styleMode])

  return (
    <group
      name={`visual-model:${String(furniture.modelStrategy.resolved ?? 'glb').toLowerCase()}-${furniture.semantic.archetype.toLowerCase()}`}
      scale={scale}
      userData={{ visualModel: true, strategy: furniture.modelStrategy.resolved, archetype: furniture.semantic.archetype, assetId: asset.id, aspectRatioWarning: Boolean(aspectRatioWarning) }}
    >
      <primitive object={model} position={offset} />
    </group>
  )
}

useGLTF.preload('/assets/furniture/two-seat-sofa.glb')
useGLTF.preload('/assets/furniture/office-chair.glb')
useGLTF.preload('/assets/furniture/floor-lamp.glb')
