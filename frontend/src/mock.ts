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
// Match window: bettingClosesAt = kickoff, resolvesAt = kickoff + 2h
function abs(year: number, month: number, day: number, hour: number, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime()
}
const ucl1Kickoff = abs(2026, 4, 28, 21, 0) // UCL semi-final 1st leg
const plKickoff = abs(2026, 5, 3, 16, 30) // PL Sun fixture
const clasicoKickoff = abs(2026, 5, 11, 21, 0) // LaLiga Clásico

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
    id: 'rm-arsenal-ucl-sf-2026',
    question: 'Real Madrid vs Arsenal — UCL semi-final 2026, who advances?',
    resolutionUrl:
      'https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_knockout_phase',
    options: ['Real Madrid', 'Draw', 'Arsenal'],
    optionPools: [220, 80, 160],
    totalPool: 460,
    state: initialState(ucl1Kickoff, ucl1Kickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 0,
    bettingClosesAt: ucl1Kickoff,
    resolvesAt: ucl1Kickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Real Madrid', 'Arsenal'],
      tags: ['RMA', 'ARS'],
      colors: ['#e8e8e8', '#ef0107'],
    },
  },
  {
    id: 'mci-liv-epl-decider-2026',
    question: 'Man City vs Liverpool — PL 2025/26 decider?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League',
    options: ['Man City', 'Draw', 'Liverpool'],
    optionPools: [120, 60, 180],
    totalPool: 360,
    state: initialState(plKickoff, plKickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 2,
    bettingClosesAt: plKickoff,
    resolvesAt: plKickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Man City', 'Liverpool'],
      tags: ['MCI', 'LIV'],
      colors: ['#6cabdd', '#c8102e'],
    },
  },
  {
    id: 'rm-barca-clasico-202605',
    question: 'Real Madrid vs Barcelona — La Liga El Clásico 11/05/2026?',
    resolutionUrl: 'https://en.wikipedia.org/wiki/2025%E2%80%9326_La_Liga',
    options: ['Real Madrid', 'Draw', 'Barcelona'],
    optionPools: [240, 70, 250],
    totalPool: 560,
    state: initialState(clasicoKickoff, clasicoKickoff + 2 * HOUR),
    winningOption: null,
    category: 'football',
    mockWinner: 2,
    bettingClosesAt: clasicoKickoff,
    resolvesAt: clasicoKickoff + 2 * HOUR,
    meta: {
      kind: 'football',
      teams: ['Real Madrid', 'Barcelona'],
      tags: ['RMA', 'FCB'],
      colors: ['#e8e8e8', '#a4174c'],
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
