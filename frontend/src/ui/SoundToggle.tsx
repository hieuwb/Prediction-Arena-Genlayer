import { useMarketStore } from '../store/markets'

export function SoundToggle() {
  const muted = useMarketStore((s) => s.soundMuted)
  const toggle = useMarketStore((s) => s.toggleSound)

  return (
    <button
      onClick={toggle}
      title={muted ? 'Sound is off — click to unmute' : 'Sound is on — click to mute'}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={!muted}
      className="w-10 h-10 rounded-lg bg-black/50 backdrop-blur-md border border-white/15 hover:border-white/35 text-white/80 hover:text-white text-base flex items-center justify-center shadow-lg shadow-black/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-arena-cyan/60"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
