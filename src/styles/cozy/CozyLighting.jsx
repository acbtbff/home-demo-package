import { Environment } from '@react-three/drei'

export default function CozyLighting() {
  return <>
    <ambientLight intensity={1.05} />
    <hemisphereLight intensity={0.65} groundColor="#D8D1C5" color="#F7F4EC" />
    <directionalLight castShadow position={[3.5, 6, 4]} intensity={1.8} color="#FFFDF7" shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00015} />
    <directionalLight position={[-3, 3, -2]} intensity={0.35} color="#EEF2F4" />
    <Environment preset="apartment" environmentIntensity={0.22} />
  </>
}
