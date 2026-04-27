import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bet, Market, Toast, ToastKind, View } from '../types'
import { initialMarkets } from '../mock'
import {
  sfxChime,
  sfxClink,
  sfxFanfare,
  sfxThunk,
  sfxWhoosh,
} from '../lib/sound'
import * as gl from '../lib/genlayer'

// Fire-and-forget on-chain mirror. Multi-market design: every bet/resolve
// hits the deployed contract for its market_id. Skipped only when the
// frontend isn't connected to a contract (mock-only mode) or the user
// hasn't connected a wallet yet — the local UI flow stays responsive
// either way and the toast surfaces the chain result asynchronously.
function mirrorOnChain(
  label: string,
  fn: () => Promise<`0x${string}`>,
  pushToast: (kind: ToastKind, message: string) => void,
) {
  if (!gl.isEnabled() || !gl.getUserAddress()) return
  fn()
    .then((hash) => {
      pushToast('success', `${label} on-chain: ${hash.slice(0, 10)}…`)
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      pushToast('error', `${label} chain call failed: ${msg.slice(0, 80)}`)
    })
}

type State = {
  markets: Market[]
  selectedMarketId: string | null
  userAddress: string | null
  parenaBalance: number
  /** Real on-chain GEN balance in wei. null until first read or when
   *  wallet is disconnected. */
  chainBalance: bigint | null
  userBets: Bet[]
  toasts: Toast[]
  currentView: View
  soundMuted: boolean
  connecting: boolean
  seeding: boolean

  // selectors / mutators
  select: (id: string | null) => void
  connect: () => Promise<void>
  disconnect: () => void
  claimFaucet: () => void
  seedOnChain: () => Promise<void>
  refreshChainBalance: () => Promise<void>
  tickExpiredMarkets: () => void
  placeBet: (marketId: string, optionIdx: number, amount: number) => Promise<void>
  resolveMarket: (marketId: string) => Promise<void>
  claim: (marketId: string) => Promise<void>
  pushToast: (kind: ToastKind, message: string) => void
  dismissToast: (id: number) => void
  teleport: (view: View) => void
  toggleSound: () => void
}

let toastCounter = 0

const FAUCET_AMOUNT = 1000

export const useMarketStore = create<State>()(
  persist(
    (set, get) => ({
      markets: initialMarkets,
      selectedMarketId: null,
      userAddress: null,
      parenaBalance: 1000,
      chainBalance: null,
      userBets: [],
      toasts: [],
      currentView: 'hub',
      soundMuted: false,
      connecting: false,
      seeding: false,

      select: (id) => set({ selectedMarketId: id }),

      teleport: (view) => {
        if (get().currentView === view) return
        set({ currentView: view })
        sfxWhoosh(get().soundMuted)
        if (view === 'hub') {
          get().pushToast('info', 'Returned to Hub')
        } else {
          get().pushToast('info', `Teleporting to ${view.toUpperCase()}…`)
        }
      },

      connect: async () => {
        if (get().connecting) return
        set({ connecting: true })
        try {
          const addr = await gl.connectMetaMask()
          set({
            userAddress: addr,
            parenaBalance: 1000,
            userBets: [],
          })
          sfxThunk(get().soundMuted)
          get().pushToast('success', `Connected ${addr.slice(0, 6)}…${addr.slice(-4)}`)

          // Read on-chain GEN balance immediately so the UI doesn't
          // pretend the wallet has anything before we know the truth.
          await get().refreshChainBalance()
          const wei = get().chainBalance ?? 0n
          if (wei === 0n) {
            get().pushToast(
              'info',
              'Wallet has 0 GEN — top up at studio.genlayer.com/faucet to bet on-chain',
            )
          }

          // Mandatory on-chain init: every bet hits the contract per
          // market_id, so the contract must already know the markets.
          // Compare list_markets() against the LOCAL mock IDs (not just
          // "is non-empty") so when the demo bumps mock IDs, the new
          // ones get seeded onto an already-populated contract. Older
          // markets stay on chain but the frontend simply doesn't
          // surface them — seed_markets is idempotent on existing ids.
          if (gl.isEnabled()) {
            try {
              const listing = await gl.listMarkets()
              const onChainIds = new Set(listing.market_ids ?? [])
              const localIds = get().markets.map((m) => m.id)
              const missing = localIds.some((id) => !onChainIds.has(id))
              if (missing) {
                await get().seedOnChain()
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              get().pushToast(
                'error',
                `On-chain init check failed: ${msg.slice(0, 80)}`,
              )
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          get().pushToast('error', `Connect failed: ${msg.slice(0, 100)}`)
        } finally {
          set({ connecting: false })
        }
      },

      disconnect: () => {
        gl.disconnect()
        set({
          userAddress: null,
          chainBalance: null,
          parenaBalance: 1000,
          userBets: [],
        })
        sfxThunk(get().soundMuted)
        get().pushToast('info', 'Wallet disconnected')
      },

      claimFaucet: () => {
        set((s) => ({ parenaBalance: s.parenaBalance + FAUCET_AMOUNT }))
        sfxClink(get().soundMuted)
        get().pushToast('success', `+${FAUCET_AMOUNT} PARENA from faucet`)
      },

      seedOnChain: async () => {
        const { userAddress, markets, pushToast, seeding } = get()
        if (seeding) return
        if (!userAddress) {
          pushToast('error', 'Connect wallet first')
          return
        }
        if (!gl.isEnabled()) {
          pushToast('error', 'VITE_CONTRACT_ADDRESS not set')
          return
        }
        set({ seeding: true })
        pushToast('info', 'Seeding 9 markets on-chain (1 signature)…')
        try {
          const specs: gl.MarketSpec[] = markets.map((m) => ({
            id: m.id,
            question: m.question,
            resolution_url: m.resolutionUrl,
            options: m.options,
          }))
          const hash = await gl.seedMarkets(specs)
          pushToast('success', `Seeded on-chain: ${hash.slice(0, 10)}…`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          pushToast('error', `Seed failed: ${msg.slice(0, 100)}`)
        } finally {
          set({ seeding: false })
        }
      },

      placeBet: async (marketId, optionIdx, amount) => {
        const { userAddress, parenaBalance, markets, pushToast } = get()
        if (!userAddress) {
          pushToast('error', 'Connect wallet first')
          return
        }
        const market = markets.find((m) => m.id === marketId)
        if (!market || market.state !== 'open') {
          pushToast('error', 'Market not open')
          return
        }
        // Bounds-check the option index. Without this, a stale optionIdx
        // from a switched modal would deduct balance + bump totalPool but
        // never land in any optionPool, leaving the market inconsistent.
        if (
          !Number.isInteger(optionIdx) ||
          optionIdx < 0 ||
          optionIdx >= market.options.length
        ) {
          pushToast('error', 'Invalid option')
          return
        }
        if (amount <= 0 || !Number.isFinite(amount)) {
          pushToast('error', 'Stake must be > 0')
          return
        }
        if (amount > parenaBalance) {
          pushToast('error', 'Insufficient PARENA — claim faucet')
          return
        }

        // On-chain mode: require the wallet signature + receipt BEFORE
        // touching the local UI. If the user rejects in MetaMask or the
        // tx reverts, no balance is deducted and no bet is recorded —
        // the UI never lies about confirmation.
        //
        // Mock-only mode (no contract address): keep the snappy fake
        // confirmation so demo reviewers can explore without a wallet.
        if (gl.isEnabled()) {
          pushToast('info', 'Sign in wallet to place bet…')
          try {
            const hash = await gl.placeBet(marketId, optionIdx, BigInt(amount))
            pushToast(
              'success',
              `Bet confirmed: ${hash.slice(0, 10)}… (${amount} on "${market.options[optionIdx]}")`,
            )
            // Refresh chain balance — gas + value just spent.
            void get().refreshChainBalance()
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            pushToast('error', `Bet rejected: ${msg.slice(0, 100)}`)
            return
          }
        } else {
          pushToast('info', 'Confirming bet (mock)…')
          await new Promise((r) => setTimeout(r, 600))
          pushToast('success', `Staked ${amount} on "${market.options[optionIdx]}"`)
        }

        set((s) => ({
          parenaBalance: s.parenaBalance - amount,
          markets: s.markets.map((m) =>
            m.id !== marketId
              ? m
              : {
                  ...m,
                  optionPools: m.optionPools.map((p, i) =>
                    i === optionIdx ? p + amount : p,
                  ),
                  totalPool: m.totalPool + amount,
                },
          ),
          userBets: [...s.userBets, { marketId, optionIdx, amount }],
        }))
        sfxClink(get().soundMuted)
      },

      resolveMarket: async (marketId) => {
        const market = get().markets.find((m) => m.id === marketId)
        if (!market) return
        // Auto-trigger fires from 'awaiting' (event ended). Manual override
        // could fire from 'open' too. 'pending'/'resolved' are no-ops.
        if (market.state !== 'open' && market.state !== 'awaiting') {
          get().pushToast('info', 'Already resolved or pending')
          return
        }

        get().pushToast('info', 'Validators reading the web…')
        set((s) => ({
          markets: s.markets.map((m) =>
            m.id !== marketId ? m : { ...m, state: 'pending' },
          ),
        }))

        await new Promise((r) => setTimeout(r, 2200))

        set((s) => ({
          markets: s.markets.map((m) =>
            m.id !== marketId
              ? m
              : { ...m, state: 'resolved', winningOption: market.mockWinner },
          ),
        }))
        sfxChime(get().soundMuted)
        get().pushToast('success', `Resolved → "${market.options[market.mockWinner]}"`)
        mirrorOnChain('Resolve', () => gl.resolve(marketId), get().pushToast)
      },

      claim: async (marketId) => {
        const { userAddress, userBets, markets, pushToast } = get()
        if (!userAddress) {
          pushToast('error', 'Connect wallet first')
          return
        }
        const market = markets.find((m) => m.id === marketId)
        if (!market || market.state !== 'resolved' || market.winningOption == null) {
          pushToast('error', 'Market not resolved')
          return
        }
        const winnerIdx = market.winningOption
        const myStake = userBets
          .filter((b) => b.marketId === marketId && b.optionIdx === winnerIdx)
          .reduce((sum, b) => sum + b.amount, 0)
        if (myStake <= 0) {
          pushToast('error', 'No winning stake to claim')
          return
        }
        const winningPool = market.optionPools[winnerIdx]
        if (winningPool <= 0) {
          pushToast('error', 'Empty winning pool')
          return
        }
        const payout = Math.floor((myStake * market.totalPool) / winningPool)

        pushToast('info', 'Claiming…')
        await new Promise((r) => setTimeout(r, 600))

        set((s) => ({
          parenaBalance: s.parenaBalance + payout,
          userBets: s.userBets.filter(
            (b) => !(b.marketId === marketId && b.optionIdx === winnerIdx),
          ),
        }))
        sfxFanfare(get().soundMuted)
        pushToast('success', `Claimed ${payout} PARENA`)
        // No on-chain claim — the contract has no claim() method in
        // single-market mode (frontend computes payout from get_data).
      },

      pushToast: (kind, message) => {
        const id = ++toastCounter
        set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
        setTimeout(() => get().dismissToast(id), 3500)
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      toggleSound: () => set((s) => ({ soundMuted: !s.soundMuted })),

      refreshChainBalance: async () => {
        if (!gl.getUserAddress()) {
          set({ chainBalance: null })
          return
        }
        try {
          const wei = await gl.getChainBalance()
          set({ chainBalance: wei })
        } catch {
          // Silent — RPC may be flaky, leave the previous value.
        }
      },

      tickExpiredMarkets: () => {
        const now = Date.now()
        // Two transitions on every tick:
        //   open → awaiting   when bettingClosesAt has passed (kickoff,
        //                     candle close). Pure local state flip, no
        //                     wallet interaction.
        //   awaiting → resolve  when resolvesAt has passed. Calls
        //                       resolveMarket which flips to 'pending'
        //                       immediately so we don't re-fire next tick.
        const closing: string[] = []
        const resolving: string[] = []
        for (const m of get().markets) {
          if (m.state === 'open' && m.bettingClosesAt <= now) closing.push(m.id)
          else if (m.state === 'awaiting' && m.resolvesAt <= now)
            resolving.push(m.id)
        }
        if (closing.length > 0) {
          set((s) => ({
            markets: s.markets.map((m) =>
              closing.includes(m.id) ? { ...m, state: 'awaiting' as const } : m,
            ),
          }))
        }
        for (const id of resolving) void get().resolveMarket(id)
      },
    }),
    {
      name: 'arena-store',
      version: 5,
      // Persist user-owned state + scene state. Skip transient bits
      // (toasts, selected modal) so reload doesn't restore a half-open
      // bet flow.
      partialize: (state) => ({
        markets: state.markets,
        userAddress: state.userAddress,
        parenaBalance: state.parenaBalance,
        userBets: state.userBets,
        currentView: state.currentView,
        soundMuted: state.soundMuted,
      }),
    },
  ),
)
