import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

// Generic click-to-fly wrapper. Wrap any visual (a Clone, a mesh, a group)
// so clicking it applies an impulse + spin and lets it fall + bounce
// under simple gravity.
//
// Mass model: bricks (scale ~0.85) are the baseline ("massFactor = 1").
// Larger objects have proportionally more mass, so the same click impulse
// produces a smaller velocity — they bounce a short distance instead of
// rocketing across the map. Capped at 0.5 min so very tiny objects don't
// over-fly absurdly.

const GRAVITY = 14
const FLOOR_BOUNCE = -0.32
const FLOOR_FRICTION = 0.55
const ANGULAR_DAMP = 0.62
const REST_VEL = 0.45

const BRICK_REF_SCALE = 0.85

type Props = {
  /** World coords. The object rests at this exact y until clicked. */
  initialPos: [number, number, number]
  /** Y axis rotation in radians (others kept at 0). */
  initialRotY?: number
  scale?: number | [number, number, number]
  /** Strength of impulse on click before mass scaling (default 7). */
  power?: number
  children: React.ReactNode
}

export function Flyable({
  initialPos,
  initialRotY = 0,
  scale = 1,
  power = 7,
  children,
}: Props) {
  const ref = useRef<THREE.Group>(null!)
  const vel = useRef(new THREE.Vector3())
  const angVel = useRef(new THREE.Vector3())
  const flying = useRef(false)
  const restY = initialPos[1]

  const scaleArr = useMemo<[number, number, number]>(() => {
    if (typeof scale === 'number') return [scale, scale, scale]
    return scale
  }, [scale])

  // Linear mass model: larger scale → larger mass → smaller acceleration.
  const massFactor = useMemo(() => {
    const s = Math.max(scaleArr[0], scaleArr[1], scaleArr[2])
    return Math.max(s / BRICK_REF_SCALE, 0.5)
  }, [scaleArr])

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

    // Direction = from camera to the object's center (in world space),
    // projected onto the XZ plane. We MUST use getWorldPosition because
    // zone children sit inside a `<group position={zoneCenter}>` wrapper —
    // their .position is zone-local, not world. Using local positions made
    // every zone object compute the same direction (zone center → camera).
    const objWorld = new THREE.Vector3()
    ref.current.getWorldPosition(objWorld)

    const dir = new THREE.Vector3().subVectors(objWorld, e.camera.position)
    dir.y = 0
    if (dir.lengthSq() < 0.01) {
      e.camera.getWorldDirection(dir)
      dir.y = 0
    }
    dir.normalize()

    // Divide by mass — bricks (1.0) keep full power; larger objects feel heavier.
    const m = massFactor
    const horiz = (power + Math.random() * 3) / m
    const vert = (4.5 + Math.random() * 3) / m
    vel.current.set(dir.x * horiz, vert, dir.z * horiz)
    angVel.current.set(
      ((Math.random() - 0.5) * 9) / m,
      ((Math.random() - 0.5) * 9) / m,
      ((Math.random() - 0.5) * 9) / m,
    )
    flying.current = true
  }

  return (
    <group
      ref={ref}
      position={initialPos}
      rotation={[0, initialRotY, 0]}
      scale={scaleArr}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {children}
    </group>
  )
}
