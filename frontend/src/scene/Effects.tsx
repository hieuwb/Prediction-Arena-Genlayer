import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

// Neon night — strong bloom on emissive surfaces (pillars, pads, panels)
// against the dark purple backdrop. Vignette for cinematic depth.
export function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.5}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.2} darkness={0.55} />
    </EffectComposer>
  )
}
