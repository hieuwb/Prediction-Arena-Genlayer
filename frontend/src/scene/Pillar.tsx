import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Market } from '../types'
import { useMarketStore } from '../store/markets'
import { MarketScreen } from './MarketScreen'
import { useCountdown, formatCountdown } from '../lib/countdown'

// Sci-fi pillar: hex base + tall hex shaft with glowing edge bars +
// floating energy core (sphere + orbiting torus).
//
// All "body" pieces live inside one group so we can scale-y the whole
// thing as the pool grows. The orb + ring float above and are positioned
// in absolute world units so they don't get distorted by the scale.

const COLORS: Record<Market['state'], string> = {
  open: '#3aa9ff',
  pending: '#ffffff',
  resolved: '#ffb627',
}

const ACCENT: Record<Market['state'], string> = {
  open: '#1f7fd4',
  pending: '#cfd2d8',
  resolved: '#e07b00',
}

const BODY_DARK = '#0c0e1a'
const BASE_DARK = '#1a1a2e'

const heightFromPool = (pool: number) =>
  THREE.MathUtils.clamp(1.6 + pool / 60, 1.6, 6)

type Props = {
  market: Market
  position?: [number, number, number]
  /** Override pillar tint when state is "open" (zone theming). */
  tintOpen?: string
}

export function Pillar({ market, position = [0, 0, 0], tintOpen }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<THREE.Group>(null!)
  const orbRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  // Bet-pulse: when totalPool changes we kick a 0.7s pulse on the orb so the
  // user sees a physical reaction in the scene (not just a tiny toast).
  const lastPoolRef = useRef(market.totalPool)
  const pulseTRef = useRef(0)

  const select = useMarketStore((s) => s.select)
  const remaining = useCountdown(market.closesAt)
  const countdownLabel = formatCountdown(remaining)

  const targetHeight = heightFromPool(market.totalPool)
  const baseColor =
    market.state === 'open' && tintOpen ? tintOpen : COLORS[market.state]
  const accentHex = ACCENT[market.state]

  // 6 hex-face vertical bars (precomputed positions for the unit-height body)
  const bars = useMemo(() => {
    const arr: { x: number; z: number; rotY: number }[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6 // align with hex faces
      arr.push({
        x: Math.cos(angle) * 0.46,
        z: Math.sin(angle) * 0.46,
        rotY: -angle,
      })
    }
    return arr
  }, [])

  useFrame((state, dt) => {
    if (!groupRef.current || !bodyRef.current) return

    // Detect a fresh bet (totalPool grew) and kick a pulse
    if (market.totalPool !== lastPoolRef.current) {
      if (market.totalPool > lastPoolRef.current) pulseTRef.current = 0.7
      lastPoolRef.current = market.totalPool
    }
    if (pulseTRef.current > 0) pulseTRef.current = Math.max(0, pulseTRef.current - dt)
    // Pulse curve: 0..1..0 sine
    const pulseProgress =
      pulseTRef.current > 0 ? Math.sin((1 - pulseTRef.current / 0.7) * Math.PI) : 0

    // Lerp body scale.y toward target — body is unit-height with bottom at y=0
    bodyRef.current.scale.y = THREE.MathUtils.lerp(
      bodyRef.current.scale.y,
      targetHeight,
      Math.min(dt * 4, 1),
    )

    // Hover lift on the whole pillar
    const liftTarget = hovered ? 0.25 : 0
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      liftTarget,
      Math.min(dt * 6, 1),
    )

    // Spin
    if (market.state === 'open') bodyRef.current.rotation.y += dt * 0.4
    if (market.state === 'pending') bodyRef.current.rotation.y += dt * 2.5

    // Orb bobbing + pulse scale, ring rotation, both above the body
    const t = state.clock.getElapsedTime()
    if (orbRef.current) {
      const yOff = Math.sin(t * 1.6 + position[0] + position[2]) * 0.1
      orbRef.current.position.y = bodyRef.current.scale.y + 0.85 + yOff
      const pulseScale = 1 + pulseProgress * 0.65
      orbRef.current.scale.setScalar(pulseScale)
      const mat = orbRef.current.material as THREE.MeshStandardMaterial
      // Boost emissive briefly during pulse so it visibly flashes
      const baseEmis =
        market.state === 'resolved' ? 3.0 : hovered ? 2.4 : 1.7
      mat.emissiveIntensity = baseEmis + pulseProgress * 4.5
    }
    if (ringRef.current) {
      ringRef.current.position.y = bodyRef.current.scale.y + 0.85
      ringRef.current.rotation.x = Math.PI / 2.4
      ringRef.current.rotation.z += dt * (0.8 + pulseProgress * 4)
      const ringScale = 1 + pulseProgress * 0.4
      ringRef.current.scale.setScalar(ringScale)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Hex pedestal — dark, with glowing top edge */}
      <mesh position={[0, 0.09, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.18, 6]} />
        <meshStandardMaterial color={BASE_DARK} roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.185, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.04, 6]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>

      {/* Body group — scales with totalPool. Unit-height cylinder anchored
          with bottom at y=0 (so we set position to y=0, then geom origin
          shifted up by 0.5 inside). */}
      <group ref={bodyRef} position={[0, 0.21, 0]} scale={[1, 1.6, 1]}>
        {/* Hex shaft — origin at center, geom spans -0.5..0.5 of unit height,
            shifted up by 0.5 so bottom = 0 in local space. */}
        <mesh
          position={[0, 0.5, 0]}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation()
            select(market.id)
          }}
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
          <cylinderGeometry args={[0.42, 0.5, 1, 6]} />
          <meshStandardMaterial
            color={BODY_DARK}
            roughness={0.4}
            metalness={0.65}
          />
        </mesh>

        {/* 6 vertical glowing bars on the hex faces */}
        {bars.map((b, i) => (
          <mesh key={i} position={[b.x, 0.5, b.z]} rotation={[0, b.rotY, 0]}>
            <boxGeometry args={[0.05, 0.92, 0.04]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={
                market.state === 'resolved' ? 3.5 : hovered ? 2.4 : 1.6
              }
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Top hex cap — accent ring */}
        <mesh position={[0, 1, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.46, 0.42, 0.06, 6]} />
          <meshStandardMaterial color={accentHex} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Bottom hex cap — accent ring */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.5, 0.52, 0.06, 6]} />
          <meshStandardMaterial color={accentHex} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Floating energy core */}
      <mesh ref={orbRef} position={[0, targetHeight + 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={
            market.state === 'resolved' ? 3.0 : hovered ? 2.4 : 1.7
          }
          roughness={0.2}
          metalness={0}
          toneMapped={false}
          flatShading
        />
      </mesh>

      {/* Orbiting accelerator ring */}
      <mesh ref={ringRef} position={[0, targetHeight + 0.85, 0]}>
        <torusGeometry args={[0.55, 0.04, 8, 36]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={2.2}
          roughness={0.35}
          metalness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Bright point light at the orb */}
      <pointLight
        position={[0, targetHeight + 0.85, 0]}
        color={baseColor}
        intensity={market.state === 'resolved' ? 10 : hovered ? 8 : 5}
        distance={9}
        decay={1.6}
      />

      {/* Hex floor halo */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.025, 0]}
      >
        <ringGeometry args={[0.95, 1.35, 6]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.55} />
      </mesh>

      {market.state === 'resolved' && (
        <Sparkles
          count={32}
          scale={[2.4, 4.8, 2.4]}
          position={[0, targetHeight / 2 + 0.6, 0]}
          size={5}
          color={baseColor}
          speed={1.2}
        />
      )}

      {/* Floating logo / chart screen */}
      <MarketScreen market={market} y={targetHeight + 2.6} />

      <Billboard position={[0, targetHeight + 1.7, 0]}>
        {/* Dark backing panel so text stays legible over busy 3D background */}
        <mesh position={[0, -0.18, -0.005]}>
          <planeGeometry args={[3.95, 1.0]} />
          <meshBasicMaterial
            color="#0a0418"
            transparent
            opacity={0.78}
            depthWrite={false}
          />
        </mesh>
        {/* Thin neon underline on the panel */}
        <mesh position={[0, -0.66, -0.004]}>
          <planeGeometry args={[3.95, 0.025]} />
          <meshBasicMaterial color={baseColor} toneMapped={false} />
        </mesh>

        <Text
          fontSize={0.26}
          color="#f4f1ff"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.7}
          textAlign="center"
          outlineWidth={0.018}
          outlineColor="#0a0420"
        >
          {market.question}
        </Text>
        <Text
          position={[0, -0.42, 0]}
          fontSize={0.16}
          color={baseColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#0a0420"
        >
          {market.totalPool} PARENA ·{' '}
          {market.state === 'resolved' && market.winningOption != null
            ? `→ ${market.options[market.winningOption]}`
            : market.state === 'pending'
              ? 'resolving…'
              : `closes in ${countdownLabel}`}
        </Text>
      </Billboard>
    </group>
  )
}
