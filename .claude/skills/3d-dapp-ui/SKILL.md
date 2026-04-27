---
name: 3d-dapp-ui
description: Build the 2D UI overlay (Tailwind), wallet integration (wagmi/RainbowKit/GenLayer client), and the bridge between contract state and 3D scene state for the Prediction Arena. Use when editing frontend/src/ui/, wiring wallet, building bet/claim modals, or syncing on-chain market state into the Zustand store that drives the scene.
---

# 3D dApp UI — Overlay + Wallet + Sync

The 3D scene is the spectacle; the UI overlay is where bets actually happen. Architecture:

```
┌── Canvas (3D) ──────────────────────────┐
│   <Arena/> <Pillar/> <Pillar/> ...      │  ← reads from useMarketStore
└─────────────────────────────────────────┘
┌── HTML overlay (Tailwind) ──────────────┐
│  Header: <ConnectButton/>               │
│  Sidebar: <MarketList/>                 │
│  Modal:  <BetModal/> <ClaimModal/>      │  ← writes via wallet → contract → refetch
└─────────────────────────────────────────┘
        ↑              ↓
        └── useMarketStore (Zustand) ─────┘
              ↑
        Polling / event subscription to GenLayer RPC
```

## When to invoke

- Editing `frontend/src/ui/**`, `frontend/src/store/**`, `frontend/src/lib/genlayer.ts`
- User asks to "add bet modal", "wire wallet", "show market list", "sync state", "refresh after tx"

## DOM layout — overlay over Canvas

```tsx
// frontend/src/App.tsx
export function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene />   {/* absolute fill via the Canvas */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between pointer-events-none">
        <h1 className="text-white font-bold pointer-events-auto">Prediction Arena</h1>
        <div className="pointer-events-auto"><ConnectButton /></div>
      </header>
      <aside className="absolute top-20 left-4 w-80 z-10 pointer-events-auto">
        <MarketList />
      </aside>
      <BetModal />     {/* portal-rendered, opens via store */}
      <ClaimModal />
    </div>
  )
}
```

**Key trick:** The wrapper has `pointer-events: none` on regions that should pass clicks through to the Canvas (so you can click pillars). Re-enable with `pointer-events-auto` on actual UI elements.

## Wallet — GenLayer client

GenLayer uses its own RPC, not standard EVM. Use the official JS client:

```ts
// frontend/src/lib/genlayer.ts
import { createClient, createAccount } from 'genlayer-js'
import { simulator } from 'genlayer-js/chains'

export const account = createAccount(localStorage.getItem('pk') ?? undefined)
export const client = createClient({ chain: simulator, account })

export async function placeBet(marketId: string, optionIdx: number, amount: bigint) {
  const hash = await client.writeContract({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'place_bet',
    args: [marketId, optionIdx],
    value: amount,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function getMarket(marketId: string) {
  return client.readContract({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'get_market',
    args: [marketId],
  })
}
```

For hackathon simplicity, **store the private key in localStorage** with a clear demo-only warning. Don't try to bolt on RainbowKit/MetaMask in 5 days unless GenLayer's wallet support is solid.

## State store — single source of truth

```ts
// frontend/src/store/markets.ts
import { create } from 'zustand'
import { getMarket } from '@/lib/genlayer'

type State = {
  markets: Market[]
  selected: string | null
  refresh: () => Promise<void>
  select: (id: string | null) => void
}

export const useMarketStore = create<State>((set, get) => ({
  markets: [],
  selected: null,
  refresh: async () => {
    const ids = ['football-1', 'btc-100k', 'event-1']  // hardcoded for MVP
    const markets = await Promise.all(ids.map(getMarket))
    set({ markets })
  },
  select: (id) => set({ selected: id }),
}))
```

Both the 3D scene (`<Pillar>`) and the 2D UI (`<MarketList>`) subscribe to this. **One store, two views** — no duplication.

## Polling pattern (for hackathon — events would be cleaner)

```ts
// in App.tsx
useEffect(() => {
  const refresh = useMarketStore.getState().refresh
  refresh()
  const id = setInterval(refresh, 5000)
  return () => clearInterval(id)
}, [])
```

After a write, force-refresh immediately:

```ts
async function onConfirmBet() {
  await placeBet(marketId, optionIdx, amount)
  await useMarketStore.getState().refresh()
  closeModal()
}
```

## Bet modal pattern

```tsx
function BetModal() {
  const { selected, markets, select } = useMarketStore()
  const market = markets.find((m) => m.id === selected)
  if (!market) return null

  const [optionIdx, setOptionIdx] = useState(0)
  const [amount, setAmount] = useState('0.01')
  const [pending, setPending] = useState(false)

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 text-white p-6 rounded-2xl w-96">
        <h2 className="text-xl mb-4">{market.question}</h2>
        {market.options.map((opt, i) => (
          <button key={i} onClick={() => setOptionIdx(i)}
            className={`block w-full p-3 my-1 rounded ${optionIdx === i ? 'bg-cyan-600' : 'bg-zinc-800'}`}>
            {opt}
          </button>
        ))}
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-3 p-2 bg-zinc-800 rounded" />
        <div className="flex gap-2 mt-4">
          <button onClick={() => select(null)} className="flex-1 p-2 bg-zinc-800 rounded">Cancel</button>
          <button disabled={pending} onClick={async () => {
            setPending(true)
            try {
              await placeBet(market.id, optionIdx, parseEther(amount))
              await useMarketStore.getState().refresh()
              select(null)
            } finally { setPending(false) }
          }} className="flex-1 p-2 bg-cyan-600 rounded disabled:opacity-50">
            {pending ? 'Confirming…' : 'Place Bet'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Pillar click → modal open

In `<Pillar>`, the onClick calls `useMarketStore.getState().select(market.id)` which opens `<BetModal>`. **One direction**: scene fires events → store updates → UI reacts.

## UI styling rules

- **Tailwind only** — no CSS-in-JS bloat. Class strings stay short with `clsx` if conditional.
- **Glass morphism for overlays** — `bg-black/40 backdrop-blur-md` reads well over the 3D scene.
- **Match the 3D color palette** — cyan #33ccff (open), gold #ffcc33 (won), white (pending). Use these in Tailwind via `[--cyan:#33ccff]` custom props or extend the theme.
- **Z-index discipline:** Canvas = 0, sidebar/header = 10, modal = 20, toast = 30.

## Tx UX

- Every write button has 3 states: `idle`, `pending` (disabled + spinner), `error` (toast). Never let the user double-click a tx.
- Show a tx-receipt link if GenLayer simulator exposes one — judges love seeing the on-chain trail.
- After resolve, animate the winning pillar (gold emissive) — the scene celebration sells the pitch.

## What NOT to do

- Don't put wallet logic inside scene components — keep it in `lib/genlayer.ts` and `store/`.
- Don't useState for market data — Zustand store, single source.
- Don't render UI inside `<Canvas>` (it'd become 3D text). Keep HTML/Tailwind outside the Canvas wrapper.
- Don't wait for events; for hackathon, polling every 5s is fine.
- Don't add i18n, dark/light toggle, or settings page — out of MVP scope.
