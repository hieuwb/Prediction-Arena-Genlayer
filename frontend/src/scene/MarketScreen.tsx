import { Billboard, Line, Text } from '@react-three/drei'
import type {
  CryptoMeta,
  FootballMeta,
  Market,
  NewsMeta,
} from '../types'

// 3D-mesh-only screen above each pillar. Earlier version used drei <Html>
// which portals DOM to body level and ended up overlapping our React UI
// (made the brand and sidebar appear to disappear). All meshes here live
// inside the Canvas so they can never escape into the HTML overlay.

const PANEL_W = 3.6
const PANEL_H = 1.5
const PANEL_BG = '#0a0418'
const BORDER_COLOR = '#a855f7'
const ACCENT = '#c084fc'

type Props = {
  market: Market
  /** World-space y offset above the pillar. */
  y: number
}

export function MarketScreen({ market, y }: Props) {
  if (!market.meta) return null

  const liveLabel =
    market.state === 'open'
      ? '● LIVE'
      : market.state === 'pending'
        ? '◌ RESOLVING'
        : '★ RESOLVED'
  const liveColor =
    market.state === 'open'
      ? '#ff44dd'
      : market.state === 'pending'
        ? '#9fd6ff'
        : '#ffb627'

  return (
    <Billboard position={[0, y, 0]}>
      <group>
        {/* Background panel */}
        <mesh>
          <planeGeometry args={[PANEL_W, PANEL_H]} />
          <meshBasicMaterial
            color={PANEL_BG}
            transparent
            opacity={0.92}
            depthWrite={false}
          />
        </mesh>

        {/* Border (4 thin emissive bars) */}
        <Border w={PANEL_W} h={PANEL_H} color={BORDER_COLOR} thickness={0.04} />

        {/* Type label */}
        <Text
          position={[-PANEL_W / 2 + 0.16, PANEL_H / 2 - 0.16, 0.005]}
          fontSize={0.1}
          color={ACCENT}
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor={PANEL_BG}
        >
          {kindLabel(market.meta.kind)}
        </Text>

        {/* Live badge top-right */}
        <Text
          position={[PANEL_W / 2 - 0.16, PANEL_H / 2 - 0.16, 0.005]}
          fontSize={0.11}
          color={liveColor}
          anchorX="right"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor={PANEL_BG}
        >
          {liveLabel}
        </Text>

        {market.meta.kind === 'football' && (
          <FootballContent meta={market.meta} />
        )}
        {market.meta.kind === 'crypto' && <CryptoContent meta={market.meta} />}
        {market.meta.kind === 'news' && <NewsContent meta={market.meta} />}
      </group>
    </Billboard>
  )
}

function kindLabel(kind: 'football' | 'crypto' | 'news'): string {
  if (kind === 'football') return '⚽ MATCH · GENLAYER'
  if (kind === 'crypto') return '◇ MARKET · GENLAYER'
  return '⌬ WIRE · GENLAYER'
}

function Border({
  w,
  h,
  color,
  thickness,
}: {
  w: number
  h: number
  color: string
  thickness: number
}) {
  return (
    <group position={[0, 0, 0.002]}>
      <mesh position={[0, h / 2 - thickness / 2, 0]}>
        <planeGeometry args={[w, thickness]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2 + thickness / 2, 0]}>
        <planeGeometry args={[w, thickness]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[-w / 2 + thickness / 2, 0, 0]}>
        <planeGeometry args={[thickness, h]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[w / 2 - thickness / 2, 0, 0]}>
        <planeGeometry args={[thickness, h]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

function FootballContent({ meta }: { meta: FootballMeta }) {
  const [t1, t2] = meta.teams
  const [c1, c2] = meta.colors
  const [tag1, tag2] = meta.tags
  return (
    <group position={[0, -0.05, 0.005]}>
      <TeamBadge x={-1.05} color={c1} tag={tag1} name={t1} />
      <Text
        position={[0, 0.05, 0]}
        fontSize={0.34}
        color="#ffffff"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={PANEL_BG}
      >
        VS
      </Text>
      <Text
        position={[0, -0.32, 0]}
        fontSize={0.12}
        color={ACCENT}
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor={PANEL_BG}
      >
        ?:?
      </Text>
      <TeamBadge x={1.05} color={c2} tag={tag2} name={t2} />
    </group>
  )
}

function TeamBadge({
  x,
  color,
  tag,
  name,
}: {
  x: number
  color: string
  tag: string
  name: string
}) {
  const textColor = isDark(color) ? '#ffffff' : '#0a0418'
  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <circleGeometry args={[0.36, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.31, 0.34, 24]} />
        <meshBasicMaterial color={PANEL_BG} />
      </mesh>
      <Text
        position={[0, 0.02, 0.002]}
        fontSize={0.18}
        color={textColor}
        anchorY="middle"
        anchorX="center"
        outlineWidth={textColor === '#ffffff' ? 0.005 : 0}
        outlineColor={PANEL_BG}
      >
        {tag}
      </Text>
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.13}
        color="#ffffff"
        anchorY="middle"
        anchorX="center"
        maxWidth={1.4}
        textAlign="center"
        outlineWidth={0.008}
        outlineColor={PANEL_BG}
      >
        {name}
      </Text>
    </group>
  )
}

function CryptoContent({ meta }: { meta: CryptoMeta }) {
  const last = meta.spark[meta.spark.length - 1]
  const first = meta.spark[0]
  const pct = ((last - first) / first) * 100
  const trendUp = pct >= 0

  const min = Math.min(...meta.spark)
  const max = Math.max(...meta.spark)
  const range = max - min || 1
  const chartW = 1.7
  const chartH = 0.55
  const chartCenterX = 0.4
  const chartCenterY = -0.2

  const points: [number, number, number][] = meta.spark.map((v, i) => {
    const x = chartCenterX - chartW / 2 + (i / (meta.spark.length - 1)) * chartW
    const y = chartCenterY - chartH / 2 + ((v - min) / range) * chartH
    return [x, y, 0.005]
  })

  return (
    <group position={[0, -0.05, 0.005]}>
      {/* Token "logo" tile */}
      <group position={[-1.15, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.78, 0.78]} />
          <meshBasicMaterial color={PANEL_BG} />
        </mesh>
        <Border w={0.78} h={0.78} color={meta.color} thickness={0.04} />
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.34}
          color={meta.color}
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor={PANEL_BG}
        >
          {meta.ticker}
        </Text>
      </group>

      {/* Right column header */}
      <Text
        position={[-0.45, 0.32, 0]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor={PANEL_BG}
      >
        {meta.ticker}
      </Text>
      <Text
        position={[1.5, 0.32, 0]}
        fontSize={0.13}
        color={trendUp ? '#34d399' : '#f87171'}
        anchorX="right"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor={PANEL_BG}
      >
        {`${trendUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`}
      </Text>

      {/* Sparkline */}
      <Line
        points={points}
        color={meta.color}
        lineWidth={2}
        toneMapped={false}
      />
    </group>
  )
}

function NewsContent({ meta }: { meta: NewsMeta }) {
  return (
    <group position={[0, -0.05, 0.005]}>
      {/* Flag tile */}
      <group position={[-1.15, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.78, 0.78]} />
          <meshBasicMaterial color={PANEL_BG} />
        </mesh>
        <Border w={0.78} h={0.78} color={meta.color} thickness={0.04} />
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.32}
          color={meta.color}
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor={PANEL_BG}
        >
          {meta.flag}
        </Text>
      </group>

      <Text
        position={[-0.45, 0.18, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="left"
        outlineWidth={0.008}
        outlineColor={PANEL_BG}
      >
        {meta.subject}
      </Text>
      <Text
        position={[-0.45, -0.18, 0]}
        fontSize={0.11}
        color={ACCENT}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor={PANEL_BG}
      >
        ⌬ BREAKING
      </Text>
    </group>
  )
}

function isDark(hex: string): boolean {
  const m = hex.replace('#', '')
  const r = parseInt(m.substring(0, 2), 16)
  const g = parseInt(m.substring(2, 4), 16)
  const b = parseInt(m.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55
}
