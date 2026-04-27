import type { Market, MarketState } from './types'

// Two-phase timing model:
//   bettingClosesAt — when bet input disables (kickoff / candle close /
//                     event start)
//   resolvesAt      — when the result page is read by validators
//
// open  : now < bettingClosesAt
// await : bettingClosesAt <= now < resolvesAt   ← match playing / candle
//                                                 forming / vote tallying
// (then tickMarketStates fires resolveMarket → pending → resolved)
//
// Times are computed from boot so the demo always shows fresh,
// soon-to-close markets without manual maintenance.

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const NOW = Date.now()

// Local midnight at the start of (today + dayOffset).
function midnight(dayOffset: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  return d.getTime()
}

// Next strict-future occurrence of weekday (0=Sun..6=Sat) at midnight.
function nextWeekday(targetDay: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const today = d.getDay()
  const offset = ((targetDay - today + 7) % 7) || 7
  d.setDate(d.getDate() + offset)
  return d.getTime()
}

function initialState(
  bettingClosesAt: number,
  resolvesAt: number,
): MarketState {
  if (resolvesAt <= NOW) return 'pending'
  if (bettingClosesAt <= NOW) return 'awaiting'
  return 'open'
}

// ─── Football kickoffs (anchored to real fixture dates) ──────
// All times in UTC so the demo lines up regardless of viewer
// timezone. Match window: bettingClosesAt = kickoff, resolvesAt = +2h.
function abs(year: number, month: number, day: number, hour: number, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0)
}
// Real Premier League fixtures sourced from
// https://www.espn.com/soccer/schedule/_/league/eng.1
const munBreKickoff = abs(2026, 4, 27, 19, 0) // Mon 27/04 — Man Utd vs Brentford
const leeBurKickoff = abs(2026, 5, 1, 19, 0)  // Fri 01/05 — Leeds vs Burnley
const newBhaKickoff = abs(2026, 5, 2, 14, 0)  // Sat 02/05 — Newcastle vs Brighton

// ─── Crypto candles ───────────────────────────────────────────
// BTC weekend: bettingClosesAt = 2 days before Sunday 00:00 = Fri 00:00
const btcResolvesAt = nextWeekday(0) // next Sun 00:00
const btcBettingClosesAt = btcResolvesAt - 2 * DAY

// ETH daily: closes 22:00 today, resolves tomorrow 00:00
const ethResolvesAt = midnight(1)
const ethBettingClosesAt = ethResolvesAt - 2 * HOUR

// SOL daily: spaced one day after ETH so the dashboard shows a longer
// countdown alongside the short one.
const solResolvesAt = midnight(2)
const solBettingClosesAt = solResolvesAt - 2 * HOUR

// ─── News events (anchored to real announcement dates) ──────
const starshipStart = abs(2026, 5, 5, 14, 0) // Starship test window
const starshipEnd = starshipStart + 3 * HOUR
const fomcAnnounce = abs(2026, 5, 7, 18, 0) // FOMC May 2026 (Wed-Thu)
const fomcResolved = fomcAnnounce + 30 * 60_000
const wwdcKeynote = abs(2026, 6, 8, 17, 0) // Apple WWDC 2026 keynote slot
const wwdcEnd = wwdcKeynote + 2 * HOUR

export const initialMarkets: Market[] = [
  // ─── Football ──────────────────────────────────────────────
  {
    id: 'mun-bre-pl-r34-20260427',
    question: 'Manchester United vs Brentford — Premier League 27/04/2026?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League',
    options: ['Manchester United', 'Draw', 'Brentford'],
    optionPools: [180, 70, 110],
    totalPool: 360,
    state: initialState(munBreKickoff, munBreKickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 0,
    bettingClosesAt: munBreKickoff,
    resolvesAt: munBreKickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Manchester United', 'Brentford'],
      tags: ['MUN', 'BRE'],
      colors: ['#da291c', '#e30613'],
    },
  },
  {
    id: 'lee-bur-pl-20260501',
    question: 'Leeds United vs Burnley — Premier League 01/05/2026?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League',
    options: ['Leeds United', 'Draw', 'Burnley'],
    optionPools: [150, 70, 90],
    totalPool: 310,
    state: initialState(leeBurKickoff, leeBurKickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 0,
    bettingClosesAt: leeBurKickoff,
    resolvesAt: leeBurKickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Leeds United', 'Burnley'],
      tags: ['LEE', 'BUR'],
      colors: ['#fcdb05', '#6c1d45'],
    },
  },
  {
    id: 'new-bha-pl-20260502',
    question: 'Newcastle vs Brighton — Premier League 02/05/2026?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League',
    options: ['Newcastle', 'Draw', 'Brighton'],
    optionPools: [180, 75, 110],
    totalPool: 365,
    state: initialState(newBhaKickoff, newBhaKickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 0,
    bettingClosesAt: newBhaKickoff,
    resolvesAt: newBhaKickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Newcastle', 'Brighton'],
      tags: ['NEW', 'BHA'],
      colors: ['#241f20', '#0057b8'],
    },
  },

  // ─── Crypto ────────────────────────────────────────────────
  {
    id: 'btc-weekend-up',
    question: 'BTC closes higher than Friday open this Sunday 00:00?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/bitcoin',
    options: ['Up', 'Down'],
    optionPools: [130, 80],
    totalPool: 210,
    state: initialState(btcBettingClosesAt, btcResolvesAt),
    winningOption: null,
    category: 'crypto',
    mockWinner: 0,
    bettingClosesAt: btcBettingClosesAt,
    resolvesAt: btcResolvesAt,
    meta: {
      kind: 'crypto',
      symbol: '₿',
      ticker: 'BTC',
      spark: [98, 102, 108, 112, 119, 122, 128, 131, 134, 138, 141, 144, 147, 149, 152],
      color: '#f7931a',
    },
  },
  {
    id: 'eth-daily-up',
    question: 'ETH 24h candle closes green at 00:00 tonight?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/ethereum',
    options: ['Green', 'Red'],
    optionPools: [170, 110],
    totalPool: 280,
    state: initialState(ethBettingClosesAt, ethResolvesAt),
    winningOption: null,
    category: 'crypto',
    mockWinner: 0,
    bettingClosesAt: ethBettingClosesAt,
    resolvesAt: ethResolvesAt,
    meta: {
      kind: 'crypto',
      symbol: 'Ξ',
      ticker: 'ETH',
      spark: [4.6, 4.8, 4.9, 5.2, 5.5, 5.7, 5.9, 6.1, 6.3, 6.5, 6.4, 6.7, 6.9, 7.0, 7.2],
      color: '#627eea',
    },
  },
  {
    id: 'sol-daily-up',
    question: 'SOL 24h candle closes green at 00:00 tomorrow?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/solana',
    options: ['Green', 'Red'],
    optionPools: [85, 130],
    totalPool: 215,
    state: initialState(solBettingClosesAt, solResolvesAt),
    winningOption: null,
    category: 'crypto',
    mockWinner: 1,
    bettingClosesAt: solBettingClosesAt,
    resolvesAt: solResolvesAt,
    meta: {
      kind: 'crypto',
      symbol: '◎',
      ticker: 'SOL',
      spark: [285, 298, 305, 312, 320, 318, 332, 340, 351, 358, 362, 370, 378, 385, 392],
      color: '#14f195',
    },
  },

  // ─── News ──────────────────────────────────────────────────
  {
    id: 'starship-orbit-may-2026',
    question: 'SpaceX Starship reaches stable orbit on next test (May 2026)?',
    resolutionUrl:
      'https://en.wikipedia.org/wiki/List_of_Starship_launches',
    options: ['Yes', 'No'],
    optionPools: [95, 115],
    totalPool: 210,
    state: initialState(starshipStart, starshipEnd),
    winningOption: null,
    category: 'news',
    mockWinner: 0,
    bettingClosesAt: starshipStart,
    resolvesAt: starshipEnd,
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'Starship Orbit',
      color: '#a855f7',
    },
  },
  {
    id: 'fomc-may-2026-rate-cut',
    question: 'Fed cuts rates at May 2026 FOMC meeting?',
    resolutionUrl:
      'https://en.wikipedia.org/wiki/History_of_Federal_Open_Market_Committee_actions',
    options: ['Cut', 'Hold'],
    optionPools: [80, 140],
    totalPool: 220,
    state: initialState(fomcAnnounce, fomcResolved),
    winningOption: null,
    category: 'news',
    mockWinner: 1,
    bettingClosesAt: fomcAnnounce,
    resolvesAt: fomcResolved,
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'FOMC May 2026',
      color: '#ff5566',
    },
  },
  {
    id: 'wwdc-2026-ai-hardware',
    question: 'Apple WWDC 2026 unveils dedicated AI hardware?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/Apple_Worldwide_Developers_Conference',
    options: ['Yes', 'No'],
    optionPools: [165, 105],
    totalPool: 270,
    state: initialState(wwdcKeynote, wwdcEnd),
    winningOption: null,
    category: 'news',
    mockWinner: 0,
    bettingClosesAt: wwdcKeynote,
    resolvesAt: wwdcEnd,
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'WWDC 2026',
      color: '#3b82f6',
    },
  },
]
