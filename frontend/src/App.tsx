import { useState } from 'react'
import { Scene } from './scene/Scene'
import { WalletButton } from './ui/WalletButton'
import { MarketList } from './ui/MarketList'
import { ProfilePanel } from './ui/ProfilePanel'
import { BetModal } from './ui/BetModal'
import { Toasts } from './ui/Toast'
import { HelpHint } from './ui/HelpHint'
import { ZoneChip } from './ui/ZoneChip'
import { SoundToggle } from './ui/SoundToggle'
import { LoadingScreen } from './ui/LoadingScreen'
import { useMarketStore } from './store/markets'
import { useIsMobile } from './lib/responsive'

export default function App() {
  const openCount = useMarketStore(
    (s) => s.markets.filter((m) => m.state === 'open').length,
  )
  const view = useMarketStore((s) => s.currentView)
  const mobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Scene />

      <header className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between px-3 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-3 pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30"
          title={`${openCount} market${openCount === 1 ? '' : 's'} open`}
        >
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-arena-gold/20 border border-arena-gold/60 flex items-center justify-center shadow-lg shadow-arena-gold/30">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-arena-gold animate-pulse" aria-hidden="true" />
            <div className="absolute -inset-0.5 rounded-lg border border-arena-gold/40 animate-ping" aria-hidden="true" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight uppercase">
                Prediction Arena
              </h1>
              <span
                title="Validators are watching live web data"
                className="px-1.5 py-0.5 rounded-sm bg-arena-rose/25 border border-arena-rose/60 text-[10px] font-bold text-arena-rose tracking-widest"
              >
                ● LIVE
              </span>
            </div>
            <p className="text-[11px] text-white/70 -mt-0.5 font-mono">
              GenLayer · {openCount} arena{openCount === 1 ? '' : 's'} open · validators ready
            </p>
          </div>
          <div className="block sm:hidden">
            <span className="text-xs font-bold uppercase tracking-tight text-white/90">
              ARENA
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <SoundToggle />
          <WalletButton />
          {mobile && (
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? 'Close panel' : 'Open panel'}
              className="px-2.5 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-arena-gold/30 text-arena-gold text-base shadow-lg shadow-black/30"
            >
              {drawerOpen ? '✕' : '≡'}
            </button>
          )}
        </div>
      </header>

      {!mobile && (
        <aside className="absolute top-24 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto">
          {view === 'profile' ? <ProfilePanel /> : <MarketList />}
        </aside>
      )}

      {mobile && drawerOpen && (
        <>
          <div
            className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-2 right-2 bottom-2 top-20 z-40 pointer-events-auto overflow-hidden">
            <div className="h-full overflow-y-auto rounded-xl">
              {view === 'profile' ? <ProfilePanel /> : <MarketList />}
            </div>
          </aside>
        </>
      )}

      <ZoneChip />
      {!mobile && <HelpHint />}
      <BetModal />
      <Toasts />
      <LoadingScreen />
    </div>
  )
}
