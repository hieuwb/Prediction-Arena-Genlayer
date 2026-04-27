import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { Market, MarketCategory, View } from '../types'
import { useCountdown, formatCountdown } from '../lib/countdown'

function CountdownPill({
  target,
  prefix,
}: {
  target: number
  prefix: string
}) {
  const remaining = useCountdown(target)
  const urgent = remaining > 0 && remaining < 60_000
  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 text-[11px] font-mono',
        urgent ? 'text-arena-rose' : 'text-white/55',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full',
          urgent ? 'bg-arena-rose animate-pulse' : 'bg-white/40',
        )}
      />
      {remaining > 0 ? `${prefix} ${formatCountdown(remaining)}` : 'closing…'}
    </div>
  )
}

const STATE_BADGE: Record<Market['state'], { label: string; cls: string }> = {
  open: {
    label: 'Open',
    cls: 'bg-arena-cyan/20 text-arena-cyan border-arena-cyan/40',
  },
  awaiting: {
    label: 'Awaiting',
    cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  pending: {
    label: 'Resolving…',
    cls: 'bg-white/15 text-white border-white/30',
  },
  resolved: {
    label: 'Resolved',
    cls: 'bg-arena-gold/15 text-arena-gold border-arena-gold/40',
  },
}

const VIEW_TITLE: Record<View, string> = {
  hub: '☀ All Markets',
  football: '⚽ Football',
  crypto: '◇ Crypto',
  news: '☷ News',
  // Profile view never renders MarketList (App.tsx swaps to ProfilePanel),
  // but the Record type still requires every View key.
  profile: '⚙ Profile',
}

const CAT_ICON: Record<MarketCategory, string> = {
  football: '⚽',
  crypto: '◇',
  news: '☷',
}

const COLLAPSE_KEY = 'arena-sidebar-collapsed'

export function MarketList() {
  const allMarkets = useMarketStore((s) => s.markets)
  const view = useMarketStore((s) => s.currentView)
  const select = useMarketStore((s) => s.select)
  const teleport = useMarketStore((s) => s.teleport)

  // Collapsed state lives in localStorage so the user's preference
  // sticks across reloads. Default-collapse on small viewports so the
  // 3D scene isn't covered on phones / narrow tablets.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(COLLAPSE_KEY)
    if (saved != null) return saved === '1'
    return window.innerWidth < 768
  })
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    }
  }, [collapsed])

  const markets =
    view === 'hub'
      ? allMarkets
      : allMarkets.filter((m) => m.category === view)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Expand markets list"
        aria-label="Expand markets list"
        className="ml-auto block px-3 py-2 rounded-lg bg-black/55 backdrop-blur-md border border-arena-gold/30 text-arena-gold text-xs font-bold uppercase tracking-widest hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-gold/60 shadow-lg shadow-black/30"
      >
        ◀ {markets.length} markets
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-black/60 backdrop-blur-md border border-arena-gold/30 p-3 shadow-xl shadow-arena-gold/10 max-h-[calc(100vh-9rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/15 gap-2">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-arena-gold truncate">
          {VIEW_TITLE[view]}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-white/55 font-mono">
            {markets.length}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse markets list"
            aria-label="Collapse markets list"
            className="text-white/50 hover:text-white text-xs px-1.5 py-0.5 rounded border border-white/15 hover:border-white/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-cyan/60"
          >
            ▶
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {markets.map((m) => {
          const badge = STATE_BADGE[m.state]
          return (
            <li
              key={m.id}
              className="rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <button
                type="button"
                onClick={() => select(m.id)}
                className="w-full text-left p-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-cyan/60"
                aria-label={`Open market: ${m.question}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-sm font-medium leading-snug">
                    {view === 'hub' && (
                      <span className="text-white/40 mr-1" aria-hidden="true">
                        {CAT_ICON[m.category]}
                      </span>
                    )}
                    {m.question}
                  </div>
                  <span
                    className={clsx(
                      'shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-medium',
                      badge.cls,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/55">
                  <div>
                    Pool:{' '}
                    <span className="text-white/85 font-mono">{m.totalPool}</span> PARENA
                  </div>
                  {m.state === 'resolved' && m.winningOption != null && (
                    <div className="text-arena-gold">
                      → {m.options[m.winningOption]}
                    </div>
                  )}
                  {m.state === 'pending' && (
                    <div className="flex items-center gap-1.5 text-white/70 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      validators…
                    </div>
                  )}
                  {m.state === 'open' && (
                    <CountdownPill target={m.bettingClosesAt} prefix="closes" />
                  )}
                  {m.state === 'awaiting' && (
                    <CountdownPill target={m.resolvesAt} prefix="result" />
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {view === 'hub' ? (
        <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
          Step on a teleport pad to enter a district. Each pad takes you to a
          different market category.
        </p>
      ) : (
        <button
          onClick={() => teleport('hub')}
          className="mt-3 w-full text-[11px] py-1.5 rounded bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-cyan/60"
        >
          ← Back to Hub
        </button>
      )}
    </div>
  )
}
