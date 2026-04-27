import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { useMarketStore } from '../../store/markets'
import { Pillar } from '../Pillar'
import { BrickText } from '../BrickText'
import { TeleportPad } from '../TeleportPad'
import { Flyable } from '../Flyable'
import { mulberry32 } from '../rng'
import { ZONE_CENTER } from './zones'

const FOREST_TREES = [
  '/nature/MapleTree_1.gltf',
  '/nature/MapleTree_2.gltf',
  '/nature/MapleTree_3.gltf',
  '/nature/BirchTree_1.gltf',
  '/nature/BirchTree_3.gltf',
  '/nature/BirchTree_5.gltf',
  '/nature/DeadTree_3.gltf',
  '/nature/DeadTree_7.gltf',
] as const

const BUSHES = [
  '/nature/Bush.gltf',
  '/nature/Bush_Flowers.gltf',
  '/nature/Bush_Small_Flowers.gltf',
] as const

const CONE = '/kenney-roads/construction-cone.glb'
;[...FOREST_TREES, ...BUSHES, CONE].forEach((u) => useGLTF.preload(u))

const TINT_OPEN = '#5fff7a'
const PILLAR_RADIUS = 4

// No lamps in zones — they were blocking the click area for the central
// teleport return pad.
const BUSH_CLUSTER_COUNT = 3
const BUSH_OUTER_RADIUS = 14.6
const BUSH_TANGENT = 2.5

// Camera approaches from zone-local +z (world camera at z=-42 vs zone z=-55).
// Skip a 60° arc centered on +z for inner forest belts so trees never sit
// in the camera-to-pillar sight line.
const HUB_DIR_DEG = 90 // direction in zone-local pointing toward hub (+z)
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

function FlyableProp({
  url,
  position,
  rotationY,
  scale,
}: {
  url: string
  position: [number, number, number]
  rotationY: number
  scale: number
}) {
  const gltf = useGLTF(url)
  return (
    <Flyable initialPos={position} initialRotY={rotationY} scale={scale}>
      <Clone object={gltf.scene} />
    </Flyable>
  )
}

function GoalPost({ position }: { position: [number, number, number] }) {
  // The goalpost is a small cluster of 3 cylinders. Wrap as a single
  // flyable group so the whole post tumbles together when clicked.
  return (
    <Flyable initialPos={position} scale={1}>
      <mesh position={[-1.6, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.6, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[1.6, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.6, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3.2, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
    </Flyable>
  )
}

export function FootballZone() {
  const allMarkets = useMarketStore((s) => s.markets)
  const markets = allMarkets.filter((m) => m.category === 'football')
  const center = ZONE_CENTER.football

  // 3 bush clusters outside the disc, equilateral spacing.
  // rotation_y = 0 (bushes vertically symmetric).
  const bushClusters = useMemo(() => {
    const out: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    const rng = mulberry32(31)
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

  // Cones along the disc edge — flyable
  const cones = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const theta = (i / 10) * Math.PI * 2 + Math.PI / 12
      const r = 13.4
      return {
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r] as [number, number, number],
        rotationY: 0,
      }
    })
  }, [])

  // Forest belts. Each belt skips the 60° arc facing the hub so the
  // camera approach line stays clear.
  const forestBelts = useMemo(() => {
    const rng = mulberry32(2331)
    const arr: {
      url: string
      position: [number, number, number]
      rotation: [number, number, number]
      scale: number
    }[] = []
    const skipMin = (HUB_DIR_DEG - HUB_SKIP_HALF_DEG) * (Math.PI / 180)
    const skipMax = (HUB_DIR_DEG + HUB_SKIP_HALF_DEG) * (Math.PI / 180)
    const inSkipArc = (theta: number) => {
      const t = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      return t > skipMin && t < skipMax
    }
    // Belt 1 — sparse, close: r=18..22, 12 trees
    let placed = 0
    while (placed < 12) {
      const theta = rng() * Math.PI * 2
      if (inSkipArc(theta)) continue
      const r = 18 + rng() * 4
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.6 + rng() * 0.4,
      })
      placed++
    }
    // Belt 2 — medium, mid: r=24..32, 22 trees
    placed = 0
    while (placed < 22) {
      const theta = rng() * Math.PI * 2
      if (inSkipArc(theta)) continue
      const r = 24 + rng() * 8
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.7 + rng() * 0.5,
      })
      placed++
    }
    // Belt 3 — densest, far: r=34..50, 32 trees
    placed = 0
    while (placed < 32) {
      const theta = rng() * Math.PI * 2
      if (inSkipArc(theta)) continue
      const r = 34 + rng() * 16
      arr.push({
        url: FOREST_TREES[Math.floor(rng() * FOREST_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.7 + rng() * 0.6,
      })
      placed++
    }
    return arr
  }, [])

  return (
    <group position={center}>
      {/* Pitch */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color="#3a6b25"
          emissive="#1a3315"
          emissiveIntensity={0.4}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {[-1, 1].map((s, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.006, s * 4]}
        >
          <ringGeometry args={[Math.abs(s * 4) - 1, Math.abs(s * 4) + 1, 64]} />
          <meshStandardMaterial color="#2d5418" roughness={1} />
        </mesh>
      ))}
      {/* Center circle white line — bushes hug just outside this */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[5.5, 5.6, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      <GoalPost position={[0, 0, -11]} />
      <GoalPost position={[0, 0, 11]} />

      {/* Pitch fill light */}
      <pointLight position={[0, 8, 0]} color="#5fff7a" intensity={4} distance={16} />

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

      {/* Cones (flyable) */}
      {cones.map((c, i) => (
        <FlyableProp
          key={`cone-${i}`}
          url={CONE}
          position={c.position}
          rotationY={c.rotationY}
          scale={1.2}
        />
      ))}

      {/* 3-belt forest, density grows outward */}
      {forestBelts.map((t, i) => (
        <StaticProp
          key={`tree-${i}`}
          url={t.url}
          position={t.position}
          rotation={t.rotation}
          scale={t.scale}
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

      {/* Brick text "GOL" on far side of zone (away from camera) */}
      <BrickText
        text="GOL"
        position={[-2.0, 0, -8.5]}
        brickSize={0.55}
        color="#5fff7a"
      />
    </group>
  )
}
