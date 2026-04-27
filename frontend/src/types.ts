// open      → bets accepted; countdown ticks toward bettingClosesAt
// awaiting  → betting closed; the underlying event is still in progress
//             (match playing, candle still printing, vote still open).
//             Countdown ticks toward resolvesAt.
// pending   → resolvesAt has passed; validators are reading the web
// resolved  → consensus reached; winner stored, claim available
export type MarketState = 'open' | 'awaiting' | 'pending' | 'resolved'

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
  /** Unix ms — bet input is disabled at this point (e.g. kickoff, daily
   *  candle close). Market transitions open → awaiting. */
  bettingClosesAt: number
  /** Unix ms — validators run and the result is announced. Market
   *  transitions awaiting → pending → resolved. Always >= bettingClosesAt. */
  resolvesAt: number
  /** Validator-returned reasoning sentence after on-chain resolve.
   *  Set from get_market() once the contract has has_resolved=true. */
  reasoning?: string
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
