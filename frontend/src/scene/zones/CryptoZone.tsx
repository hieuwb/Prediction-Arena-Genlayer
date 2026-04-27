import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { useMarketStore } from '../../store/markets'
import { Pillar } from '../Pillar'
import { BrickText } from '../BrickText'
import { TeleportPad } from '../TeleportPad'
import { Flyable } from '../Flyable'
import { mulberry32 } from '../rng'
import { ZONE_CENTER } from './zones'

const SKYSCRAPERS = [
  '/kenney-city/building-skyscraper-a.glb',
  '/kenney-city/building-skyscraper-b.glb',
  '/kenney-city/building-skyscraper-c.glb',
  '/kenney-city/building-skyscraper-d.glb',
  '/kenney-city/building-skyscraper-e.glb',
] as const
const ANTENNA = '/folio2025/defaultAntenna.glb'
const DEAD_TREES = [
  '/nature/DeadTree_1.gltf',
  '/nature/DeadTree_5.gltf',
  '/nature/DeadTree_8.gltf',
] as const
const BUSHES = [
  '/nature/Bush.gltf',
  '/nature/Bush_Flowers.gltf',
  '/nature/Bush_Small_Flowers.gltf',
] as const
;[
  ...SKYSCRAPERS,
  ANTENNA,
  ...DEAD_TREES,
  ...BUSHES,
].forEach((u) => useGLTF.preload(u))

const TINT_OPEN = '#22d4f0'
const PILLAR_RADIUS = 4

// No lamps in zones — they were blocking the click area for the central
// teleport return pad.
const BUSH_CLUSTER_COUNT = 3
const BUSH_OUTER_RADIUS = 14.6
const BUSH_TANGENT = 2.5

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

export function CryptoZone() {
  const allMarkets = useMarketStore((s) => s.markets)
  const markets = allMarkets.filter((m) => m.category === 'crypto')
  const center = ZONE_CENTER.crypto

  // 3 bush clusters outside the disc, equilateral spacing. rotation_y=0.
  const bushClusters = useMemo(() => {
    const out: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    const rng = mulberry32(53)
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

  // Buildings + antennas + dead trees — all kept, only buildings + skyscrapers
  // are static (shadow + footprint), antennas + dead trees stay non-flyable
  // (they're "fixed structures"). Per spec, only non-flora flies, but a 30m
  // skyscraper flying around would look silly so we keep buildings static
  // for performance + believability.
  const decor = useMemo(() => {
    const rng = mulberry32(531)
    const arr: {
      url: string
      position: [number, number, number]
      rotation: [number, number, number]
      scale: number
    }[] = []
    for (let i = 0; i < 12; i++) {
      const theta = (i / 12) * Math.PI * 2 + (rng() - 0.5) * 0.18
      const r = 20 + rng() * 4
      arr.push({
        url: SKYSCRAPERS[Math.floor(rng() * SKYSCRAPERS.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 1.9 + rng() * 1.0,
      })
    }
    for (let i = 0; i < 6; i++) {
      const theta = (i / 6) * Math.PI * 2 + Math.PI / 5
      const r = 15 + rng() * 3
      arr.push({
        url: DEAD_TREES[Math.floor(rng() * DEAD_TREES.length)],
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: [0, rng() * Math.PI * 2, 0],
        scale: 0.55 + rng() * 0.35,
      })
    }
    // No more inside-disc bushes — per spec, all bushes must be outside r=14
    return arr
  }, [])

  // Antennas at zone-local r=14 in a back-and-sides arc — flyable
  const antennas = useMemo(() => {
    const rng = mulberry32(577)
    return Array.from({ length: 5 }, (_, i) => {
      const theta = -Math.PI / 2 + (i / 5) * Math.PI * 1.5
      const r = 14
      return {
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r] as [number, number, number],
        rotationY: rng() * Math.PI * 2,
        scale: 1.4 + rng() * 0.3,
      }
    })
  }, [])

  return (
    <group position={center}>
      {/* Dark navy plaza */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#141a36" roughness={0.95} metalness={0.15} />
      </mesh>
      {/* Inner cyan ring — bushes hug outside this */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <ringGeometry args={[6.4, 6.6, 80]} />
        <meshStandardMaterial
          color="#22d4f0"
          emissive="#22d4f0"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      {/* Outer purple ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[12.6, 12.85, 96]} />
        <meshStandardMaterial
          color="#7755ee"
          emissive="#7755ee"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      {/* Cross "data lanes" */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, -angle]}
            position={[0, 0.009, 0]}
          >
            <planeGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#22d4f0" transparent opacity={0.55} />
          </mesh>
        )
      })}

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

      {/* Skyscrapers + dead trees + bushes (static — buildings flying would
          look ridiculous and tank perf) */}
      {decor.map((d, i) => (
        <StaticProp key={`d-${i}`} {...d} />
      ))}

      {/* Antennas — flyable */}
      {antennas.map((a, i) => (
        <FlyableProp
          key={`ant-${i}`}
          url={ANTENNA}
          position={a.position}
          rotationY={a.rotationY}
          scale={a.scale}
        />
      ))}

      {/* Mood point lights */}
      <pointLight position={[0, 6, 0]} color="#22d4f0" intensity={6} distance={20} />
      <pointLight position={[6, 4, -6]} color="#7755ee" intensity={4} distance={14} />

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

      {/* "BTC" brick text on far side */}
      <BrickText
        text="BTC"
        position={[8, 0, -2]}
        brickSize={0.5}
        color="#22d4f0"
        rotationY={Math.PI / 2}
      />
    </group>
  )
}
