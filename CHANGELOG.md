# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.8.0] — 2026-06-18

### Changed

- **Core rebuilt from scratch — a viral chain reaction.** You spread love like a
  virus: CLICK a dormant universe to ignite it; love spreads to its neighbours
  and DECAYS. Spread-born love is weak (R₀ < 1) and fizzles unless you keep
  clicking the fading ones — so you fight to push R above 1. Get enough lit AT
  ONCE and it goes VIRAL = win; fall behind and it burns out = lose. Decay rises
  over time (Tetris-style escalation), so eventually you need a second pair of
  hands (P2 on the keyboard). One verb: click.
- Replaces the overflow model. New simulation (`spread.ts` + `Multiverse`), a
  `GOING VIRAL` progress bar, dormant/lit node rendering, click-spark sounds.
  README / CLAUDE / `docs/DESIGN.md` rewritten to match.

## [0.7.0] — 2026-06-18

### Changed

- **Core redesign — overflow cascades, à la Pandemic.** The accreted mechanics
  (player-built connections, lock-in clusters, the co-op bond, the
  potential/loving/unloving state machine) are gone. The new core is one idea:
  universes on a fixed network cool toward entropy and OVERFLOW at the extremes
  — bursting darkness onto their neighbors (an outbreak that can chain), or,
  when you fill them with love, bursting JOY that splashes love outward. One
  verb: hold to pour love. Win on enough love-bursts; lose on too many
  entropy-outbreaks (two race tracks at the top, like Pandemic's cure markers
  vs the outbreak track).
- Much smaller and clearer: the simulation is a fraction of its former size, the
  HUD is two legible tracks, nodes read by color + a pulse warning of an
  imminent overflow, and the bundle dropped to ~33 KB.
- Added `docs/DESIGN.md`; README and CLAUDE.md rewritten to the new core.

## [0.6.0] — 2026-06-13

### Changed

- **Connecting is now a fluid LOVE SWEEP**, not precise pair-wiring. Hold the
  mouse and drag across universes — each one you pass fills with love and links
  into a glowing strand, no aiming. Player 2: hold SPACE and move with arrows to
  love + link as you go. Far easier and smoother to build the web on the fly
  (the old drag-a-pair / Enter-grab connecting was too fiddly mid-game).
- Forgiving catch radius; coach, how-to, and in-game help updated to the sweep.

## [0.5.0] — 2026-06-13

### Added

- **Player 2 can connect too (keyboard):** press ENTER on a universe to grab it,
  move to another, press ENTER again to link them — the keyboard mirror of the
  mouse drag. Now both players build the same web side by side, which is how the
  duo was always meant to work. SPACE still pours love; ENTER now connects.

### Changed

- How-to card and in-game help rewritten to spell out both players' controls.

## [0.4.0] — 2026-06-13

### Changed

- New core verb — **CONNECT**: hold a universe to fill it with love, then DRAG
  from it to a nearby universe to wire them together. Love rushes down the link
  you draw and flows on through your web. (Replaces the implicit "love just
  spreads on its own" model that players found unclear — you now build the
  network yourself, which is what the game always wanted to be.)
- Sparser auto-edges so your connections matter; a "drawing a link" line while
  dragging, plus a spark + sound when a link forms.
- Onboarding rewritten to teach it: hold to love → drag to connect → grow the
  web. How-to and in-game help updated to match.

## [0.3.0] — 2026-06-13

### Changed

- Onboarding: first-time players get coach hints that teach the loop (a
  highlighted universe → "hold to love it" → "grow it" → fade), shown until the
  first win.
- Control clarity: the Player 2 keyboard cursor stays hidden until a second
  player actually presses a key (no more confusing idle ring); a love-beam links
  the mouse to the universe being filled; the P2 ring is labeled.
- Calmer camera: the view eases toward the cluster instead of lurching.
- Winnable solo: tighter, denser, clearer network; punchier nurture; gentler
  early entropy; easier lock-ins and a lower win bar.
- Clearer messaging: title says "1 or 2 players"; how-to and in-game hints
  rewritten for mouse + keyboard, solo-friendly.

## [0.2.0] — 2026-06-13

### Added

- Sound: a zero-dependency Web Audio engine — a soft pad that warms as love
  grows, plus nurture ticks, lock-in chimes, the co-op bond chord, a rising win
  swell, and an entropy-collapse sigh. Mute with **M**.
- Juice: love-spark bursts when you pour love, a staggered Love-Explosion
  cascade on a win, flowing light along loving edges, and a readiness halo on
  universes about to lock in.

## [0.1.0] — 2026-06-13

### Added

- Initial vertical slice: a playable two-player co-op multiverse.
- Simulation core — a graph of universe nodes with a love↔entropy contagion,
  frontier spawning, lock-in, and culling (the mechanism that lets play run
  effectively forever while only a few hundred nodes are ever live).
- Win/lose: a "Love Explosion" when love decisively outshines entropy; an
  "Entropy Collapse" when it doesn't.
- Local same-screen co-op: P1 (pointer) + P2 (keyboard), with a co-op "love
  bond" that requires both players acting together.
- Vanilla TypeScript + Vite + Vitest, Canvas 2D, zero runtime dependencies —
  the Infinite Binary Wobble house stack.
