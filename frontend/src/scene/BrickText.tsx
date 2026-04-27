import { useMemo } from 'react'
import { Flyable } from './Flyable'
import { mulberry32 } from './rng'

// 3x5 pixel font. Each glyph is an array of 5 row strings (top to bottom)
// of length 3 ('1' = brick, '0' = empty).
const FONT_3x5: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  W: ['101', '101', '101', '111', '101'],
  Y: ['101', '101', '010', '010', '010'],
  ' ': ['000', '000', '000', '000', '000'],
}

const GLYPH_W = 3
const GLYPH_H = 5
const CHAR_GAP = 1 // empty columns between glyphs

type Props = {
  text: string
  /** World position of the text's top-left brick (x, y, z). */
  position: [number, number, number]
  /** Per-brick footprint in world units (default 0.55). */
  brickSize?: number
  color: string
  /** Y-rotation of the whole word (radians). Bricks stay axis-aligned
      to this rotation; useful for orienting text toward a camera. */
  rotationY?: number
}

export function BrickText({
  text,
  position,
  brickSize = 0.55,
  color,
  rotationY = 0,
}: Props) {
  // Pre-compute brick positions + jitter at memo time (deterministic seed
  // derived from text+position+rotation). Doing Math.random() in the JSX
  // render breaks React purity.
  const bricks = useMemo(() => {
    const arr: { x: number; z: number; jitter: number }[] = []
    const upper = text.toUpperCase().split('')
    const cosR = Math.cos(rotationY)
    const sinR = Math.sin(rotationY)
    const seed =
      Math.abs(
        Math.floor(position[0] * 31 + position[2] * 17 + rotationY * 1000),
      ) +
      text.length * 7
    const rng = mulberry32(seed)
    for (let li = 0; li < upper.length; li++) {
      const glyph = FONT_3x5[upper[li]]
      if (!glyph) continue
      const xCharOffset = li * (GLYPH_W + CHAR_GAP) * brickSize
      for (let row = 0; row < GLYPH_H; row++) {
        for (let col = 0; col < GLYPH_W; col++) {
          if (glyph[row][col] !== '1') continue
          const localX = xCharOffset + col * brickSize
          const localZ = row * brickSize
          // Apply rotationY around the text's anchor (its own origin)
          const rx = localX * cosR - localZ * sinR
          const rz = localX * sinR + localZ * cosR
          arr.push({
            x: position[0] + rx,
            z: position[2] + rz,
            jitter: (rng() - 0.5) * 0.05,
          })
        }
      }
    }
    return arr
  }, [text, position, brickSize, rotationY])

  const restY = brickSize * 0.3 // half of brick height = 0.6 * brickSize / 2

  return (
    <>
      {bricks.map((b, i) => (
        <Flyable
          key={i}
          initialPos={[b.x, restY, b.z]}
          initialRotY={rotationY + b.jitter}
          scale={brickSize * 0.9}
          power={5}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1, 0.6, 1]} />
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} />
          </mesh>
        </Flyable>
      ))}
    </>
  )
}
