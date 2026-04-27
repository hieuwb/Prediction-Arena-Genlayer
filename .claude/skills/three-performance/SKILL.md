---
name: three-performance
description: Diagnose and optimize Three.js / React Three Fiber performance for the Prediction Arena — draw calls, instancing, texture/geometry disposal, frame budget profiling. Use when FPS drops below 60, the user reports "lag", "jank", "scene slow", or before the demo to make sure the arena runs on mid-tier laptops.
---

# Three.js Performance

Demo runs on judges' laptops, not your dev machine. Aim for **60 FPS at 1080p on integrated GPU**.

## When to invoke

- FPS < 60 on the user's machine
- Before demo day — proactive sweep
- After adding particles, post-processing, or model imports
- User mentions "lag", "stutter", "chậm", "giật"

## First — measure, don't guess

1. **Add `<Stats />` from drei** in dev — read FPS, ms/frame, MB.
2. **Open Chrome DevTools Performance tab**, record 5 seconds, look for long frames (>16ms = drop below 60).
3. **`renderer.info` from `useThree()`** — `gl.info.render.calls` (draw calls), `gl.info.render.triangles`, `gl.info.memory.geometries`.

**Targets:**
- Draw calls: **< 100** for the arena scene
- Triangles: **< 500K** total
- Active textures: **< 20**
- ms/frame: **< 16** (60 FPS), ideal **< 10**

## The 5 fixes that solve 90% of cases

### 1. Instance repeated meshes

10 pillars = 10 draw calls. Wrong. Use `<Instances>` from drei:

```tsx
import { Instances, Instance } from '@react-three/drei'

<Instances limit={50}>
  <cylinderGeometry args={[0.4, 0.4, 3, 24]} />
  <meshStandardMaterial />
  {markets.map((m, i) => (
    <Instance key={m.id} position={pillarPos(i)} color={pillarColor(m)} />
  ))}
</Instances>
```

50 pillars → 1 draw call. Big win for crowds, particles, identical geometry.

### 2. Cap pixel ratio

```tsx
<Canvas dpr={[1, 2]}>  // never raw window.devicePixelRatio
```

Retina @ dpr=3 quadruples fragment shader work for invisible gain.

### 3. Lower geometry detail

`cylinderGeometry args={[0.4, 0.4, 3, 24]}` — 24 segments. For a small pillar, **12 is fine**. Inspect with wireframe; if you can't see polygons, you have too many.

### 4. Dispose what you create imperatively

R3F disposes JSX-mounted resources. **Manual creation needs manual disposal:**

```tsx
useEffect(() => {
  const geom = new THREE.BufferGeometry()
  // ...
  return () => geom.dispose()  // critical
}, [])
```

Same for `THREE.Texture`, `THREE.Material`, render targets. Memory leaks here cause progressive slowdown over the demo.

### 5. Don't allocate in `useFrame`

```tsx
// BAD — allocates a new Vector3 every frame
useFrame(() => {
  ref.current.position.add(new THREE.Vector3(0, 0.01, 0))
})

// GOOD — reuse a module-level scratch vector
const _v = new THREE.Vector3()
useFrame(() => {
  _v.set(0, 0.01, 0)
  ref.current.position.add(_v)
})
```

GC pauses are the #1 cause of jank.

## Lighting cost

- `directionalLight` with `castShadow` is the most expensive light. **One** in the scene, not three.
- Shadow map size: `shadow-mapSize={[1024, 1024]}` for the arena. 2048 is overkill at this scale.
- Bake static lighting into the floor texture instead of computing it real-time.

## Post-processing

Bloom looks great but costs a full-screen pass. If you add `@react-three/postprocessing`:
- Use `<EffectComposer multisampling={0}>` (FXAA via SMAA effect, not native MSAA + post).
- Bloom `intensity={0.5}` is plenty; `mipmapBlur` is faster than gaussian.
- **Disable post on low-end:** detect via `navigator.hardwareConcurrency < 4 || /Intel/.test(gpu)`.

## Texture rules

- **Compress to KTX2** (`.ktx2`) for any texture > 256×256. Loaded via `useKTX2` from drei.
- **Power-of-two dimensions** (256, 512, 1024) — non-POT can't be mipmapped.
- **Reuse materials** across instances — `useMemo(() => new MeshStandardMaterial(...), [])`.

## Model loading

- Use **glTF (.glb)** with **Draco compression** — `gltfjsx -t scene.glb` generates a typed component.
- Preload at app boot: `useGLTF.preload('/arena.glb')` — avoids hitch on first show.
- Strip unused channels in Blender before export (vertex colors, extra UVs).

## Demo-day checklist

- [ ] FPS ≥ 60 at the demo resolution
- [ ] No console warnings about WebGL context loss
- [ ] No memory leak — open DevTools Memory, snapshot, run for 2 min, snapshot again, compare
- [ ] Tested on a non-dev machine (integrated GPU)
- [ ] Loading state doesn't freeze the page (Suspense fallback shows)

## What NOT to do

- Don't add `useFrame` to every component "just in case" — each one is a per-frame callback.
- Don't import the entire `three` package — tree-shaken imports are smaller.
- Don't enable `antialias` AND post-processing AA — pick one.
- Don't try to optimize before measuring — premature optimization wastes hackathon hours.
