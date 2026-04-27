import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { TeleportPad } from './TeleportPad'
import { BrickText } from './BrickText'
import { mulberry32 } from './rng'
import { PAD_RADIUS, ZONE_ANGLE } from './zones/zones'
import { isMobile } from '../lib/responsive'

const TREES = [
  '/nature/MapleTree_1.gltf',
  '/nature/MapleTree_3.gltf',
  '/nature/BirchTree_1.gltf',
  '/nature/BirchTree_3.gltf',
  '/nature/DeadTree_5.gltf',
] as const
const BUSHES = [
  '/nature/Bush.gltf',
  '/nature/Bush_Flowers.gltf',
  '/nature/Bush_Small_Flowers.gltf',
] as const

;[...TREES, ...BUSHES].forEach((u) => useGLTF.preload(u))

// 3 lamps on the OUTER perimeter (r=18, far from the central teleport pads).
// Center area stays clean.
const LAMP_COUNT = 3
const LAMP_RADIUS = 18
const BUSH_CLUSTER_COUNT = 3
const BUSH_OUTER_RADIUS = 10.8 // sát mép ngoài rim hub r=10
const BUSH_TANGENT = 2.5
const BUSH_SCALE_MULT = 3

// rotation_y to face origin from a position at angle θ on a circle.
const faceCenter = (theta: number) => -theta - Math.PI / 2

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

// Custom lamp built from primitives — simple, reliable, no GLB surprises.
function HubLamp({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 3.6, 12]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Lamp head bracket */}
      <mesh position={[0, 3.7, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 0.25, 8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Glowing bulb */}
      <mesh position={[0, 4.05, 0]} castShadow>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial
          color="#ffd07a"
          emissive="#ffb627"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>
      {/* Bulb point light */}
      <pointLight
        position={[0, 4.05, 0]}
        color="#ffd07a"
        intensity={6}
        distance={12}
        decay={1.6}
      />
    </group>
  )
}

export function Hub() {
  // 3 lamps at 0°/120°/240° on the outer perimeter (r=18), facing center.
  const lamps = useMemo(() => {
    return Array.from({ length: LAMP_COUNT }, (_, i) => {
      const theta = (i / LAMP_COUNT) * Math.PI * 2
      return {
        position: [
          Math.cos(theta) * LAMP_RADIUS,
          0,
          Math.sin(theta) * LAMP_RADIUS,
        ] as [number, number, number],
        rotation: [0, faceCenter(theta), 0] as [number, number, number],
      }
    })
  }, [])

  // 3 bush clusters spaced evenly around the rim. rotation_y = 0.
  const bushClusters = useMemo(() => {
    const out: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    const rng = mulberry32(909)
    for (let c = 0; c < BUSH_CLUSTER_COUNT; c++) {
      const theta = Math.PI / 3 + (c / BUSH_CLUSTER_COUNT) * Math.PI * 2
      const cx = Math.cos(theta) * BUSH_OUTER_RADIUS
      const cz = Math.sin(theta) * BUSH_OUTER_RADIUS
      const tx = -Math.sin(theta)
      const tz = Math.cos(theta)
      for (const j of [-1, 0, 1]) {
        out.push({
          url: BUSHES[Math.floor(rng() * BUSHES.length)],
          position: [cx + j * BUSH_TANGENT * tx, 0, cz + j * BUSH_TANGENT * tz],
          scale: (0.55 + (rng() - 0.5) * 0.1) * BUSH_SCALE_MULT,
        })
      }
    }
    return out
  }, [])

  // Outer trees — backdrop forest just past the bush ring. Halved on
  // mobile to keep first-paint cheap; the dark fog hides the gaps.
  const trees = useMemo(() => {
    const rng = mulberry32(7373)
    const count = isMobile() ? 11 : 22
    const arr: {
      url: string
      position: [number, number, number]
      rotation: [number, number, number]
      scale: number
    }[] = []
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.18
      const r = 21 + rng() * 5
      arr.push({
        url: TREES[Math.floor(rng() * TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.6 + rng() * 0.6,
      })
    }
    return arr
  }, [])

  return (
    <group>
      {/* Sandy hub stage */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial
          color="#6e5530"
          emissive="#1a0e22"
          emissiveIntensity={0.4}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Outer magenta neon rim — bushes hug just outside this */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[9.85, 10.05, 96]} />
        <meshStandardMaterial
          color="#ff44dd"
          emissive="#ff44dd"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      {/* Inner cyan ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[3.5, 3.7, 64]} />
        <meshStandardMaterial
          color="#44ddff"
          emissive="#44ddff"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Three teleport pads pointing toward each zone */}
      <TeleportPad
        to="football"
        position={[
          Math.cos(ZONE_ANGLE.football) * PAD_RADIUS,
          0,
          Math.sin(ZONE_ANGLE.football) * PAD_RADIUS,
        ]}
      />
      <TeleportPad
        to="crypto"
        position={[
          Math.cos(ZONE_ANGLE.crypto) * PAD_RADIUS,
          0,
          Math.sin(ZONE_ANGLE.crypto) * PAD_RADIUS,
        ]}
      />
      <TeleportPad
        to="news"
        position={[
          Math.cos(ZONE_ANGLE.news) * PAD_RADIUS,
          0,
          Math.sin(ZONE_ANGLE.news) * PAD_RADIUS,
        ]}
      />
      <TeleportPad
        to="profile"
        position={[
          Math.cos(ZONE_ANGLE.profile) * PAD_RADIUS,
          0,
          Math.sin(ZONE_ANGLE.profile) * PAD_RADIUS,
        ]}
        tone="gold"
      />

      {/* Lamps on outer perimeter (r=18) — custom mesh, single lamp each */}
      {lamps.map((l, i) => (
        <HubLamp key={`lamp-${i}`} position={l.position} />
      ))}

      {/* Bush clusters — static, rotation_y = 0 */}
      {bushClusters.map((b, i) => (
        <StaticProp
          key={`bush-${i}`}
          url={b.url}
          position={b.position}
          rotation={[0, 0, 0]}
          scale={b.scale}
        />
      ))}

      {/* Outer trees — static */}
      {trees.map((t, i) => (
        <StaticProp
          key={`tree-${i}`}
          url={t.url}
          position={t.position}
          rotation={t.rotation}
          scale={t.scale}
        />
      ))}

      {/* "ARENA" decoration in magenta, behind the stage on the grass.
          (Brick text bricks are flyable and serve as the physics baseline.) */}
      <BrickText
        text="ARENA"
        position={[-4.7, 0, -16]}
        brickSize={0.55}
        color="#ff44dd"
      />
    </group>
  )
}
