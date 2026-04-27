# Deploy PredictionArena to GenLayer Studio

Goal: deploy one **multi-market** PredictionArena contract on GenLayer
Studio, then have the frontend mirror every bet on every pillar.

## 1. Deploy

1. Open https://studio.genlayer.com and create a new contract.
2. Paste the full contents of [PredictionArena.py](./PredictionArena.py).
3. Confirm the first line is exactly:

```python
# { "Depends": "py-genlayer:test" }
```

4. Compile. The schema panel should show **no constructor inputs** —
   `__init__(self)` takes no args.
5. Click **Deploy**. Copy the deployed contract address.

## 2. Wire Frontend

```env
# frontend/.env
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

Restart `npm run dev`.

## 3. Seed Markets (one signature)

The contract starts empty. The frontend ships with 9 demo markets in
`frontend/src/mock.ts` — bulk-seed them on-chain with one wallet
signature:

1. Open the app, click **Connect Wallet** (approve Genlayer Studio
   Network — chain `61999`).
2. Teleport to the **Profile** zone.
3. Click **⚡ Initialize On-Chain**. Sign the wallet popup.
4. The frontend calls `seed_markets(specs_json)` with all 9 markets.
   Idempotent — clicking again is a no-op (existing markets are skipped).

Verify in Studio:

```text
list_markets()
```

Expected: `market_ids` = 9 entries (`bra-jam-20240605`, …, `starship-orbit`).

## 4. Smoke Test on the Live Demo Market

```text
get_market(market_id="bra-jam-20240605")
```

Expected: constructor values, `option_pools=[0,0,0]`, `total_pool=0`,
`has_resolved=false`, `winner=0`.

Place a bet (payable — attach value in Studio):

```text
place_bet(market_id="bra-jam-20240605", option_idx=0)  value = 100
```

`get_market(...)` should show `option_pools[0]=100`, `total_pool=100`.

Resolve via AI validators reading the live web:

```text
resolve(market_id="bra-jam-20240605")
```

Validators fetch the BBC fixtures page, the LLM picks a winner, and
`gl.eq_principle_strict_eq` requires byte-identical JSON across runs.
Wait 5–30s for consensus.

```json
{"winning_option": 0, "reasoning": "Brazil won the match 1-0."}
```

`get_market(...)` should now show `has_resolved=true`, `winner=0`.

## 5. (Bonus) AI-Extracted Markets

Test the differentiator that single-market couldn't do — let validators
**create** markets from a news article:

```text
propose_market_from_news(market_id="auto-1", news_url="https://www.bbc.com/news")
```

Validators fetch the article, the LLM picks one near-future event with
clear options, and `eq_principle_strict_eq` enforces byte-identical
output (sorted lowercase options + `?`-terminated question + canonical
JSON). The new market is appended to `list_markets()`.

## Notes

- On-chain claim/payout is intentionally omitted; the frontend computes
  claim UX from `get_market(...)` pools.
- All complex storage lives in primitive `str` fields with JSON-encoded
  values, because Studio's schema parser is brittle on nested types.
- Do not add admin/manual resolution. The pitch is "validators read the
  web and decide" — every fallback weakens it.
