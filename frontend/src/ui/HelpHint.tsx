import { useEffect, useState } from 'react'
import clsx from 'clsx'

// Bottom-left tutorial chip. Renders a 1-line teaser that the user can
// expand into a full popup with the complete walkthrough.
export function HelpHint() {
  const [open, setOpen] = useState(false)

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open how-it-works guide"
        className="absolute bottom-4 left-4 z-30 max-w-sm pointer-events-auto group text-left"
      >
        <div className="rounded-xl bg-black/55 backdrop-blur-md border border-arena-gold/30 group-hover:border-arena-gold/60 p-3 text-xs text-white/75 leading-relaxed shadow-lg shadow-arena-gold/10 transition">
          <div className="flex items-center justify-between mb-1">
            <span className="text-arena-gold font-bold uppercase tracking-[0.2em] text-[10px]">
              ☼ How it works
            </span>
            <span className="text-[10px] text-arena-cyan/80 font-mono group-hover:text-arena-cyan transition">
              click for guide ↗
            </span>
          </div>
          <span className="block truncate">
            AI validators read the live web · settle bets via{' '}
            <span className="text-arena-cyan font-mono">strict_eq</span>
          </span>
        </div>
      </button>

      {open && <GuideModal onClose={() => setOpen(false)} />}
    </>
  )
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-sm pointer-events-auto px-4"
      onClick={onClose}
    >
      <div
        className="w-[34rem] max-w-[94vw] max-h-[88vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-arena-gold/40 shadow-2xl shadow-arena-gold/20 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-arena-cyan font-bold mb-1">
              Prediction Arena · GenLayer
            </div>
            <h2
              id="guide-title"
              className="text-2xl font-black bg-gradient-to-r from-arena-gold via-arena-rose to-arena-cyan bg-clip-text text-transparent"
            >
              How the arena works
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="text-white/40 hover:text-white -mt-1 text-2xl leading-none shrink-0"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-white/75 leading-relaxed mb-5">
          Each glowing pillar is a live prediction market. There&apos;s no
          oracle and no admin — when a market closes, GenLayer&apos;s AI
          validators read the resolution URL, agree on the outcome via{' '}
          <Mono>eq_principle_strict_eq</Mono>, and post the result on chain.
        </p>

        <Section title="1 · Connect a wallet">
          <p>
            Click <Pill tone="rose">Connect</Pill> top-right. Approve adding{' '}
            <Mono>Genlayer Studio Network</Mono> (chain id <Mono>61999</Mono>)
            and switch to it. You&apos;ll see your address and balances appear.
          </p>
          <p className="text-white/55 mt-2">
            Don&apos;t have GEN? Top up at{' '}
            <a
              href="https://studio.genlayer.com/faucet"
              target="_blank"
              rel="noreferrer"
              className="text-arena-cyan underline hover:text-white"
            >
              studio.genlayer.com/faucet
            </a>
            .
          </p>
        </Section>

        <Section title="2 · Get PARENA">
          <p>
            <Pill tone="cyan">+ Faucet (1 GEN)</Pill> burns 1 GEN to mint
            <span className="text-arena-gold font-mono"> 1000 PARENA</span> in
            your local balance. PARENA is the bet token; it lives in the
            frontend so reviewers can play without bridging real assets.
          </p>
        </Section>

        <Section title="3 · Place a bet">
          <p>
            Walk to a pillar (or use the sidebar list). Click → modal opens.
            Pick an option — each shows implied probability ({' '}
            <Mono>%</Mono>) and payout multiplier ({' '}
            <Mono>×</Mono>) parimutuel-style. Stake amount → see the live{' '}
            <span className="text-arena-cyan">If X wins → +Y PARENA</span>{' '}
            preview. Confirm → wallet pops up to sign{' '}
            <Mono>place_bet(market_id, option_idx)</Mono> with{' '}
            <Mono>value=stake</Mono>.
          </p>
        </Section>

        <Section title="4 · Resolution (the magic)">
          <p>
            Each market has two clocks: <em>betting closes</em> (kickoff /
            candle close) then <em>resolves</em> (match end / midnight).
            When the resolve clock hits, the auto-resolve fires{' '}
            <Mono>resolve(market_id)</Mono>. Validators on the GenLayer
            network each fetch the resolution URL, ask their LLM for a
            JSON verdict, and{' '}
            <Mono>eq_principle_strict_eq</Mono> requires byte-identical
            output across runs — that&apos;s the consensus.
          </p>
          <p className="text-white/55 mt-2">
            The validator&apos;s reasoning sentence appears in the bet modal
            once the result is committed.
          </p>
        </Section>

        <Section title="5 · Claim">
          <p>
            Resolved market with your stake on the winner → modal shows{' '}
            <Pill tone="gold">Claim</Pill>. Payout is parimutuel:{' '}
            <Mono>stake × totalPool / winningPool</Mono>. PARENA balance
            updates instantly.
          </p>
        </Section>

        <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/45 leading-relaxed">
          GenLayer Studio Network · chain <Mono>61999</Mono> · RPC{' '}
          <Mono>studio.genlayer.com/api</Mono>. The deployed multi-market
          contract holds all 9 demo markets keyed by{' '}
          <Mono>market_id</Mono>. View source +{' '}
          <Mono>seed_markets</Mono>/<Mono>place_bet</Mono>/
          <Mono>resolve</Mono> on the GitHub repo.
        </div>

        <div className="mt-4 pt-3 border-t border-arena-gold/20">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-arena-gold mb-2">
            Contact
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://github.com/hieuwb/Prediction-Arena-Genlayer"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/40 transition group"
            >
              <span className="text-base" aria-hidden="true">⌥</span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                  GitHub
                </div>
                <div className="text-xs font-mono text-white/85 group-hover:text-white truncate">
                  hieuwb/Prediction-Arena
                </div>
              </div>
            </a>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <span className="text-base text-indigo-300" aria-hidden="true">
                ✦
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">
                  Discord
                </div>
                <div className="text-xs font-mono text-white/85">hieuwb</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg bg-arena-cyan/15 border border-arena-cyan/40 text-arena-cyan text-sm font-bold uppercase tracking-widest hover:bg-arena-cyan/25 transition"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-arena-gold mb-1.5">
        {title}
      </h3>
      <div className="text-sm text-white/75 leading-relaxed">{children}</div>
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12px] text-arena-cyan bg-arena-cyan/10 px-1 py-0.5 rounded">
      {children}
    </code>
  )
}

function Pill({
  tone,
  children,
}: {
  tone: 'rose' | 'cyan' | 'gold'
  children: React.ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border',
        tone === 'rose' && 'bg-arena-rose/15 border-arena-rose/50 text-arena-rose',
        tone === 'cyan' && 'bg-arena-cyan/15 border-arena-cyan/50 text-arena-cyan',
        tone === 'gold' && 'bg-arena-gold/15 border-arena-gold/50 text-arena-gold',
      )}
    >
      {children}
    </span>
  )
}
