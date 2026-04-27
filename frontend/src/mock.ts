import type { Market } from './types'

// Staggered close offsets — each market gets `closesAt = bootTime + offset`
// so the demo cycles through resolutions without all 9 firing at once.
// Short offsets up front so reviewers see the auto-resolve flow within
// 1-2 minutes of opening the app.
const MIN = 60_000
const BOOT = Date.now()
const closeIn = (ms: number) => BOOT + ms

// Reference date for the demo: Apr 24, 2026. Markets reflect events
// scheduled across late-Apr through end-of-Q2 2026 so the questions
// stay current without manual maintenance every demo cycle.
export const initialMarkets: Market[] = [
  // ─── Football ──────────────────────────────────────────────
  {
    id: 'rm-arsenal-ucl-sf-2026',
    question: 'Real Madrid vs Arsenal — UCL semi-final 2026, who advances?',
    resolutionUrl: 'https://www.bbc.com/sport/football/champions-league',
    options: ['Real Madrid', 'Draw', 'Arsenal'],
    optionPools: [220, 80, 160],
    totalPool: 460,
    state: 'open',
    winningOption: null,
    category: 'football',
    mockWinner: 0,
    closesAt: closeIn(3 * MIN),
    meta: {
      kind: 'football',
      teams: ['Real Madrid', 'Arsenal'],
      tags: ['RMA', 'ARS'],
      colors: ['#e8e8e8', '#ef0107'],
    },
  },
  {
    id: 'mci-liv-epl-decider-2026',
    question: 'Man City vs Liverpool — PL 2025/26 title decider?',
    resolutionUrl: 'https://www.bbc.com/sport/football/premier-league',
    options: ['Man City', 'Draw', 'Liverpool'],
    optionPools: [120, 60, 180],
    totalPool: 360,
    state: 'open',
    winningOption: null,
    category: 'football',
    mockWinner: 2,
    closesAt: closeIn(12 * MIN),
    meta: {
      kind: 'football',
      teams: ['Man City', 'Liverpool'],
      tags: ['MCI', 'LIV'],
      colors: ['#6cabdd', '#c8102e'],
    },
  },
  {
    id: 'rm-barca-clasico-20260511',
    question: 'Real Madrid vs Barcelona — La Liga El Clásico 11/05/2026?',
    resolutionUrl: 'https://www.bbc.com/sport/football/scores-fixtures',
    options: ['Real Madrid', 'Draw', 'Barcelona'],
    optionPools: [240, 70, 250],
    totalPool: 560,
    state: 'open',
    winningOption: null,
    category: 'football',
    mockWinner: 2,
    closesAt: closeIn(25 * MIN),
    meta: {
      kind: 'football',
      teams: ['Real Madrid', 'Barcelona'],
      tags: ['RMA', 'FCB'],
      colors: ['#e8e8e8', '#a4174c'],
    },
  },

  // ─── Crypto ────────────────────────────────────────────────
  {
    id: 'btc-150k-q2-2026',
    question: 'BTC closes above $150,000 on 30/06/2026?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/bitcoin',
    options: ['Yes', 'No'],
    optionPools: [130, 80],
    totalPool: 210,
    state: 'open',
    winningOption: null,
    category: 'crypto',
    mockWinner: 0,
    closesAt: closeIn(5 * MIN),
    meta: {
      kind: 'crypto',
      symbol: '₿',
      ticker: 'BTC',
      spark: [98, 102, 108, 112, 119, 122, 128, 131, 134, 138, 141, 144, 147, 149, 152],
      color: '#f7931a',
    },
  },
  {
    id: 'eth-7k-q2-2026',
    question: 'ETH closes Q2 2026 above $7,000?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/ethereum',
    options: ['Yes', 'No'],
    optionPools: [170, 110],
    totalPool: 280,
    state: 'open',
    winningOption: null,
    category: 'crypto',
    mockWinner: 0,
    closesAt: closeIn(20 * MIN),
    meta: {
      kind: 'crypto',
      symbol: 'Ξ',
      ticker: 'ETH',
      spark: [4.6, 4.8, 4.9, 5.2, 5.5, 5.7, 5.9, 6.1, 6.3, 6.5, 6.4, 6.7, 6.9, 7.0, 7.2],
      color: '#627eea',
    },
  },
  {
    id: 'sol-new-ath-may-2026',
    question: 'SOL prints a new all-time high in May 2026?',
    resolutionUrl: 'https://www.coingecko.com/en/coins/solana',
    options: ['Yes', 'No'],
    optionPools: [85, 130],
    totalPool: 215,
    state: 'open',
    winningOption: null,
    category: 'crypto',
    mockWinner: 1,
    closesAt: closeIn(45 * MIN),
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
    resolutionUrl: 'https://www.bbc.com/news/science_and_environment',
    options: ['Yes', 'No'],
    optionPools: [95, 115],
    totalPool: 210,
    state: 'open',
    winningOption: null,
    category: 'news',
    mockWinner: 0,
    closesAt: closeIn(7 * MIN),
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'Starship Orbit',
      color: '#a855f7',
    },
  },
  {
    id: 'wwdc-2026-ai-hardware',
    question: 'Apple WWDC 2026 unveils dedicated AI hardware?',
    resolutionUrl: 'https://www.apple.com/newsroom/',
    options: ['Yes', 'No'],
    optionPools: [165, 105],
    totalPool: 270,
    state: 'open',
    winningOption: null,
    category: 'news',
    mockWinner: 0,
    closesAt: closeIn(30 * MIN),
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'WWDC 2026',
      color: '#3b82f6',
    },
  },
  {
    id: 'fed-rate-cut-may-2026',
    question: 'Fed cuts rates at May 2026 FOMC meeting?',
    resolutionUrl: 'https://www.federalreserve.gov/newsevents.htm',
    options: ['Yes', 'No'],
    optionPools: [80, 140],
    totalPool: 220,
    state: 'open',
    winningOption: null,
    category: 'news',
    mockWinner: 1,
    closesAt: closeIn(60 * MIN),
    meta: {
      kind: 'news',
      flag: 'USA',
      subject: 'Fed FOMC',
      color: '#ff5566',
    },
  },
]
