import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useMarketStore } from '../store/markets'
import type { View } from '../types'
import { ZONE_LABEL } from './zones/zones'

// Sci-fi teleport pad — hex platform, rotating frame, vertical beam,
// rising energy rings.
const TONE_COLORS = {
  blue: { base: '#3aa9ff', bright: '#9fd6ff', dark: '#0a1a35' },
  gold: { base: '#ffb627', bright: '#ffe5a0', dark: '#2a1f08' },
} as const

type Tone = keyof typeof TONE_COLORS

type Props = {
  to: View
  position: [number, number, number]
  /** "return" pads (in zones, leading back to hub) get a slimmer look */
  variant?: 'outbound' | 'return'
  /** Pad color theme — blue for football/crypto/news, gold for profile. */
  tone?: Tone
}

export function TeleportPad({
  to,
  position,
  variant = 'outbound',
  tone = 'blue',
}: Props) {
  const PAD_BASE = TONE_COLORS[tone].base
  const PAD_BRIGHT = TONE_COLORS[tone].bright
  const PAD_DARK = TONE_COLORS[tone].dark
  const teleport = useMarketStore((s) => s.teleport)
  const currentView = useMarketStore((s) => s.currentView)
  const isActive = currentView === to

  const platformRef = useRef<THREE.Mesh>(null!)
  const frameRef = useRef<THREE.Mesh>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const beamRef = useRef<THREE.Mesh>(null!)
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const [hovered, setHovered] = useState(false)

  const isReturn = variant === 'return'
  const padScale = isReturn ? 0.85 : 1
  const beamHeight = isReturn ? 2.6 : 3.6

  // Three rising energy rings — phase-offset so they appear to "tractor up"
  const RING_COUNT = 3
  const RING_TRAVEL = beamHeight - 0.5

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (haloRef.current) {
      const s = (1 + Math.sin(t * 2 + position[0]) * 0.12) * padScale
      haloRef.current.scale.x = s
      haloRef.current.scale.z = s
      ;(haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.45 + Math.sin(t * 3) * 0.2
    }
    if (frameRef.current) frameRef.current.rotation.y += 0.012
    if (platformRef.current) {
      ;(platformRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        2.2 + Math.sin(t * 4) * 0.4
    }
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.18 + Math.sin(t * 2.5) * 0.08
    }
    // Animate the rising rings
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = ringRefs.current[i]
      if (!ring) continue
      const phase = ((t * 0.5 + i / RING_COUNT) % 1)
      ring.position.y = 0.35 + phase * RING_TRAVEL
      const m = ring.material as THREE.MeshBasicMaterial
      m.opacity = (1 - phase) * 0.7
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    teleport(to)
  }

  const baseColor = hovered ? PAD_BRIGHT : PAD_BASE

  const ringIndices = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, i) => i),
    [],
  )

  return (
    <group position={position} scale={[padScale, padScale, padScale]}>
      {/* Generous invisible click target — covers the platform + halo + beam
          column so the user can hit anywhere near the pad and trigger teleport. */}
      <mesh
        position={[0, beamHeight / 2 + 0.1, 0]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[1.7, 1.7, beamHeight + 1.6, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Outer animated halo */}
      <mesh
        ref={haloRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.025, 0]}
      >
        <ringGeometry args={[1.35, 1.65, 6]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.5} />
      </mesh>

      {/* Hex platform — clickable */}
      <mesh
        ref={platformRef}
        position={[0, 0.06, 0]}
        rotation={[0, Math.PI / 6, 0]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[1.25, 1.4, 0.15, 6]} />
        <meshStandardMaterial
          color={PAD_DARK}
          emissive={baseColor}
          emissiveIntensity={isActive ? 1.4 : hovered ? 2.8 : 2.2}
          roughness={0.3}
          metalness={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing inner ring on the platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[0.85, 1.15, 6]} />
        <meshBasicMaterial color={PAD_BRIGHT} transparent opacity={0.85} />
      </mesh>

      {/* Spinning hex frame above the platform */}
      <mesh ref={frameRef} position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.78, 6]} />
        <meshStandardMaterial
          color={PAD_BRIGHT}
          emissive={PAD_BRIGHT}
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Center cap */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <circleGeometry args={[0.32, 6]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={PAD_BRIGHT}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* Vertical hex beam */}
      <mesh ref={beamRef} position={[0, beamHeight / 2 + 0.15, 0]}>
        <cylinderGeometry args={[0.4, 1.1, beamHeight, 6, 1, true]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Three rising energy rings inside the beam */}
      {ringIndices.map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringRefs.current[i] = el
          }}
          position={[0, 0.4, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.7, 0.035, 6, 24]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Bright fill light */}
      <pointLight
        position={[0, 1.4, 0]}
        color={baseColor}
        intensity={hovered ? 12 : 7}
        distance={10}
        decay={1.6}
      />

      {/* Label */}
      <Billboard position={[0, beamHeight + 0.5, 0]}>
        <Text
          fontSize={isReturn ? 0.26 : 0.32}
          color="#dde6ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#0a0420"
        >
          {to === 'hub' ? '⏎ Return to Hub' : ZONE_LABEL[to as Exclude<View, 'hub'>]}
        </Text>
        <Text
          position={[0, -0.36, 0]}
          fontSize={0.16}
          color={isActive ? '#ffb627' : PAD_BRIGHT}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#0a0420"
        >
          {isActive ? 'you are here' : 'click to teleport'}
        </Text>
      </Billboard>
    </group>
  )
}
