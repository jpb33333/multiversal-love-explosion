# Design — Multiversal Love Explosion

## The one idea

You spread love through a network of universes like a virus, and try to make it
go **viral** (self-sustaining) before it burns out. One verb: **click** a
universe to ignite (or refresh) its love.

- A lit universe carries a **signal** (0..1) that **decays** every tick.
- While bright enough it **spreads** to a dormant neighbour — the chain reaction.
- A spread-born universe starts **weak** but bright enough to ripple on a few
  hops — a visible chain reaction — yet a chain on its own has **R₀ < 1** and
  the wavefront always dies. Your clicks set a universe back to full signal,
  extending its spreading life — pushing the effective R above 1.
- **Decay rises over time**, so the network needs ever more clicking to grow.

## Win / lose

- **WIN — it goes viral:** `TAKEOFF.TARGET` universes lit at once, held for
  `TAKEOFF.DWELL` — a brief spike doesn't count; you must *sustain* the
  wavefront to prove it took off and isn't exhausted → Love Explosion.
- **LOSE — it burns out:** the chain had caught (`peakLit ≥ OUTCOME.extinctionMinPeak`)
  and then collapsed to near-nothing (≤ 2 lit).

It plays like Tetris: you're always one step behind the rising decay, and the
only way out is takeoff. Most runs you lose — which is the point. A second player
(keyboard) is more clicking hands, and late game you need them.

## Why it's one elegant idea (the Wobble test)

A single deterministic simulation (decay + spread), a minimal input (click), and
a rich emergent result (the cascade racing the fade). No connecting, no
micromanaging meters — just keep the chain alive and push it viral.

## Code map

- `src/sim/` — pure logic, no rendering imports.
  - `graph.ts` — `MvNode` (`state: dormant|lit`, `signal`, `spreadAcc`, `flash`) + `GraphStore`.
  - `spread.ts` — one tick: decay every lit universe (dead → dormant), then each
    bright one ignites a dormant neighbour as its accumulator ticks over.
    Deterministic (no RNG) so a seed replays exactly.
  - `spawn.ts` — the dormant field, grown at the frontier near the live love.
  - `Multiverse.ts` — owns the clock + `ignite` + `litCount`/`peakLit` + the
    `spreadEvents` feed + queries.
  - `constants.ts` — every tunable: `SIM`, `SPREAD`, `DECAY`, `IGNITE`, `SPAWN`,
    `TAKEOFF`, `OUTCOME`.
- `src/game/` — `Game.ts` (loop + state machine + click input), `outcomes.ts`
  (takeoff / burnout classifier), `states.ts`, `stats.ts`.
- `src/render/` — `Renderer.ts`, `node.ts`, `edge.ts`, `cursors.ts`,
  `overlay.ts` (the GOING VIRAL bar + cards), `audio.ts`.
- `src/input/` — `PointerCursor.ts` (P1), `KeyCursor.ts` (P2).

## Tuning

All feel lives in `src/sim/constants.ts`:

- `SPREAD.RATE` / `SEED_SIGNAL` / `MIN_SIGNAL` — how fast and how far love
  spreads, and how weak spread-born love is (the R₀ < 1 that makes clicking
  necessary).
- `DECAY.BASE` / `RAMP_PER_MIN` — the fade, and how fast the pressure rises.
- `TAKEOFF.TARGET` / `DWELL` — how big "viral" is.
- `IGNITE.SEED_SPARKS` — the starting chain.
