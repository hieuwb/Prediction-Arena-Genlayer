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

          // Mandatory on-chain init: every bet hits the contract per
          // market_id, so the contract must already know the markets.
          // Probe list_markets() — if empty, seed; if already populated,
          // skip silently. Probe failures (contract missing, network)
          // surface as a toast but don't block UI.
          if (gl.isEnabled()) {
            try {
              const listing = await gl.listMarkets()
              const seeded = (listing.market_ids ?? []).length > 0
              if (!seeded) {
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
        if (market.state !== 'open') {
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

      tickExpiredMarkets: () => {
        const now = Date.now()
        const expired = get().markets.filter(
          (m) => m.state === 'open' && m.closesAt <= now,
        )
        for (const m of expired) {
          // Fire-and-forget — resolveMarket flips state to 'pending'
          // immediately so this same market won't be picked up again
          // on the next tick.
          void get().resolveMarket(m.id)
        }
      },
    }),
    {
      name: 'arena-store',
      version: 3,
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
