# Design — Multiversal Love Explosion

## The one idea

Universes sit on a network. Each cools toward **entropy** over time. At either
extreme a universe **overflows** and cascades to its neighbors:

- **Dark overflow** (love hits 0): bursts entropy onto every neighbor (a hard
  shove), then fades. This can push neighbors over the edge too — an **outbreak**
  that chains across the web (this is the Pandemic move).
- **Joy overflow** (love hits 1): bursts love onto every neighbor (a gentle
  lift), then fades. You build these up deliberately.

Players have exactly one verb: **pour love** into a universe (hold the mouse, or
Space on the keyboard cursor). That's the whole game — triage the universes
about to go dark, and push the ones you can all the way into joy.

## Win / lose

Two race tracks, like Pandemic's cure markers and outbreak track:

- **Love-bursts** climb toward `OUTCOME.winLoveOverflows` → **Love Explosion** (win).
- **Entropy-outbreaks** climb toward `OUTCOME.loseEntropyOverflows` → **Entropy
  Collapse** (lose).

Pressure rises: `ENTROPY` drain grows with elapsed time, and the multiverse keeps
spawning new universes.

## Why it's elegant (the Wobble test)

Like Infinite Binary Wobble, it's *one* deterministic simulation with a minimal
input and a rich emergent result — here, the cascade. You act (pour love) and
watch the overflow ripple. No connecting, no micromanagement, no stacked
sub-systems.

## Code map

- `src/sim/` — pure logic, no rendering imports.
  - `graph.ts` — `MvNode` (`love` 0..1 + a `dying` burst flag) + `GraphStore`.
  - `dynamics.ts` — the per-tick love update (double-buffered, deterministic).
  - `spawn.ts` — the growing network (the game builds the edges, not the player).
  - `Multiverse.ts` — owns the clock + the overflow rules (`resolveOverflows`,
    `updateDying`) + the overflow counters + queries.
  - `constants.ts` — every tunable, in named tables: `SIM`, `FIELD`, `ENTROPY`,
    `SPAWN`, `OVERFLOW`, `OUTCOME`.
- `src/game/` — `Game.ts` (loop + state machine + input), `outcomes.ts`
  (the two-track classifier), `states.ts`, `stats.ts`.
- `src/render/` — `Renderer.ts` (three transform regimes + camera), `node.ts`,
  `edge.ts`, `cursors.ts`, `overlay.ts` (the tracks + cards), `audio.ts`.
- `src/input/` — `PointerCursor.ts` (P1), `KeyCursor.ts` (P2).

## Tuning

All feel lives in `src/sim/constants.ts`. The most load-bearing knobs:

- `OVERFLOW.LOVE_SPLASH` / `DARK_SPLASH` — how far each kind of burst spreads
  (dark splashes harder, so outbreaks are the threat).
- `OUTCOME.winLoveOverflows` / `loseEntropyOverflows` — how long a game runs.
- `ENTROPY.BASE` / `RAMP_PER_MIN` — the pressure and how fast it rises.
- `FIELD.POUR` — how fast a held universe fills with love.
