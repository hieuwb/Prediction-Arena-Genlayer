import clsx from 'clsx'
import { useMarketStore } from '../store/markets'
import type { ToastKind } from '../types'

const KIND_CLS: Record<ToastKind, string> = {
  info: 'border-white/30 bg-white/10 text-white',
  success: 'border-arena-cyan/40 bg-arena-cyan/10 text-arena-cyan',
  error: 'border-arena-rose/40 bg-arena-rose/10 text-arena-rose',
}

export function Toasts() {
  const toasts = useMarketStore((s) => s.toasts)
  return (
    <div className="absolute bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'px-3 py-2 rounded-lg border backdrop-blur-md text-xs font-medium shadow-lg',
            KIND_CLS[t.kind],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
