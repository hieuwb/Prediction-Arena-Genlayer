import type { View } from '../../types'

// World coordinates for each zone center.
export const ZONE_CENTER: Record<View, [number, number, number]> = {
  hub: [0, 0, 0],
  football: [0, 0, -55],
  crypto: [55, 0, 0],
  news: [-55, 0, 0],
  profile: [0, 0, 55],
}

// Camera framing for each view: where the camera sits + what it looks at.
export const ZONE_CAMERA: Record<
  View,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  hub: { pos: [9, 8, 14], target: [0, 1, 0] },
  football: { pos: [0, 8, -42], target: [0, 1.2, -55] },
  crypto: { pos: [42, 9, 6], target: [55, 1.5, 0] },
  news: { pos: [-42, 8, -4], target: [-55, 1.2, 0] },
  profile: { pos: [0, 8, 42], target: [0, 1.2, 55] },
}

export const ZONE_LABEL: Record<Exclude<View, 'hub'>, string> = {
  football: '⚽ Football',
  crypto: '◇ Crypto',
  news: '☷ News',
  profile: '⚙ Profile',
}

// Direction angle (radians) from hub origin to each zone — used to place
// teleport pads radially around the hub.
export const ZONE_ANGLE: Record<Exclude<View, 'hub'>, number> = {
  football: -Math.PI / 2, // -Z
  crypto: 0, // +X
  news: Math.PI, // -X
  profile: Math.PI / 2, // +Z (south, opposite football)
}

export const PAD_RADIUS = 6.5
