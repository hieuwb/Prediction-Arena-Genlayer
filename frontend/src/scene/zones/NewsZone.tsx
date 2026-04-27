import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { useMarketStore } from '../../store/markets'
import { Pillar } from '../Pillar'
import { BrickText } from '../BrickText'
import { TeleportPad } from '../TeleportPad'
import { mulberry32 } from '../rng'
import { ZONE_CENTER } from './zones'

const FOREST_TREES = [
  '/nature/DeadTree_1.gltf',
  '/nature/DeadTree_3.gltf',
  '/nature/DeadTree_5.gltf',
  '/nature/DeadTree_7.gltf',
  '/nature/DeadTree_9.gltf',
  '/nature/BirchTree_1.gltf',
  '/nature/BirchTree_3.gltf',
  '/nature/BirchTree_5.gltf',
  '/nature/MapleTree_1.gltf',
  '/nature/MapleTree_3.gltf',
] as const

const BUSHES = [
  '/nature/Bush.gltf',
  '/nature/Bush_Flowers.gltf',
  '/nature/Bush_Small_Flowers.gltf',
] as const

;[...FOREST_TREES, ...BUSHES].forEach((u) => useGLTF.preload(u))

const TINT_OPEN = '#a06bff'
const PILLAR_RADIUS = 4

// No lamps in zones — they were blocking the click area for the central
// teleport return pad.
const BUSH_CLUSTER_COUNT = 3
const BUSH_OUTER_RADIUS = 14.6
const BUSH_TANGENT = 2.5

// News camera approaches from -X (in zone-local that's +x because zone is at
// world -55, camera at world -42, so camera-zone delta = +13 along world +x,
// in zone-local that corresponds to zone-local +x). Skip 60° arc around +x.
const HUB_DIR_DEG = 0
const HUB_SKIP_HALF_DEG = 30

function StaticProp({
  url,
  position,
  rotation,
  scale,
}: {
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}) {
  const gltf = useGLTF(url)
  return (
    <Clone
      object={gltf.scene}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
    />
  )
}

export function NewsZone() {
  const allMarkets = useMarketStore((s) => s.markets)
  const markets = allMarkets.filter((m) => m.category === 'news')
  const center = ZONE_CENTER.news

  // 3 bush clusters outside the disc, equilateral spacing. rotation_y=0.
  const bushClusters = useMemo(() => {
    const out: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    const rng = mulberry32(73)
    for (let c = 0; c < BUSH_CLUSTER_COUNT; c++) {
      const theta = Math.PI / 6 + (c / BUSH_CLUSTER_COUNT) * Math.PI * 2
      const cx = Math.cos(theta) * BUSH_OUTER_RADIUS
      const cz = Math.sin(theta) * BUSH_OUTER_RADIUS
      const tx = -Math.sin(theta)
      const tz = Math.cos(theta)
      for (const j of [-1, 0, 1]) {
        out.push({
          url: BUSHES[Math.floor(rng() * BUSHES.length)],
          position: [cx + j * BUSH_TANGENT * tx, 0, cz + j * BUSH_TANGENT * tz],
          scale: (0.5 + (rng() - 0.5) * 0.1) * 3,
        })
      }
    }
    return out
  }, [])

  // Forest belts — denser than Football because the news theme is forest
  const forestBelts = useMemo(() => {
    const rng = mulberry32(7373)
    const arr: {
      url: string
      position: [number, number, number]
      rotation: [number, number, number]
      scale: number
    }[] = []
    const skipMin = (HUB_DIR_DEG - HUB_SKIP_HALF_DEG) * (Math.PI / 180)
    const skipMax = (HUB_DIR_DEG + HUB_SKIP_HALF_DEG) * (Math.PI / 180)
    const inSkipArc = (theta: number) => {
      // Normalize theta to [-π, π] for symmetric check around 0
      let t = theta
      while (t > Math.PI) t -= Math.PI * 2
      while (t < -Math.PI) t += Math.PI * 2
      return t > skipMin && t < skipMax
    }
    // Belt 1 — close: r=15..22, 18 trees
    let placed = 0
    while (placed < 18) {
      const theta = rng() * Math.PI * 2
      if (inSkipArc(theta - Math.PI)) {
        // shift so 0 means hub direction
      }
      // simpler: use regular check
      if (Math.cos(theta) > Math.cos(HUB_SKIP_HALF_DEG * (Math.PI / 180))) continue
      const r = 15 + rng() * 7
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.55 + rng() * 0.45,
      })
      placed++
    }
    // Belt 2 — mid: r=24..32, 28 trees
    placed = 0
    while (placed < 28) {
      const theta = rng() * Math.PI * 2
      if (Math.cos(theta) > Math.cos(HUB_SKIP_HALF_DEG * (Math.PI / 180))) continue
      const r = 24 + rng() * 8
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.6 + rng() * 0.5,
      })
      placed++
    }
    // Belt 3 — densest, far: r=34..52, 42 trees
    placed = 0
    while (placed < 42) {
      const theta = rng() * Math.PI * 2
      if (Math.cos(theta) > Math.cos(HUB_SKIP_HALF_DEG * (Math.PI / 180))) continue
      const r = 34 + rng() * 18
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.65 + rng() * 0.6,
      })
      placed++
    }
    return arr
  }, [])

  // Forest-floor scattered bushes — all outside zone disc (r > 14) per spec
  const floorBushes = useMemo(() => {
    const rng = mulberry32(733)
    const arr: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    for (let i = 0; i < 24; i++) {
      const theta = rng() * Math.PI * 2
      const r = 16 + rng() * 9 // 16..25 — outside disc, between belts
      arr.push({
        url: BUSHES[Math.floor(rng() * BUSHES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        scale: (0.4 + rng() * 0.4) * 3,
      })
    }
    return arr
  }, [])

  return (
    <group position={center}>
      {/* Dark mossy forest floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#2a3322" roughness={1} metalness={0} />
      </mesh>
      {/* Brick ring inner edge — bushes hug outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[5.4, 6.2, 64]} />
        <meshStandardMaterial color="#a06340" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[5.4, 5.5, 64]} />
        <meshBasicMaterial color="#3a2418" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[6.1, 6.2, 64]} />
        <meshBasicMaterial color="#3a2418" />
      </mesh>

      {/* Atmospheric lights */}
      <pointLight position={[0, 8, 0]} color="#8a55ff" intensity={5} distance={18} />
      <pointLight position={[3, 0.6, 3]} color="#ffb070" intensity={2} distance={5} />
      <pointLight position={[-3, 0.6, -3]} color="#ffb070" intensity={2} distance={5} />

      {/* Bush clusters (static) — outside disc, rotation_y = 0 */}
      {bushClusters.map((b, i) => (
        <StaticProp
          key={`bush-${i}`}
          url={b.url}
          position={b.position}
          rotation={[0, 0, 0]}
          scale={b.scale}
        />
      ))}

      {/* Forest 3-belt density */}
      {forestBelts.map((t, i) => (
        <StaticProp key={`tree-${i}`} {...t} />
      ))}

      {/* Floor bushes scattered (outside disc) */}
      {floorBushes.map((b, i) => (
        <StaticProp
          key={`fb-${i}`}
          url={b.url}
          position={b.position}
          rotation={[0, 0, 0]}
          scale={b.scale}
        />
      ))}

      {markets.slice(0, 3).map((m, i) => {
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 2
        return (
          <Pillar
            key={m.id}
            market={m}
            position={[
              Math.cos(angle) * PILLAR_RADIUS,
              0,
              Math.sin(angle) * PILLAR_RADIUS,
            ]}
            tintOpen={TINT_OPEN}
          />
        )
      })}

      <TeleportPad to="hub" position={[0, 0, 0]} variant="return" />

      {/* "USA" brick text on far side */}
      <BrickText
        text="USA"
        position={[-8, 0, -2]}
        brickSize={0.5}
        color="#a06bff"
        rotationY={-Math.PI / 2}
      />
    </group>
  )
}
