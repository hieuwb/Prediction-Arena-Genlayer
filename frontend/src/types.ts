export type MarketState = 'open' | 'pending' | 'resolved'

export type MarketCategory = 'football' | 'crypto' | 'news'

export type View = 'hub' | 'football' | 'crypto' | 'news' | 'profile'

export type FootballMeta = {
  kind: 'football'
  /** Two team display names */
  teams: [string, string]
  /** Two team logo "tags" (3-4 char abbreviations rendered as a colored badge) */
  tags: [string, string]
  /** Two team accent colors (hex) */
  colors: [string, string]
}

export type CryptoMeta = {
  kind: 'crypto'
  /** Token symbol (₿ Ξ ◎ etc.) */
  symbol: string
  /** Short ticker (BTC / ETH / SOL) */
  ticker: string
  /** Mock sparkline values — drawn as a small chart */
  spark: number[]
  /** Trend color */
  color: string
}

export type NewsMeta = {
  kind: 'news'
  /** Country flag emoji */
  flag: string
  /** Short subject (e.g. "SpaceX Starship") */
  subject: string
  /** Tag color */
  color: string
}

export type MarketMeta = FootballMeta | CryptoMeta | NewsMeta

export type Market = {
  id: string
  question: string
  resolutionUrl: string
  options: string[]
  optionPools: number[]
  totalPool: number
  state: MarketState
  winningOption: number | null
  category: MarketCategory
  // demo-only: which option the mock resolver should pick
  mockWinner: number
  /** Unix ms — when betting closes and the market auto-resolves */
  closesAt: number
  /** Display metadata used to render the logo screen above the pillar */
  meta?: MarketMeta
}

export type Bet = {
  marketId: string
  optionIdx: number
  amount: number
}

export type ToastKind = 'info' | 'success' | 'error'

export type Toast = {
  id: number
  kind: ToastKind
  message: string
}
