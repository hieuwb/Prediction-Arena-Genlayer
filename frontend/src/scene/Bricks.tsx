import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from './rng'

const GRAVITY = 14
const FLOOR_BOUNCE = -0.32
const FLOOR_FRICTION = 0.55
const ANGULAR_DAMP = 0.62
const REST_VEL = 0.45

type BrickProps = {
  initialPos: [number, number, number]
  initialRotY: number
  color: string
  scale: number
}

function Brick({ initialPos, initialRotY, color, scale }: BrickProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const vel = useRef(new THREE.Vector3())
  const angVel = useRef(new THREE.Vector3())
  const flying = useRef(false)
  const restY = useMemo(() => Math.max(scale * 0.13, 0.08), [scale])

  useFrame((_, dt) => {
    if (!flying.current || !ref.current) return
    const step = Math.min(dt, 1 / 30)

    vel.current.y -= GRAVITY * step
    ref.current.position.x += vel.current.x * step
    ref.current.position.y += vel.current.y * step
    ref.current.position.z += vel.current.z * step
    ref.current.rotation.x += angVel.current.x * step
    ref.current.rotation.y += angVel.current.y * step
    ref.current.rotation.z += angVel.current.z * step

    if (ref.current.position.y < restY) {
      ref.current.position.y = restY
      vel.current.y *= FLOOR_BOUNCE
      vel.current.x *= FLOOR_FRICTION
      vel.current.z *= FLOOR_FRICTION
      angVel.current.multiplyScalar(ANGULAR_DAMP)

      const speed = vel.current.length()
      if (speed < REST_VEL && Math.abs(vel.current.y) < 0.25) {
        flying.current = false
        vel.current.set(0, 0, 0)
        angVel.current.set(0, 0, 0)
      }
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!ref.current) return

    // Knock-away direction = from click point toward brick (XZ plane).
    const dir = new THREE.Vector3()
      .subVectors(ref.current.position, e.point)
      .setY(0)
    if (dir.lengthSq() < 0.01) {
      dir.set(Math.random() - 0.5, 0, Math.random() - 0.5)
    }
    dir.normalize()

    const power = 6 + Math.random() * 5
    vel.current.set(dir.x * power, 4.5 + Math.random() * 3, dir.z * power)
    angVel.current.set(
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 9,
    )
    flying.current = true
  }

  return (
    <mesh
      ref={ref}
      position={initialPos}
      rotation={[0, initialRotY, 0]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[scale * 0.5, scale * 0.26, scale * 0.32]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
    </mesh>
  )
}

type FieldProps = {
  count: number
  /** Local-space center within the parent group. */
  center?: [number, number, number]
  /** Half-extent of the placement square. */
  spread?: number
  palette: string[]
  /** Seed so each field has a stable but distinct layout. */
  seed: number
}

export function BrickField({
  count,
  center = [0, 0, 0],
  spread = 4,
  palette,
  seed,
}: FieldProps) {
  const bricks = useMemo(() => {
    const rng = mulberry32(seed)
    const arr: BrickProps[] = []
    for (let i = 0; i < count; i++) {
      const dx = (rng() - 0.5) * spread * 2
      const dz = (rng() - 0.5) * spread * 2
      const scale = 0.7 + rng() * 0.5
      arr.push({
        initialPos: [center[0] + dx, Math.max(scale * 0.13, 0.08), center[2] + dz],
        initialRotY: rng() * Math.PI * 2,
        color: palette[Math.floor(rng() * palette.length)],
        scale,
      })
    }
    return arr
  }, [count, center, spread, palette, seed])

  return (
    <>
      {bricks.map((b, i) => (
        <Brick key={i} {...b} />
      ))}
    </>
  )
}
