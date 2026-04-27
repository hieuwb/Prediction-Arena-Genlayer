import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

const TAGLINES = [
  'Spinning up validator nodes…',
  'Streaming live web data…',
  'Calibrating eq_principle consensus…',
  'Lighting the neon arena…',
  'Loading prediction pillars…',
  'Warming up AI judges…',
]

const INTRO = [
  'AI-resolved prediction markets, on-chain.',
  'No oracles. No admin. Validators read the live web,',
  'argue under eq_principle, and settle the bet.',
]

// Full-bleed intro overlay shown until the 3D scene's GLTFs finish loading.
// Auto-dismisses ~600ms after progress hits 100% to avoid a hard pop. The
// overlay is non-interactive once `done` flips so it never blocks the UI.
export function LoadingScreen() {
  const { progress, active } = useProgress()
  const [done, setDone] = useState(false)
  const [tagIdx, setTagIdx] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setTagIdx((i) => (i + 1) % TAGLINES.length)
    }, 1400)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (progress >= 100 && !active) {
      const t = window.setTimeout(() => setDone(true), 600)
      return () => window.clearTimeout(t)
    }
  }, [progress, active])

  return (
    <div
      aria-hidden={done}
      className={`pointer-events-${done ? 'none' : 'auto'} fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0420] transition-opacity duration-700 ${
        done ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated grid backdrop */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 60%, rgba(255,68,221,0.25), transparent 55%), radial-gradient(circle at 30% 30%, rgba(68,221,255,0.15), transparent 50%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,68,221,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(68,221,255,0.18) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(circle at 50% 60%, black 30%, transparent 75%)',
        }}
      />

      <div className="relative z-10 w-full max-w-xl px-6 text-center">
        {/* Brand mark */}
        <div className="mx-auto mb-6 flex items-center justify-center gap-3">
          <div className="relative w-14 h-14 rounded-xl bg-arena-gold/20 border border-arena-gold/60 flex items-center justify-center shadow-2xl shadow-arena-gold/30">
            <div className="w-3.5 h-3.5 rounded-full bg-arena-gold animate-pulse" />
            <div className="absolute -inset-1 rounded-xl border border-arena-gold/40 animate-ping" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase mb-2 bg-gradient-to-r from-arena-gold via-arena-rose to-arena-cyan bg-clip-text text-transparent">
          Prediction Arena
        </h1>
        <div className="text-[11px] sm:text-xs font-bold tracking-[0.4em] text-white/60 uppercase mb-6">
          Built on GenLayer · AI Validator Consensus
        </div>

        {/* Intro paragraph */}
        <div className="space-y-1 text-sm sm:text-base text-white/75 mb-8 font-light leading-relaxed">
          {INTRO.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-arena-rose via-arena-gold to-arena-cyan transition-all duration-300"
              style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tracking-widest uppercase">
          <span className="text-white/55 truncate pr-3">
            {TAGLINES[tagIdx]}
          </span>
          <span className="text-arena-gold font-bold whitespace-nowrap">
            {Math.floor(progress)}%
          </span>
        </div>
      </div>
    </div>
  )
}
