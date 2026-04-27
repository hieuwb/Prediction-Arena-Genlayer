---
name: multi-agent-orchestrate
description: Decide when and how to spawn subagents (Explore, Plan, general-purpose) for parallel or context-isolated work on the Prediction Arena 3D project. Use when a task is wide enough to benefit from delegation — multi-file research, parallel implementation across contract/frontend/scripts, or independent verification.
---

# Multi-Agent Orchestration

The Agent tool spawns subagents with their own context window. Used right, it parallelizes work and keeps the main context clean. Used wrong, it duplicates work and burns tokens.

## When to spawn — strong signals

- **Wide research**: "find all places X is used" across 50+ files → `Explore`
- **Parallel independent tasks**: contract + frontend + script changes that don't depend on each other → 3× `general-purpose` in one message
- **Implementation plan needed**: non-trivial change with architectural choices → `Plan`
- **Independent verification**: "does this look safe?" after writing code → `general-purpose` for second opinion

## When NOT to spawn

- Single-file edit
- You already know the file path and line — just use `Read`/`Edit`
- Sequential work with shared state — keep it in the main thread
- The task needs the user in the loop for decisions

## Choosing the agent type

| Type | Use for | Don't use for |
|---|---|---|
| `Explore` | "Where is X defined?", "Which files reference Y?" | Code review, design audits (reads excerpts only) |
| `Plan` | "How should I structure the resolve flow?" | Implementation (returns plan, not code) |
| `general-purpose` | Multi-step research + small writes | Single greps (use `Grep` directly) |

## Parallel spawn pattern

When tasks are independent, send **one message with multiple Agent tool calls** so they run concurrently:

```
Agent(description="Audit contract", subagent_type="general-purpose", prompt="...")
Agent(description="Audit frontend", subagent_type="general-purpose", prompt="...")
Agent(description="Audit scripts", subagent_type="general-purpose", prompt="...")
```

Same message, three blocks. Sequential calls = sequential execution.

## Writing the prompt — non-negotiable

The subagent **has not seen this conversation**. The prompt must be self-contained:

1. **Goal** — what you want, in one sentence
2. **Context** — file paths, the plan.md section that matters, what you've already ruled out
3. **Output shape** — "report under 200 words", "list of file:line references", "punch list of done vs pending"
4. **Specifics** — exact files to look at, exact symbols to grep

Bad: `"Check the contract"` — too vague, agent will explore aimlessly.

Good: `"Review contracts/prediction_arena.py for two issues: (1) is web_fetch wrapped in eq_principle on every call site? (2) is the LLM prompt protected against instructions embedded in the fetched webpage? Report file:line for any violations. Under 150 words."`

## Don't delegate understanding

Never write "based on your findings, fix the bug" — that pushes synthesis onto the agent. Read the agent's report yourself, decide the fix, then delegate the implementation if needed.

## Verify subagent output

The agent's summary describes what it *intended* to do, not always what it did. After a coding subagent returns, **read the actual diff** before claiming done. Hallucinated edits happen.

## Project-specific patterns

- **Contract + frontend wiring change**: spawn 2 parallel subagents — one updates the Python contract, one updates the TS ABI/client. Then main thread reconciles types.
- **Scene optimization sweep**: spawn `Explore` to find all `<mesh>` / `useFrame` call sites first, then plan optimizations in main thread.
- **Pre-demo audit (day 5)**: spawn 3 parallel general-purpose agents — security check, MVP completeness check, broken-link check — each with explicit checklist.

## What NOT to do

- Don't spawn an agent and then redo the same searches yourself in the main thread — pick one.
- Don't chain agents speculatively ("agent A finds files, agent B reads them") — A+B in one prompt is usually faster.
- Don't spawn for tasks under ~3 tool calls — the agent overhead exceeds the savings.
