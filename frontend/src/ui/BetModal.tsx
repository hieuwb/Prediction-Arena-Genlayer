import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { Market } from '../types'

// Outer shell only handles "is a market selected" + escape/click-outside.
// All per-market state (selected option, stake, pending) lives in
// <BetModalInner key={market.id} /> so React fully remounts when the user
// switches markets — no useEffect-driven reset, no stale optionIdx.
export function BetModal() {
  const selectedMarketId = useMarketStore((s) => s.selectedMarketId)
  const markets = useMarketStore((s) => s.markets)
  const select = useMarketStore((s) => s.select)
  const market = markets.find((m) => m.id === selectedMarketId)

  // Escape closes the modal — required for keyboard accessibility.
  useEffect(() => {
    if (!market) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [market, select])

  if (!market) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={() => select(null)}
    >
      <BetModalInner key={market.id} market={market} onClose={() => select(null)} />
    </div>
  )
}

function BetModalInner({
  market,
  onClose,
}: {
  market: Market
  onClose: () => void
}) {
  const userAddress = useMarketStore((s) => s.userAddress)
  const userBets = useMarketStore((s) => s.userBets)
  const placeBet = useMarketStore((s) => s.placeBet)
  const resolveMarket = useMarketStore((s) => s.resolveMarket)
  const claim = useMarketStore((s) => s.claim)

  const [optionIdx, setOptionIdx] = useState(0)
  const [amount, setAmount] = useState('25')
  const [pending, setPending] = useState(false)

  // Move keyboard focus to the close button on open so Escape/Tab work
  // immediately for keyboard users.
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const myStakeOnWinner =
    market.winningOption != null
      ? userBets
          .filter(
            (b) =>
              b.marketId === market.id && b.optionIdx === market.winningOption,
          )
          .reduce((s, b) => s + b.amount, 0)
      : 0

  const winningPool =
    market.winningOption != null ? market.optionPools[market.winningOption] : 0
  const projectedPayout =
    winningPool > 0
      ? Math.floor((myStakeOnWinner * market.totalPool) / winningPool)
      : 0

  const myStakeByOption: Record<number, number> = {}
  userBets
    .filter((b) => b.marketId === market.id)
    .forEach((b) => {
      myStakeByOption[b.optionIdx] = (myStakeByOption[b.optionIdx] ?? 0) + b.amount
    })

  return (
    <div
      className="w-[28rem] max-w-[92vw] rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl shadow-black/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="text-[10px] uppercase tracking-widest text-white/40">
          {market.category}
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="text-white/40 hover:text-white -mt-1 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <h2
        id="bet-modal-title"
        className="text-lg font-semibold leading-snug mb-1"
      >
        {market.question}
      </h2>
      <a
        href={market.resolutionUrl}
        target="_blank"
        rel="noreferrer"
        className="block text-[11px] text-arena-cyan/80 hover:text-arena-cyan truncate mb-4"
      >
        ↗ {market.resolutionUrl}
      </a>

      <div className="space-y-1.5 mb-4">
        {market.options.map((opt, i) => {
          const pool = market.optionPools[i]
          const pct =
            market.totalPool > 0
              ? Math.round((pool / market.totalPool) * 100)
              : 0
          const myStake = myStakeByOption[i] ?? 0
          const isWinning =
            market.state === 'resolved' && market.winningOption === i
          const isSelected = market.state === 'open' && optionIdx === i
          return (
            <button
              key={i}
              disabled={market.state !== 'open'}
              onClick={() => setOptionIdx(i)}
              aria-pressed={isSelected}
              className={clsx(
                'relative w-full px-3 py-2.5 rounded-lg border text-left transition overflow-hidden',
                isSelected
                  ? 'bg-arena-cyan/15 border-arena-cyan/50 text-white'
                  : isWinning
                    ? 'bg-arena-gold/15 border-arena-gold/50 text-white'
                    : market.state === 'open'
                      ? 'bg-white/5 border-white/10 hover:border-white/30 text-white/85'
                      : 'bg-white/5 border-white/10 text-white/50',
              )}
            >
              <div
                className={clsx(
                  'absolute inset-y-0 left-0 opacity-25',
                  isWinning ? 'bg-arena-gold' : 'bg-arena-cyan',
                )}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {isWinning && <span className="text-arena-gold">★</span>}
                  <span className="font-medium">{opt}</span>
                  {myStake > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                      you: {myStake}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-white/60">
                  {pool} · {pct}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {market.state === 'open' && (
        <>
          <label
            htmlFor="bet-stake"
            className="block text-[11px] uppercase tracking-widest text-white/40 mb-1"
          >
            Stake (PARENA)
          </label>
          <input
            id="bet-stake"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 focus:border-arena-cyan/60 outline-none text-sm font-mono"
          />
          <button
            disabled={pending || !userAddress}
            onClick={async () => {
              setPending(true)
              try {
                await placeBet(market.id, optionIdx, parseFloat(amount))
              } finally {
                setPending(false)
                onClose()
              }
            }}
            className="w-full py-2.5 rounded-lg bg-arena-cyan text-black font-semibold text-sm hover:bg-arena-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {!userAddress
              ? 'Connect wallet to bet'
              : pending
                ? 'Confirming…'
                : `Place bet on "${market.options[optionIdx]}"`}
          </button>
          <button
            onClick={() => resolveMarket(market.id)}
            className="w-full mt-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10"
          >
            Resolve now (simulate validators)
          </button>
        </>
      )}

      {market.state === 'pending' && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-white/70">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Validators fetching {tryHostname(market.resolutionUrl)}…
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            eq_principle · waiting for consensus
          </div>
        </div>
      )}

      {market.state === 'resolved' && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="text-xs text-white/50 mb-1">Your winning stake</div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-sm font-mono">{myStakeOnWinner} PARENA</div>
            <div className="text-xs text-white/50">
              payout ≈{' '}
              <span className="text-arena-gold font-mono">{projectedPayout}</span>{' '}
              PARENA
            </div>
          </div>
          <button
            disabled={pending || myStakeOnWinner <= 0}
            onClick={async () => {
              setPending(true)
              try {
                await claim(market.id)
              } finally {
                setPending(false)
                onClose()
              }
            }}
            className="w-full py-2 rounded-lg bg-arena-gold text-black font-semibold text-sm hover:bg-arena-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {myStakeOnWinner <= 0
              ? 'Nothing to claim'
              : pending
                ? 'Claiming…'
                : 'Claim'}
          </button>
        </div>
      )}
    </div>
  )
}

function tryHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
