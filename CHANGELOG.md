# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

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
