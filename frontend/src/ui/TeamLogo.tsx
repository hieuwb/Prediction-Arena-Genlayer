// Stylized procedural team crest. Uses team's two brand colors and the
// 3-letter tag from the market meta. No external assets, no copyright
// concerns, consistent with the dApp's neon vibe.

type Pattern = 'solid' | 'split' | 'band' | 'stripes' | 'diagonal'

const PATTERN_BY_TAG: Record<string, Pattern> = {
  RMA: 'band',     // Real Madrid — white with central band
  ARS: 'band',     // Arsenal — red with white horizontal band
  MCI: 'solid',    // Man City — sky blue
  LIV: 'solid',    // Liverpool — solid red with gold accent in stripe
  FCB: 'stripes',  // Barcelona — vertical blaugrana stripes
}

export function TeamLogo({
  tag,
  colors,
  size = 32,
}: {
  tag: string
  colors: [string, string]
  size?: number
}) {
  const pattern = PATTERN_BY_TAG[tag] ?? 'split'
  const [a, b] = colors

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label={`${tag} crest`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={`crest-${tag}`}>
          <path d="M32 2 L60 12 V32 Q60 52 32 62 Q4 52 4 32 V12 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#crest-${tag})`}>
        {pattern === 'solid' && <rect x="0" y="0" width="64" height="64" fill={a} />}
        {pattern === 'split' && (
          <>
            <rect x="0" y="0" width="32" height="64" fill={a} />
            <rect x="32" y="0" width="32" height="64" fill={b} />
          </>
        )}
        {pattern === 'band' && (
          <>
            <rect x="0" y="0" width="64" height="64" fill={a} />
            <rect x="0" y="22" width="64" height="20" fill={b} />
          </>
        )}
        {pattern === 'stripes' && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={i * 16}
                y="0"
                width="16"
                height="64"
                fill={i % 2 === 0 ? a : b}
              />
            ))}
          </>
        )}
        {pattern === 'diagonal' && (
          <>
            <rect x="0" y="0" width="64" height="64" fill={a} />
            <polygon points="0,0 64,0 0,64" fill={b} />
          </>
        )}
      </g>
      <path
        d="M32 2 L60 12 V32 Q60 52 32 62 Q4 52 4 32 V12 Z"
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="1.5"
      />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontWeight="900"
        fontSize="16"
        fill="#fff"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth="0.6"
        paintOrder="stroke"
      >
        {tag}
      </text>
    </svg>
  )
}
