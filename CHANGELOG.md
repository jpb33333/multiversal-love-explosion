# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

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
