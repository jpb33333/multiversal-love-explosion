// Every tunable for the simulation, grouped by concern. The core: a field of
// dormant universes; you ignite love, which SPREADS to neighbours and DECAYS.
// Spread-born love is weak and fizzles unless you re-click it, so you fight to
// push R₀ above 1 and make it go viral before decay (rising over time) wins.
// Nothing here imports anything.

export const SIM = {
  DT: 1 / 60, // one fixed logic tick; drained from an accumulator in Game
  WARMUP_SECONDS: 2.5, // grace before win/lose can fire (the spark needs to catch)
  MAX_LIVE_NODES: 700, // hard ceiling on universes (keeps it cheap + bounded)
  CONSTELLATION_MAX: 1200, // FIFO cap on render-only memorial points
  SEED: 0x10ce10e5, // deterministic Mulberry32 seed
} as const;

// How love spreads from a lit universe to its dormant neighbours.
export const SPREAD = {
  RATE: 2.6, // neighbours/s a FULL-signal universe ignites (punchy when fresh)
  SEED_SIGNAL: 0.5, // signal a spread-born universe starts at — weak, will fizzle alone
  MIN_SIGNAL: 0.25, // below this a universe is too faint to spread
} as const;

// How fast love fades. Rises over time — the Tetris pressure.
export const DECAY = {
  BASE: 0.42, // signal lost /s at t=0 (a fresh spark lives ~2.4s untended)
  RAMP_PER_MIN: 0.16, // added per elapsed minute
  MAX: 1.1,
} as const;

// A click sets a universe's signal to full.
export const IGNITE = {
  SIGNAL: 1.0,
  SEED_SPARKS: 4, // lit universes you start a run with
} as const;

// The dormant field — pre-seeded, then grown at the frontier so love always has
// somewhere to spread.
export const SPAWN = {
  SEED_COUNT: 80, // dormant universes at t=0
  SEED_RADIUS: 320,
  RATE: 7, // new dormant universes/s near the live region
  RATE_RAMP_PER_MIN: 3,
  RATE_MAX: 20,
  DIST: 70, // distance a new universe sits from its anchor
  DIST_JITTER: 22,
  MIN_GAP: 46,
  PLACE_ATTEMPTS: 10,
  K_NEIGHBORS: 3, // edges per universe (a real web)
  EDGE_MAX_DIST: 120,
} as const;

// Win/lose.
export const TAKEOFF = {
  TARGET: 48, // this many universes lit AT ONCE = it's gone viral (win)
  DWELL: 0.7, // held this long to confirm it's real, not a blip
} as const;

export const OUTCOME = {
  warmupSeconds: 2.5,
  extinctionMinPeak: 8, // must have lit at least this many before a wipeout counts as a loss
} as const;
