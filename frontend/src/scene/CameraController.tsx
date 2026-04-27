import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useMarketStore } from '../store/markets'
import { ZONE_CAMERA } from './zones/zones'

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

// Snap camera + OrbitControls target on view change. We don't lerp:
// running an every-frame .lerp on camera.position fights OrbitControls'
// damping/internal-spherical, which made the camera unrotatable. Snapping
// once and calling controls.update() lets OrbitControls re-sync its
// internal state cleanly, so user drag works immediately afterward.
export function CameraController({ controlsRef }: Props) {
  const view = useMarketStore((s) => s.currentView)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const c = ZONE_CAMERA[view]
    camera.position.set(c.pos[0], c.pos[1], c.pos[2])
    const ctrl = controlsRef.current
    if (ctrl) {
      ctrl.target.set(c.target[0], c.target[1], c.target[2])
      camera.lookAt(ctrl.target)
      ctrl.update()
    }
  }, [view, camera, controlsRef])

  return null
}
