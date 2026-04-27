import { Clone, useGLTF, Billboard, Text } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BrickText } from '../BrickText'
import { TeleportPad } from '../TeleportPad'
import { mulberry32 } from '../rng'
import { ZONE_CENTER } from './zones'

const BUSHES = [
  '/nature/Bush.gltf',
  '/nature/Bush_Flowers.gltf',
  '/nature/Bush_Small_Flowers.gltf',
] as const

;[...BUSHES].forEach((u) => useGLTF.preload(u))

const PILLAR_RADIUS = 4 // unused — profile has no markets, but kept for symmetry
const BUSH_CLUSTER_COUNT = 3
const BUSH_OUTER_RADIUS = 14.6
const BUSH_TANGENT = 2.5
const BUSH_SCALE_MULT = 3

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

// Central trophy/avatar — slowly spinning gold orb on a pedestal, behind
// the return pad so it doesn't block clicks. Marks the zone as "yours".
function AvatarTotem({ position }: { position: [number, number, number] }) {
  const orbRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime()
    if (orbRef.current) {
      orbRef.current.position.y = 2.4 + Math.sin(t * 1.3) * 0.12
      orbRef.current.rotation.y += dt * 0.6
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += dt * 0.4
    }
  })

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 0.6, 8]} />
        <meshStandardMaterial color="#3a2c15" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.06, 8]} />
        <meshStandardMaterial
          color="#ffb627"
          emissive="#ffb627"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* Crown ring (orbits the orb) */}
      <mesh ref={ringRef} position={[0, 2.4, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.0, 0.06, 8, 32]} />
        <meshStandardMaterial
          color="#ffd966"
          emissive="#ffb627"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>

      {/* Floating gold icosahedron */}
      <mesh ref={orbRef} position={[0, 2.4, 0]} castShadow>
        <icosahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial
          color="#ffd966"
          emissive="#ffb627"
          emissiveIntensity={2.6}
          roughness={0.2}
          metalness={0}
          toneMapped={false}
          flatShading
        />
      </mesh>

      <pointLight
        position={[0, 2.4, 0]}
        color="#ffb627"
        intensity={8}
        distance={10}
        decay={1.6}
      />

      {/* Floating PROFILE label */}
      <Billboard position={[0, 4.0, 0]}>
        <Text
          fontSize={0.32}
          color="#ffd966"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#0a0420"
        >
          PROFILE
        </Text>
      </Billboard>
    </group>
  )
}

export function ProfileZone() {
  const center = ZONE_CENTER.profile

  // 3 bush clusters outside the disc, equilateral spacing.
  const bushClusters = useMemo(() => {
    const out: {
      url: string
      position: [number, number, number]
      scale: number
    }[] = []
    const rng = mulberry32(919)
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
          scale: (0.5 + (rng() - 0.5) * 0.1) * BUSH_SCALE_MULT,
        })
      }
    }
    return out
  }, [])

  return (
    <group position={center}>
      {/* Dark gold floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#2a1f08" roughness={1} metalness={0.05} />
      </mesh>
      {/* Inner gold ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[5.5, 5.7, 80]} />
        <meshStandardMaterial
          color="#ffb627"
          emissive="#ffb627"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      {/* Outer gold ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <ringGeometry args={[12.6, 12.85, 96]} />
        <meshStandardMaterial
          color="#ffd966"
          emissive="#ffd966"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* 4 radial gold spokes (decorative) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, -angle]}
            position={[0, 0.009, 0]}
          >
            <planeGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#ffb627" transparent opacity={0.5} />
          </mesh>
        )
      })}

      {/* Mood lights */}
      <pointLight position={[0, 8, 0]} color="#ffb627" intensity={5} distance={18} />
      <pointLight position={[0, 1, 6]} color="#ffd966" intensity={3} distance={8} />

      {/* Bush clusters (static) */}
      {bushClusters.map((b, i) => (
        <StaticProp
          key={`bush-${i}`}
          url={b.url}
          position={b.position}
          rotation={[0, 0, 0]}
          scale={b.scale}
        />
      ))}

      {/* Avatar totem behind the return pad (zone-local +z is away from
          camera, since profile camera is at zone-local -z). */}
      <AvatarTotem position={[0, 0, PILLAR_RADIUS]} />

      {/* Return pad at zone center, gold tone to match the zone */}
      <TeleportPad to="hub" position={[0, 0, 0]} variant="return" tone="gold" />

      {/* Brick text label, on the back side away from camera */}
      <BrickText
        text="YOU"
        position={[-1.5, 0, -8]}
        brickSize={0.55}
        color="#ffb627"
      />
    </group>
  )
}
