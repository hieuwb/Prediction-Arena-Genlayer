import { useState } from 'react'
import { useMarketStore } from '../store/markets'
import { STUDIO_FAUCET_URL } from '../lib/genlayer'

function formatGen(wei: bigint | null): string {
  if (wei == null) return '—'
  if (wei === 0n) return '0'
  // 18-decimal token; show up to 4 fractional digits.
  const whole = wei / 10n ** 18n
  const frac = wei % 10n ** 18n
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

export function WalletButton() {
  const userAddress = useMarketStore((s) => s.userAddress)
  const parenaBalance = useMarketStore((s) => s.parenaBalance)
  const chainBalance = useMarketStore((s) => s.chainBalance)
  const connecting = useMarketStore((s) => s.connecting)
  const connect = useMarketStore((s) => s.connect)
  const disconnect = useMarketStore((s) => s.disconnect)
  const claimFaucet = useMarketStore((s) => s.claimFaucet)
  const [open, setOpen] = useState(false)

  if (!userAddress) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="group px-3 sm:px-4 py-2 rounded-lg bg-arena-rose/20 border border-arena-rose/60 hover:bg-arena-rose/30 text-arena-rose font-bold text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-arena-rose/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="inline-block group-hover:translate-x-0.5 transition">▶</span>{' '}
        {connecting ? 'Connecting…' : 'Connect'}
      </button>
    )
  }

  const short = `${userAddress.slice(0, 6)}…${userAddress.slice(-4)}`
  const genStr = formatGen(chainBalance)
  const lowGen = chainBalance != null && chainBalance === 0n

  return (
    <div className="relative">
      {/* Mobile: compact pill that opens a popover. Desktop: full row. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-arena-gold/30 shadow-lg shadow-arena-gold/10"
      >
        <span className="text-xs font-mono text-arena-gold font-bold">
          {parenaBalance}
        </span>
        <span className="text-[9px] text-arena-gold/60 font-bold">PARENA</span>
      </button>

      <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-arena-gold/30 shadow-lg shadow-arena-gold/10">
        <button
          onClick={claimFaucet}
          title="Burn 1 GEN to claim 1000 PARENA"
          className="text-[10px] font-bold uppercase tracking-widest text-arena-cyan hover:text-arena-cyan/80 px-2 py-1 rounded border border-arena-cyan/40 hover:border-arena-cyan/70 transition"
        >
          + Faucet (1 GEN)
        </button>
        <div className="text-right leading-tight">
          <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
            Balance
          </div>
          <div className="text-sm font-mono text-arena-gold font-bold">
            {parenaBalance}{' '}
            <span className="text-[10px] text-arena-gold/60">PARENA</span>
          </div>
          <div
            className={`text-[10px] font-mono ${lowGen ? 'text-arena-rose' : 'text-white/55'}`}
          >
            {genStr} GEN
            {lowGen && (
              <a
                href={STUDIO_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 underline hover:text-arena-rose/80"
              >
                · faucet
              </a>
            )}
          </div>
        </div>
        <div className="h-8 w-px bg-white/15" />
        <button
          onClick={disconnect}
          title="Click to disconnect"
          className="text-xs text-white/70 font-mono hover:text-white"
        >
          {short}
        </button>
      </div>

      {open && (
        <div className="sm:hidden absolute right-0 top-full mt-2 w-60 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-arena-gold/30 shadow-2xl shadow-black/50 p-3 z-50">
          <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
            Wallet
          </div>
          <div className="text-xs font-mono text-white/80 truncate mb-2">
            {short}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
            Balance
          </div>
          <div className="text-base font-mono text-arena-gold font-bold">
            {parenaBalance}{' '}
            <span className="text-[10px] text-arena-gold/60">PARENA</span>
          </div>
          <div
            className={`text-[11px] font-mono mb-3 ${lowGen ? 'text-arena-rose' : 'text-white/55'}`}
          >
            {genStr} GEN (chain)
          </div>
          {lowGen && (
            <a
              href={STUDIO_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full mb-2 py-1.5 rounded text-center text-[11px] font-bold uppercase tracking-widest text-arena-rose border border-arena-rose/50 hover:bg-arena-rose/10"
            >
              ↗ Get GEN from Studio
            </a>
          )}
          <button
            onClick={() => {
              claimFaucet()
              setOpen(false)
            }}
            className="w-full mb-2 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest text-arena-cyan border border-arena-cyan/40 hover:bg-arena-cyan/10"
          >
            + Claim 1000 PARENA · 1 GEN
          </button>
          <button
            onClick={() => {
              disconnect()
              setOpen(false)
            }}
            className="w-full py-1.5 rounded text-[11px] font-bold uppercase tracking-widest text-white/70 border border-white/20 hover:bg-white/5"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
