import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { View } from '../types'

const LABEL: Record<View, { name: string; tone: string }> = {
  hub: { name: 'Hub', tone: 'text-arena-gold border-arena-gold/50' },
  football: {
    name: '⚽ Football',
    tone: 'text-arena-leaf border-arena-leaf/60',
  },
  crypto: {
    name: '◇ Crypto',
    tone: 'text-cyan-300 border-cyan-300/60',
  },
  news: {
    name: '☷ News',
    tone: 'text-arena-rose border-arena-rose/60',
  },
  profile: {
    name: '⚙ Profile',
    tone: 'text-arena-gold border-arena-gold/60',
  },
}

export function ZoneChip() {
  const view = useMarketStore((s) => s.currentView)
  const teleport = useMarketStore((s) => s.teleport)
  const meta = LABEL[view]

  return (
    <div className="absolute top-24 left-4 z-30 pointer-events-auto flex flex-col gap-2">
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/30',
          meta.tone,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {meta.name}
      </div>

      {view !== 'hub' && (
        <button
          onClick={() => teleport('hub')}
          className="self-start text-[11px] px-3 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-black/65 transition uppercase tracking-wider"
        >
          ← Return to Hub
        </button>
      )}
    </div>
  )
}
