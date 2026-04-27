export function HelpHint() {
  return (
    <div className="absolute bottom-4 left-4 z-30 max-w-sm pointer-events-auto">
      <div className="rounded-xl bg-black/50 backdrop-blur-md border border-arena-gold/20 p-3 text-xs text-white/65 leading-relaxed shadow-lg shadow-arena-gold/5">
        <div className="text-arena-gold font-bold uppercase tracking-[0.2em] text-[10px] mb-1.5">
          ☼ How the arena works
        </div>
        Each glowing pillar is a real prediction market. AI validators on
        GenLayer fetch the resolution URL, read the page, and converge on a
        single answer via{' '}
        <span className="text-arena-cyan font-mono">strict_eq</span> consensus.
        No oracle, no admin. Click a pillar to bet.
      </div>
    </div>
  )
}
