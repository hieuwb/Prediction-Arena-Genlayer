---
name: project-context
description: Load Prediction Arena 3D project context — plan.md, GenLayer architecture, current MVP scope, and progress state. Use at the start of any non-trivial task to stay aligned with the hackathon plan, or whenever the user references "the plan", "the arena", "pillars", "markets", or "GenLayer contract".
---

# Project Context — Prediction Arena 3D

A 3D prediction-market dApp built on **GenLayer** for a 5-day hackathon. Validators are AI; resolution comes from `web_fetch` + `eq_principle` consensus — no Chainlink, no admin resolve.

## When to invoke this skill

- Start of a task that touches contract, scene, or UI logic
- User mentions: plan, arena, pillars, markets, validators, resolve, GenLayer, R3F
- After `/clear` or returning from a long break — reload context

## Steps

1. **Read [plan.md](../../../plan.md)** — single source of truth. Don't paraphrase from memory; re-read it. Sections to scan first: Pitch, Scope MVP (must-have vs nice-to-have), Kiến trúc, Timeline.
2. **Check progress** — list files under [contracts/](../../../contracts/), [frontend/](../../../frontend/), [scripts/](../../../scripts/) (whichever exist). Compare against the MVP must-have list to identify what's done vs pending.
3. **Read recent git log** if `.git` exists: `git log --oneline -20` to see what was just shipped.
4. **State the loaded context in 3 lines** before starting work: what stage we're at, what the user's task touches, what blockers exist.

## Hard rules for this project

- **MVP scope is sacred.** Don't propose features outside the must-have column unless the user explicitly invokes "nice-to-have". Hackathon ships in 5 days.
- **GenLayer-first.** Never propose a Chainlink oracle, admin resolve, or off-chain resolver script. The whole differentiator is AI validators reading the web.
- **3 demo markets:** football, crypto price, generic event. Don't propose "multi-market UI" beyond that for the MVP.
- **Stack lock-in:** Vite + React + R3F + Tailwind on the frontend. GenLayer Python Intelligent Contracts on-chain. Don't suggest Next.js, Vue, plain Three.js (without R3F), or Solidity.

## What NOT to load

- Don't read `node_modules/`, build artifacts, or generated files for "context".
- Don't grep the full codebase to "understand" — read the plan, then the specific files the task touches.

## Hand-off

After loading, write a 3-line preamble before any tool use:
- **Stage:** which timeline day / what's done
- **Task scope:** which subsystem (contract / scene / UI / wallet / resolve)
- **Risk:** the specific MVP constraint that could be violated
