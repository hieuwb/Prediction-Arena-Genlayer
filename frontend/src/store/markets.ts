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

// Fire-and-forget on-chain mirror. Single-market design: only the bet
// on `LIVE_MARKET_ID` is mirrored to the deployed contract; other
// markets stay mock-only. Keeps the local UI flow responsive while the
// on-chain tx happens in the background. Toasts surface result.
function mirrorOnChain(
  marketId: string,
  label: string,
  fn: () => Promise<`0x${string}`>,
  pushToast: (kind: ToastKind, message: string) => void,
) {
  if (!gl.isLiveMarket(marketId)) return
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
  discordConnected: boolean
  xConnected: boolean
  connecting: boolean

  // selectors / mutators
  select: (id: string | null) => void
  connect: () => Promise<void>
  disconnect: () => void
  claimFaucet: () => void
  placeBet: (marketId: string, optionIdx: number, amount: number) => Promise<void>
  resolveMarket: (marketId: string) => Promise<void>
  claim: (marketId: string) => Promise<void>
  pushToast: (kind: ToastKind, message: string) => void
  dismissToast: (id: number) => void
  teleport: (view: View) => void
  toggleSound: () => void
  toggleDiscord: () => void
  toggleX: () => void
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
      discordConnected: false,
      xConnected: false,
      connecting: false,

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

        pushToast('info', 'Confirming bet…')
        await new Promise((r) => setTimeout(r, 800))

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
        pushToast('success', `Staked ${amount} on "${market.options[optionIdx]}"`)
        mirrorOnChain(
          marketId,
          'Bet',
          () => gl.placeBet(optionIdx, BigInt(amount)),
          pushToast,
        )
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
        mirrorOnChain(marketId, 'Resolve', () => gl.resolve(), get().pushToast)
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

      toggleDiscord: () => {
        const next = !get().discordConnected
        set({ discordConnected: next })
        get().pushToast(
          next ? 'success' : 'info',
          next ? 'Discord linked (demo)' : 'Discord unlinked',
        )
      },

      toggleX: () => {
        const next = !get().xConnected
        set({ xConnected: next })
        get().pushToast(
          next ? 'success' : 'info',
          next ? 'X linked (demo)' : 'X unlinked',
        )
      },
    }),
    {
      name: 'arena-store',
      version: 2,
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
        discordConnected: state.discordConnected,
        xConnected: state.xConnected,
      }),
    },
  ),
)
