# PredictionArena Contract

[PredictionArena.py](./PredictionArena.py) is a Studio-friendly, single-market
GenLayer contract.

## API

| Method | Type | Purpose |
|---|---|---|
| `__init__(question, resolution_url, options_json)` | constructor | Creates one prediction market |
| `place_bet(option_idx)` | payable write | Adds attached value to an option pool |
| `resolve()` | write | Validators fetch the URL and decide the winning option |
| `get_data()` | view | Returns market metadata, pools, total, and resolution state |
| `get_my_bets(bettor)` | view | Compatibility stub; per-user bets are frontend-local |

`options_json` must be a JSON array of 2 to 8 strings, for example:

```json
["Brazil","Draw","Jamaica"]
```

## Resolve Flow

`resolve()` captures deterministic state, then runs a nondeterministic block:

1. Fetches the resolution page as text, using either the newer `gl.nondet.web`
   API or the older `gl.get_webpage` API.
2. Prompts the validator LLM for strict JSON.
3. Runs strict equivalence, using either `gl.eq_principle.strict_eq` or the
   older `gl.eq_principle_strict_eq`, depending on the SDK version Studio loads.

If `winning_option` is a valid index, the contract stores `has_resolved=true`,
`winner`, and `reasoning`.

## Design Constraints

- One contract deployment represents one market.
- Option pools are stored as JSON in `option_pools_json` to avoid Studio schema
  issues with nested storage types.
- On-chain claim/payout is intentionally omitted for this hackathon demo; the
  frontend keeps per-user positions and claim UX locally.
