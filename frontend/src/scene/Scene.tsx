import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
  OrbitControls,
  Stars,
} from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { ArenaFloor } from './ArenaFloor'
import { Effects } from './Effects'
import { Hub } from './Hub'
import { FootballZone } from './zones/FootballZone'
import { CryptoZone } from './zones/CryptoZone'
import { NewsZone } from './zones/NewsZone'
import { ProfileZone } from './zones/ProfileZone'
import { CameraController } from './CameraController'
import { ZONE_CAMERA } from './zones/zones'
import { useIsMobile } from '../lib/responsive'

export function Scene() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const mobile = useIsMobile()

  // Mobile GPUs choke on 2x DPR + 2k shadow maps + bloom. Step everything
  // down — the dark neon look hides the resolution drop reasonably well.
  const dpr: [number, number] = mobile ? [1, 1.25] : [1, 1.75]
  const shadowMapSize = mobile ? 512 : 1536
  const starCount = mobile ? 1200 : 3000

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{
        position: ZONE_CAMERA.hub.pos as unknown as [number, number, number],
        fov: 50,
      }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      className="absolute inset-0 z-0"
    >
      {/* Deep night sky — solid dark purple-black */}
      <color attach="background" args={['#0a0420']} />
      <Stars
        radius={200}
        depth={50}
        count={starCount}
        factor={5}
        saturation={0.5}
        fade
        speed={0.4}
      />
      <fog attach="fog" args={['#160830', 40, 130]} />

      <Suspense fallback={null}>
        {/* IBL — keep some ambient color in materials */}
        <Environment preset="night" />

        {/* Very low ambient — neon accents do the lighting work */}
        <ambientLight intensity={0.12} />
        <hemisphereLight args={['#5a2a8a', '#0a0816', 0.3]} />

        {/* Cool blue "moon" — the main directional fill, soft + cool */}
        <directionalLight
          position={[20, 30, 20]}
          intensity={0.55}
          color="#a0b4ff"
          castShadow={!mobile}
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
          shadow-camera-left={-110}
          shadow-camera-right={110}
          shadow-camera-top={110}
          shadow-camera-bottom={-110}
          shadow-camera-near={0.5}
          shadow-camera-far={300}
          shadow-bias={-0.0005}
        />

        {/* Magenta rim from the front — neon kicker */}
        <directionalLight
          position={[-12, 10, 18]}
          intensity={0.7}
          color="#ff44dd"
        />
        {/* Cyan back-light */}
        <directionalLight
          position={[20, 8, -25]}
          intensity={0.55}
          color="#44ddff"
        />

        <ArenaFloor />
        <Hub />
        <FootballZone />
        <CryptoZone />
        <NewsZone />
        <ProfileZone />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableRotate
          enableZoom
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={36}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 7}
        />
        <CameraController controlsRef={controlsRef} />

        {!mobile && <Effects />}
      </Suspense>

      {/* Runtime perf throttle: drop pixel ratio while user is interacting
          (orbit/zoom) so framerate stays smooth on slower GPUs. */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  )
}
