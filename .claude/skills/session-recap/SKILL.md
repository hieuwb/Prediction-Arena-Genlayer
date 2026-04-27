---
name: session-recap
description: Reconstruct what happened in prior sessions on the Prediction Arena 3D project — recent commits, edited files, open todos in plan.md, and unfinished work. Use when the user says "what did we do last time", "where did we leave off", "tiếp tục", "tóm tắt tiến độ", or returns after a break.
---

# Session Recap

Auto-memory captures *insights*; this skill captures *state* — what code actually shipped vs what's pending.

## When to invoke

- User asks "where did we leave off" / "tiếp tục từ đâu" / "đã làm gì rồi"
- Returning to project after >1 day idle
- Before a planning conversation about next steps

## Steps

1. **Git activity (last 7 days)** — if `.git` exists:
   - `git log --since="7 days ago" --oneline --stat`
   - `git status` — uncommitted work signals where the user stopped mid-task
   - `git diff HEAD~5..HEAD --stat` if no recent activity in 7 days
2. **File mtimes** — `ls -lt` the active dirs (`contracts/`, `frontend/src/`, `scripts/`) — recently-touched files = likely focus area.
3. **plan.md TODO scan** — grep for unchecked `[ ]`, `TODO`, `FIXME`, `WIP`, `🔴` in plan.md and source files. These are explicit pending markers.
4. **Auto-memory check** — read [memory/MEMORY.md](../../../../../Users/ADMIN/.claude/projects/d--Crypto-Dapp-genlayer/memory/MEMORY.md) if it exists. Pull project-type and feedback-type entries.
5. **Synthesize a recap** in this exact shape:

   ```
   ## Last session
   - Shipped: <commits / files completed>
   - In progress: <uncommitted changes, what they're trying to do>
   - Blocked on: <if any>

   ## Pending (from plan.md MVP)
   - [ ] <must-have item not yet done>
   - [ ] ...

   ## Suggested next step
   <one concrete task from the MVP list, with the file to start in>
   ```

## Rules

- **Verify before reporting.** A memory saying "X is done" is a claim from a past session. Confirm by reading the file or grep'ing the symbol before saying it's done.
- **Don't summarize beyond 3 weeks of git history** — older work isn't relevant to "where we left off".
- **One suggested next step, not five.** Hackathon focus.

## What NOT to do

- Don't recap the entire plan — the user already has plan.md open.
- Don't re-explain the architecture — they wrote it.
- Don't pad with "great progress!" — just state facts.
