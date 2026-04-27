# Smoke test the deployed contract

The current contract design is **one market per deployment** (mirrors
the canonical [football_prediction_market.py](https://github.com/genlayerlabs/genlayer-studio/blob/main/examples/contracts/football_prediction_market.py)).
Multi-market in the frontend works by mocking 8 markets locally and
mirroring only the one whose id matches `VITE_LIVE_MARKET_ID` to the
deployed contract.

## 1 · Deploy with constructor inputs

In Studio, after pasting [PredictionArena.py](./PredictionArena.py) and
clicking **Compile**, the schema panel should show three constructor
fields. Fill them with the Brazil-Jamaica market data so the on-chain
market matches `bra-jam-20240605` in the frontend mock:

| Field | Value |
|---|---|
| `question` | `Brazil vs Jamaica — Who wins?` |
| `resolution_url` | `https://www.bbc.com/sport/football/scores-fixtures/2024-06-05` |
| `options_json` | `["Brazil","Draw","Jamaica"]` |

Click **Deploy** → copy the contract address.

## 2 · Smoke test the on-chain flow

Use Studio's "Call method" panel.

```
get_data()
```

Should return the constructor values + empty pools.

```
place_bet(option_idx=0)         value = 100
```

Pays 100 native to bet on option 0 ("Brazil"). Repeat from a 2nd
account with `option_idx=2` (Jamaica) so the resolve has a winning
pool to settle to.

```
get_data()
```

`option_pools` now `[100, 0, 100]`, `total_pool=200`.

```
resolve()
```

The validators each fetch the BBC page, an LLM picks the winner, and
`eq_principle.strict_eq` requires byte-identical JSON across runs.
Wait 5–30s. The result returned should look like:

```json
{ "winning_option": 0, "reasoning": "Brazil won 1-0…" }
```

Verify with:

```
get_data()
```

`has_resolved=true`, `winner=0`, `reasoning` populated.

```
get_my_bets(bettor="0xYOUR_WINNING_ACCOUNT")
```

Returns `{ "0": 100 }` — the per-option breakdown for that user.

If all 5 calls succeed the contract is healthy.

## 3 · Wire the frontend

```env
# frontend/.env
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
VITE_LIVE_MARKET_ID=bra-jam-20240605
```

Restart `npm run dev`. Bets on the Brazil-Jamaica pillar mirror to the
contract; bets on the other 8 pillars remain mock.

## Adding more on-chain markets

Each additional market = one more contract deployment with different
constructor args. To wire a 2nd market on-chain, you'd extend
`frontend/src/lib/genlayer.ts` to support multiple addresses and route
bets per `marketId`. Out of scope for the hackathon MVP — pick one
market for the live demo, the other 8 sell the UX story locally.
