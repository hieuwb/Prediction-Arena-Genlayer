import { useMemo } from 'react'
import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { Bet, Market } from '../types'

// Profile panel — replaces MarketList in the sidebar slot when the user
// is in the profile zone. Shows identity, on-chain admin, stats summary,
// and a scrollable bet history.
export function ProfilePanel() {
  const userAddress = useMarketStore((s) => s.userAddress)
  const parenaBalance = useMarketStore((s) => s.parenaBalance)
  const userBets = useMarketStore((s) => s.userBets)
  const markets = useMarketStore((s) => s.markets)
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
                title="Burn 1 GEN to claim 1000 PARENA"
                className="text-[10px] font-bold uppercase tracking-widest text-arena-cyan hover:text-white px-2 py-1 rounded border border-arena-cyan/40 hover:border-arena-cyan/70 transition"
              >
                + 1000 / 1 GEN
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

      {/* When does the wallet pop up? */}
      {userAddress && (
        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-arena-cyan mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-arena-cyan animate-pulse" />
            When you sign on-chain
          </div>
          <ul className="space-y-1.5 text-[11px] text-white/65 leading-snug">
            <SignRow label="Initialize markets">
              <Code>seed_markets(specs_json)</Code> — value <Code>0</Code>,
              gas only. One-time after a fresh contract deploy.
            </SignRow>
            <SignRow label="Faucet PARENA">
              Plain transfer of <Code>1 GEN</Code> to a burn address.
              Mints <span className="text-arena-gold">+1000 PARENA</span>{' '}
              locally.
            </SignRow>
            <SignRow label="Place bet">
              <Code>place_bet(market_id, option_idx)</Code> with{' '}
              <Code>value=stake</Code>. Pool grows by <Code>stake</Code>{' '}
              wei on chain.
            </SignRow>
            <SignRow label="Auto-resolve">
              <Code>resolve(market_id)</Code> — value <Code>0</Code>,
              fired when the resolve clock hits. Validators read the URL
              + run the LLM, then{' '}
              <Code>eq_principle_strict_eq</Code> commits the winner.
            </SignRow>
          </ul>
          <p className="text-[10px] text-white/40 mt-2 leading-snug">
            Tip: each tx pays ~tiny gas in GEN. If a popup is blocked,
            check the wallet extension or switch to chain{' '}
            <Code>61999</Code>.
          </p>
        </div>
      )}


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

function SignRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-2">
      <span className="text-arena-cyan font-bold shrink-0 mt-0.5">›</span>
      <div>
        <span className="text-white/90 font-semibold">{label}: </span>
        <span className="text-white/60">{children}</span>
      </div>
    </li>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[10.5px] text-arena-cyan/90 bg-arena-cyan/10 px-1 py-px rounded">
      {children}
    </code>
  )
}
