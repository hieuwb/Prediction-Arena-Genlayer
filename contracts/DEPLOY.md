# Deploy PredictionArena to GenLayer Studio

Goal: deploy one live on-chain market at https://studio.genlayer.com/contracts.
The frontend mirrors only the market whose id equals `VITE_LIVE_MARKET_ID`;
the other demo markets stay in local mock state.

## 1. Deploy

1. Open https://studio.genlayer.com/contracts and create a new contract.
2. Paste the full contents of [PredictionArena.py](./PredictionArena.py).
3. Confirm the first line is exactly:

```python
# { "Depends": "py-genlayer:test" }
```

4. Compile. The constructor should show:
   - `question: str`
   - `resolution_url: str`
   - `options_json: str`
5. Deploy with the Brazil-Jamaica demo values:
   - `question`: `Brazil vs Jamaica - Who wins?`
   - `resolution_url`: `https://www.bbc.com/sport/football/scores-fixtures/2024-06-05`
   - `options_json`: `["Brazil","Draw","Jamaica"]`

## 2. Smoke Test

Call:

```text
get_data()
```

Expected: constructor values, `option_pools=[0,0,0]`, `total_pool=0`,
`has_resolved=false`, `winner=-1`.

Then call:

```text
place_bet(option_idx=0) with value = 100
```

This method is payable, so the value must be attached in Studio.

Call `get_data()` again. Expected: option 0 pool grows and `total_pool=100`.

Finally call:

```text
resolve()
```

Validators fetch the resolution URL and return strict JSON:

```json
{"winning_option": 0, "reasoning": "Brazil won the match."}
```

If the result is conclusive, `get_data()` should show `has_resolved=true`.

## 3. Wire Frontend

```env
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
VITE_LIVE_MARKET_ID=bra-jam-20240605
```

Restart `npm run dev`.

## Notes

- This deployable contract intentionally does not implement on-chain claims.
  The frontend demo computes claim UX locally.
- Storage is kept to primitive fields plus JSON strings because GenLayer Studio
  has historically been brittle with nested storage declarations.
- Do not add admin/manual resolution; the differentiator is validator web-read
  resolution through `resolve()`.
