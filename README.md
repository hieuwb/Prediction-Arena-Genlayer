# Prediction Arena 3D

> A 3D prediction-market dApp on **GenLayer**. AI validators fetch live web data and reach consensus on outcomes — no admin resolve, no Chainlink oracle.

5-day hackathon project. Full design + scope + roadmap in [plan.md](./plan.md).

## Live demo

- **Deployed contract:** `0x60Da1d81d4E7a7ED00D1AD3552688b42084c706e` on Genlayer Studio Network (chain id `61999`, RPC `https://studio.genlayer.com/api`)
- **Live market:** Brazil vs Jamaica — Who wins? · [BBC fixtures resolution URL](https://www.bbc.com/sport/football/scores-fixtures/2024-06-05)
- **Wallet:** any EIP-1193 wallet (MetaMask, Rabby). The frontend programmatically adds the chain on first connect.
- The **Brazil-Jamaica** pillar mirrors writes on-chain; the other 8 markets stay in the local mock so reviewers can explore the UX without funding 9 contracts.

## Current status

| Layer | Status | Path |
|---|---|---|
| Smart contract (deployed, single-market) | live on Studio | [contracts/PredictionArena.py](./contracts/PredictionArena.py) |
| Multi-market roadmap source (not deployed) | reference for next milestone | [contracts/PredictionArena.multi.py](./contracts/PredictionArena.multi.py) |
| Deploy guide | step-by-step for Studio | [contracts/DEPLOY.md](./contracts/DEPLOY.md) |
| 3D frontend | full hub + 4 zones, MetaMask, PARENA faucet, mobile responsive, loading screen | [frontend/](./frontend/) |
| Wallet + on-chain mirror | genlayer-js + window.ethereum | [frontend/src/lib/genlayer.ts](./frontend/src/lib/genlayer.ts) |

## Quick start

```bash
# 1. Run the frontend
cd frontend
npm install
cp .env.example .env   # already wired to the live deployed contract
npm run dev
# → http://localhost:5173

# 2. (Optional) Redeploy your own contract on GenLayer Studio
#    → see contracts/DEPLOY.md
#    → paste the new address into frontend/.env (VITE_CONTRACT_ADDRESS)
```

In the browser:

1. Click **Connect Wallet** — your wallet (MetaMask/Rabby) prompts to add **Genlayer Studio Network** (chain `61999`) and switch to it. Approve.
2. Click **+ Faucet** to top up 1000 PARENA (frontend-only test token).
3. Walk to the **Brazil-Jamaica** pillar in the Football zone, place a bet — the wallet pops up to sign the on-chain `place_bet` tx.
4. Other 8 markets accept bets too, mock-only — no signature needed.

The frontend runs in **mock-only mode** automatically when `VITE_CONTRACT_ADDRESS` is unset.

## Architecture (one screen)

```
┌────────────────────────────────────────────┐
│  Frontend  (Vite + React + R3F + Tailwind) │
│  - 3D arena, glowing pillars per market    │
│  - Bet modal, claim button, wallet         │
│  - Profile zone: identity, social, history │
└──────────────────┬─────────────────────────┘
                   │ JSON-RPC via genlayer-js
                   │ (skipped in mock mode)
┌──────────────────▼─────────────────────────┐
│  GenLayer  (Studio / testnetBradbury)      │
│  Intelligent Contract:                     │
│    create_market → place_bet → resolve     │
│                                  ↓         │
│             AI validators consensus via    │
│             gl.eq_principle.strict_eq      │
│                                  ↓         │
│                Web (BBC, CoinGecko, ...)   │
└────────────────────────────────────────────┘
```

## Repo layout

```
.
├── plan.md                    # source of truth — read this first
├── contracts/
│   ├── PredictionArena.py     # Intelligent Contract (Python)
│   ├── DEPLOY.md              # step-by-step Studio deploy
│   ├── seed.md                # 9 demo create_market calls
│   └── README.md              # API surface, resolve flow, notes
├── frontend/
│   ├── src/lib/genlayer.ts    # genlayer-js client + read/write wrappers
│   ├── src/store/markets.ts   # Zustand store, mirrors writes on-chain
│   ├── src/scene/             # R3F: Hub + 4 zones (football/crypto/news/profile)
│   ├── src/ui/                # ProfilePanel, MarketList, BetModal, ZoneChip…
│   └── .env.example           # copy → .env, fill VITE_CONTRACT_ADDRESS
└── .claude/                   # project skills + agent framework
```

## Why this design wins on GenLayer

The differentiator is `resolve()` — every other prediction market needs an oracle or admin to settle. Here the contract:

1. Calls `gl.nondet.web.get(url)` — every validator fetches the page itself.
2. Calls `gl.nondet.exec_prompt(...)` — every validator's LLM reads the page and outputs a strict JSON verdict.
3. `gl.eq_principle.strict_eq(...)` requires those verdicts to match byte-for-byte after `sort_keys` — that's the consensus.

No middleman. No off-chain script. The chain itself reads the web and decides.

## Frontend zones

The hub teleports to four districts:

| District | Color | Markets | Notes |
|---|---|---|---|
| ⚽ Football | green | Brazil-Jamaica, Real-Barça, Liverpool-City | BBC fixtures URLs |
| ◇ Crypto | cyan | BTC > 100k, ETH > 5k, SOL ATH | CoinGecko URLs |
| ☷ News | purple | Apollo-X, EU AI Act, Starship orbit | mixed sources |
| ⚙ Profile | gold | — | identity, Discord/X connect, bet history |

> **Demo-only:** the Discord and X buttons in the Profile zone are local UI toggles (no real OAuth). Wiring real Discord/X OAuth is on the post-hackathon roadmap.

All non-foliage objects (benches, bricks, antennas, goalposts, neon panels) are click-to-fly with mass-scaled physics. Bricks are the baseline; larger objects fly proportionally less.

## Hard rules (don't break)

- **Stack lock-in:** Vite + React + R3F + Tailwind front, GenLayer Python contracts back.
- **Three demo markets** for MVP: 1 football, 1 crypto price, 1 generic event.
- **Never** propose Chainlink, admin resolve, or off-chain resolver.
- **Stop after each plan-day deliverable**, verify on Studio before moving on.

## Resources

- GenLayer Studio: https://studio.genlayer.com/contracts
- Docs: https://docs.genlayer.com
- Football example (basis for `resolve`): https://docs.genlayer.com/developers/intelligent-contracts/examples/prediction
- Builders Program: https://points.genlayer.foundation
- Discord: https://discord.gg/guFPdcpF74
