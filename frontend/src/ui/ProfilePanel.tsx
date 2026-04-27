import { useMemo } from 'react'
import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { Bet, Market } from '../types'

// Profile panel — replaces MarketList in the sidebar slot when the user
// is in the profile zone. Shows identity, social connect, stats summary,
// and a scrollable bet history.
export function ProfilePanel() {
  const userAddress = useMarketStore((s) => s.userAddress)
  const parenaBalance = useMarketStore((s) => s.parenaBalance)
  const userBets = useMarketStore((s) => s.userBets)
  const markets = useMarketStore((s) => s.markets)
  const discordConnected = useMarketStore((s) => s.discordConnected)
  const xConnected = useMarketStore((s) => s.xConnected)
  const toggleDiscord = useMarketStore((s) => s.toggleDiscord)
  const toggleX = useMarketStore((s) => s.toggleX)
  const teleport = useMarketStore((s) => s.teleport)
  const select = useMarketStore((s) => s.select)
  const claimFaucet = useMarketStore((s) => s.claimFaucet)
  const seedOnChain = useMarketStore((s) => s.seedOnChain)
  const seeding = useMarketStore((s) => s.seeding)

  const joinedBets = useMemo(() => {
    const byId = new Map(markets.map((m) => [m.id, m]))
    const out: { bet: Bet; market: Market }[] = []
    for (const b of userBets) {
      const m = byId.get(b.marketId)
      if (m) out.push({ bet: b, market: m })
    }
    return out
  }, [userBets, markets])

  const activeBets = joinedBets.filter(({ market }) => market.state !== 'resolved')
  const resolvedBets = joinedBets.filter(({ market }) => market.state === 'resolved')
  const wonBets = resolvedBets.filter(
    ({ bet, market }) => market.winningOption === bet.optionIdx,
  )
  const totalWagered = userBets.reduce((s, b) => s + b.amount, 0)

  return (
    <div className="rounded-xl bg-black/60 backdrop-blur-md border border-arena-gold/40 p-3 shadow-xl shadow-arena-gold/10 max-h-[calc(100vh-9rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/15">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-arena-gold">
          ⚙ Profile
        </h2>
      </div>

      {/* Identity */}
      <div className="rounded-lg bg-white/5 border border-arena-gold/20 p-3 mb-3">
        {userAddress ? (
          <>
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              Wallet
            </div>
            <div className="text-sm font-mono text-white/90 truncate">
              {userAddress}
            </div>
            <div className="flex items-end justify-between mt-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/45">
                  Balance
                </div>
                <div className="text-base font-mono text-arena-gold font-bold">
                  {parenaBalance}{' '}
                  <span className="text-[10px] text-arena-gold/60">PARENA</span>
                </div>
              </div>
              <button
                type="button"
                onClick={claimFaucet}
                className="text-[10px] font-bold uppercase tracking-widest text-arena-cyan hover:text-white px-2 py-1 rounded border border-arena-cyan/40 hover:border-arena-cyan/70 transition"
              >
                + Faucet
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-white/55 italic">
            Connect a wallet to populate your profile.
          </div>
        )}
      </div>

      {/* On-chain admin */}
      {userAddress && (
        <div className="rounded-lg bg-arena-rose/10 border border-arena-rose/30 p-3 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-arena-rose mb-1">
            On-chain admin
          </div>
          <p className="text-[11px] text-white/55 mb-2 leading-snug">
            One-time setup: seed all 9 markets into the deployed contract
            (one wallet signature, idempotent).
          </p>
          <button
            type="button"
            onClick={seedOnChain}
            disabled={seeding}
            className="w-full text-[11px] font-bold uppercase tracking-widest text-arena-rose px-3 py-1.5 rounded border border-arena-rose/50 hover:bg-arena-rose/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seeding ? 'Seeding…' : '⚡ Initialize On-Chain'}
          </button>
        </div>
      )}

      {/* Social */}
      <div className="space-y-1.5 mb-3">
        <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1 px-1">
          Social
        </div>
        <button
          type="button"
          onClick={toggleDiscord}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition focus:outline-none focus-visible:ring-2',
            discordConnected
              ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300 focus-visible:ring-indigo-500/60'
              : 'bg-white/5 border-white/10 text-white/75 hover:border-white/35 focus-visible:ring-white/40',
          )}
          aria-pressed={discordConnected}
        >
          <span className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              ✦
            </span>
            Discord
          </span>
          <span className="text-xs font-mono">
            {discordConnected ? '✓ linked' : '+ connect'}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleX}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition focus:outline-none focus-visible:ring-2',
            xConnected
              ? 'bg-arena-cyan/15 border-arena-cyan/60 text-arena-cyan focus-visible:ring-arena-cyan/60'
              : 'bg-white/5 border-white/10 text-white/75 hover:border-white/35 focus-visible:ring-white/40',
          )}
          aria-pressed={xConnected}
        >
          <span className="flex items-center gap-2">
            <span className="text-base font-bold" aria-hidden="true">
              𝕏
            </span>
            X.com
          </span>
          <span className="text-xs font-mono">
            {xConnected ? '✓ linked' : '+ connect'}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1 px-1">
        Stats
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <Stat label="Active" value={activeBets.length} accent="text-white" />
        <Stat label="Resolved" value={resolvedBets.length} accent="text-white" />
        <Stat label="Wagered" value={totalWagered} accent="text-arena-cyan" />
        <Stat label="Won" value={wonBets.length} accent="text-arena-gold" />
      </div>

      {/* History */}
      <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1 px-1">
        History ({joinedBets.length})
      </div>
      <ul className="space-y-1.5">
        {joinedBets.length === 0 ? (
          <li className="text-xs text-white/40 italic px-2 py-3 text-center">
            No bets yet — visit a district to get started.
          </li>
        ) : (
          [...joinedBets].reverse().map(({ bet, market }, i) => {
            const isResolved = market.state === 'resolved'
            const won = isResolved && market.winningOption === bet.optionIdx
            const lost = isResolved && !won
            return (
              <li key={`${bet.marketId}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    teleport(market.category)
                    setTimeout(() => select(market.id), 100)
                  }}
                  className="w-full text-left px-2 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-gold/50"
                >
                  <div className="text-white/90 truncate font-medium">
                    {market.question}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-white/55 font-mono">
                      {market.options[bet.optionIdx]} · {bet.amount} PARENA
                    </span>
                    <span
                      className={clsx(
                        'text-[10px] font-bold tracking-widest',
                        won && 'text-arena-gold',
                        lost && 'text-arena-rose',
                        !isResolved && 'text-arena-cyan',
                      )}
                    >
                      {won ? 'WON' : lost ? 'LOST' : 'OPEN'}
                    </span>
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>

      <button
        type="button"
        onClick={() => teleport('hub')}
        className="mt-3 w-full text-[11px] py-1.5 rounded bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-cyan/60"
      >
        ← Back to Hub
      </button>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded bg-white/5 border border-white/10 p-2">
      <div className="text-[10px] text-white/50 uppercase tracking-wider">
        {label}
      </div>
      <div className={clsx('text-lg font-mono font-bold', accent)}>{value}</div>
    </div>
  )
}
