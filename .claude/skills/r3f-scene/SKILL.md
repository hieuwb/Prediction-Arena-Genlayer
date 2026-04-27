---
name: r3f-scene
description: Build React Three Fiber (R3F) scenes for the Prediction Arena — Canvas setup, lighting, OrbitControls, Suspense loading, useFrame animation, and the arena/pillar component patterns specific to this dApp. Use when creating or editing files under frontend/src/scene/, when the user mentions "arena", "pillar", "Canvas", "useFrame", "OrbitControls", or 3D component work.
---

# R3F Scene Patterns

React Three Fiber wraps Three.js in a React reconciler. JSX becomes Three.js nodes; hooks drive the render loop. Stack: `@react-three/fiber` + `@react-three/drei` (helpers) + `leva` (debug only).

## When to invoke

- Editing `frontend/src/scene/**`
- Creating `<Arena>`, `<Pillar>`, `<Floor>`, `<Particles>`, camera/lighting components
- User asks to "add an effect", "make pillar glow", "animate camera", "load a model"

## Canvas root — the only `<Canvas>`

```tsx
// frontend/src/scene/Scene.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { Suspense } from 'react'

export function Scene({ markets }: { markets: Market[] }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}                          // cap pixel ratio — retina otherwise tanks perf
      camera={{ position: [0, 6, 12], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <Environment preset="night" />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <Arena />
        {markets.map((m, i) => (
          <Pillar key={m.id} market={m} index={i} count={markets.length} />
        ))}
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
      </Suspense>
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
```

## The Pillar — the workhorse component

3 visual states tied to market state: `open` (cyan pulse), `pending` (white spin), `won` (gold glow).

```tsx
function Pillar({ market, index, count }: { market: Market; index: number; count: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const angle = (index / count) * Math.PI * 2
  const radius = 4

  useFrame((_, dt) => {
    if (!ref.current) return
    if (market.state === 'open')    ref.current.rotation.y += dt * 0.5
    if (market.state === 'pending') ref.current.rotation.y += dt * 2
    // 'won' static
  })

  const color = market.state === 'won' ? '#ffcc33'
              : market.state === 'pending' ? '#ffffff'
              : '#33ccff'
  const emissive = color

  return (
    <mesh
      ref={ref}
      position={[Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius]}
      castShadow
      onClick={() => onPillarClick(market.id)}
      onPointerOver={(e) => (e.stopPropagation(), document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <cylinderGeometry args={[0.4, 0.4, 3, 24]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={market.state === 'won' ? 2 : 0.5} />
    </mesh>
  )
}
```

## The hooks — useFrame is the render loop

- `useFrame((state, delta) => {...})` — runs every frame. **Always multiply by `delta`** for frame-rate-independent motion: `mesh.rotation.y += dt * 0.5`, never `+= 0.01`.
- `useThree()` — read-only access to camera, gl, scene, viewport. Don't mutate camera here every frame; use `useFrame` instead.
- `useLoader(GLTFLoader, '/models/x.glb')` — Suspense-aware async load. The `<Canvas>` MUST have a `<Suspense>` wrapper.

## Drei helpers — use these, don't reinvent

| Helper | Purpose |
|---|---|
| `<OrbitControls />` | Mouse drag camera (lock `enablePan={false}` for arena) |
| `<Environment preset="night" />` | HDRI lighting — gives shading depth for free |
| `<Float speed={1} floatIntensity={0.5}>` | Idle bobbing for non-critical decor |
| `<Text>` (drei) | 3D text labels above pillars |
| `<useGLTF.preload(url)>` | Preload models on app boot |
| `<Sparkles>` | Quick particle effect for celebrations (won state) |
| `<Stats />` | Dev-only FPS panel |

## State sync — contract → scene

The scene reads from a Zustand/Jotai store, not props drilled deep:

```tsx
// frontend/src/store/markets.ts
export const useMarketStore = create<{ markets: Market[]; refresh: () => Promise<void> }>(...)

// in Scene.tsx
const markets = useMarketStore((s) => s.markets)  // re-renders only when markets change
```

Never mutate Three.js objects from React render — only from `useFrame` or event handlers.

## Cleanup — R3F handles most of it

R3F auto-disposes geometries/materials when components unmount. **You only need manual `dispose()` for**: textures loaded outside the JSX tree, custom materials/geometries created in `useMemo`, or imperative scene additions.

## What NOT to do

- Don't import `THREE` directly to construct meshes — use JSX (`<mesh>`, `<cylinderGeometry>`).
- Don't use `useEffect` to drive animation — use `useFrame`.
- Don't put `<Canvas>` inside another `<Canvas>` (only one per app).
- Don't bind `onClick` to thousands of meshes — raycast cost. Use one parent and check `e.object`.
- Don't use `dpr={window.devicePixelRatio}` raw — cap with `[1, 2]`.

## Reference

- R3F docs: https://r3f.docs.pmnd.rs
- drei components: https://github.com/pmndrs/drei
