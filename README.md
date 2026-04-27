# Prediction Arena 3D

> A 3D prediction-market dApp on **GenLayer**. AI validators fetch live web data and reach consensus on outcomes — no admin resolve, no Chainlink oracle.

5-day hackathon project.

## Live demo

- **Repo:** https://github.com/hieuwb/Prediction-Arena-Genlayer
- **Deployed contract:** `0x87215cA8cf4311Ae0a217A25503ffE586B070C73` (multi-market, holds all 9 demo markets keyed by `market_id`)
- **Chain:** Genlayer Studio Network (chain id `61999`, RPC `https://studio.genlayer.com/api`)
- **Wallet:** any EIP-1193 wallet (MetaMask, Rabby). The frontend programmatically adds the chain on first connect.
- **Faucet:** top up testnet GEN at https://studio.genlayer.com/faucet

> The deployed address is already wired into `frontend/.env.example` — `cp .env.example .env`, run, and connect a wallet. To deploy your own contract instead: paste [contracts/PredictionArena.py](./contracts/PredictionArena.py) into Studio → Compile → Deploy (no constructor args) → put the new address in `frontend/.env`.

## Current status

| Layer | Status | Path |
|---|---|---|
| Smart contract (multi-market) | deployed on Studio | [contracts/PredictionArena.py](./contracts/PredictionArena.py) |
| 3D frontend | full hub + 4 zones, MetaMask/Rabby, PARENA faucet, mobile responsive, loading screen | [frontend/](./frontend/) |
| Wallet + on-chain mirror | genlayer-js + window.ethereum, every bet mirrors per market_id | [frontend/src/lib/genlayer.ts](./frontend/src/lib/genlayer.ts) |

## Quick start

```bash
# 1. Deploy the contract on GenLayer Studio
#    → paste contracts/PredictionArena.py into https://studio.genlayer.com
#    → Compile → Deploy (no constructor args)
#    → copy the deployed address

# 2. Run the frontend
cd frontend
npm install
cp .env.example .env
# edit .env, set VITE_CONTRACT_ADDRESS=0xYOUR_ADDRESS
npm run dev
# → http://localhost:5173
```

In the browser:

1. Click **Connect Wallet** — wallet prompts to add **Genlayer Studio Network** (chain `61999`). Approve.
2. Teleport to the **Profile** zone → click **⚡ Initialize On-Chain** → sign once. All 9 markets are now created on the deployed contract via `seed_markets`.
3. Click **+ Faucet** in the wallet pill to top up 1000 PARENA (frontend-only test token).
4. Walk to any pillar, place a bet — wallet signs `place_bet(market_id, option_idx)` with the stake as `gl.message.value`.
5. The pool updates locally + on-chain. Click **Resolve** in any market to fire `resolve(market_id)` — validators fetch the resolution URL, the LLM picks a winner, and `eq_principle_strict_eq` enforces consensus.

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
├── contracts/
│   └── PredictionArena.py     # Intelligent Contract (Python, multi-market)
└── frontend/
    ├── src/lib/genlayer.ts    # genlayer-js client + read/write wrappers
    ├── src/store/markets.ts   # Zustand store, mirrors writes on-chain
    ├── src/scene/             # R3F: Hub + 4 zones (football/crypto/news/profile)
    ├── src/ui/                # ProfilePanel, MarketList, BetModal, HelpHint…
    └── .env.example           # copy → .env, contains live deployed address
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
