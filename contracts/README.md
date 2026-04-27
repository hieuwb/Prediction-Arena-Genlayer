# PredictionArena Contract

[PredictionArena.py](./PredictionArena.py) is a Studio-friendly, **multi-market**
GenLayer contract. One deployed contract holds N prediction markets keyed by
`market_id`. Each market resolves on-chain via AI validators reading the
live web — no oracle, no admin.

## API

| Method | Type | Purpose |
|---|---|---|
| `__init__()` | constructor | No args — Deploy without filling anything |
| `create_market(market_id, question, resolution_url, options_json)` | write | Adds one market |
| `seed_markets(specs_json)` | write | Bulk create — one signature for all 9 demo markets. Idempotent (skips existing ids). |
| `propose_market_from_news(market_id, news_url)` | write | AI extracts a market from a news article via `eq_principle_strict_eq` |
| `place_bet(market_id, option_idx)` | payable write | Adds `gl.message.value` to an option pool |
| `resolve(market_id)` | write | Validators fetch `resolution_url` and decide the winning option |
| `get_market(market_id)` | view | Returns one market's metadata + pools + resolution state |
| `list_markets()` | view | Returns `{market_ids: [...], markets: {id: data}}` for all markets |

`options_json` must be a JSON array of 2 to 8 strings, e.g. `["Brazil","Draw","Jamaica"]`.

`specs_json` for `seed_markets` is a JSON array of objects:

```json
[
  {"id": "bra-jam-20240605", "question": "Brazil vs Jamaica — Who wins?",
   "resolution_url": "https://www.bbc.com/sport/football/scores-fixtures/2024-06-05",
   "options": ["Brazil","Draw","Jamaica"]},
  ...
]
```

## Resolve Flow

`resolve(market_id)` snapshots state into locals, then runs a nondeterministic block under `gl.eq_principle_strict_eq`:

1. `gl.get_webpage(resolution_url, mode="text")` — every validator fetches the page
2. `gl.exec_prompt(...)` — every validator's LLM picks a winning index, returning strict JSON
3. `eq_principle_strict_eq` requires byte-identical JSON across validators (after `sort_keys`) — that's the consensus

If `winning_option` is a valid index, the market is stored as resolved with `winner` + `reasoning`.

## Design Constraints

- All complex storage is JSON-encoded inside primitive `str` fields. Studio's schema parser fails on nested types like `TreeMap[str, Market]`, so each market's full state lives in a single JSON string keyed by `market_id`.
- `propose_market_from_news` constrains LLM output (sorted lowercase options, `?`-terminated question) so validators converge under strict_eq.
- On-chain claim/payout is intentionally omitted for this hackathon demo; the frontend keeps per-user positions and claim UX locally.
