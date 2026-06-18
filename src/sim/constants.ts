// Every tunable number for the simulation, grouped by concern. Pandemic-style
// core: universes sit on a network, cool toward entropy, and OVERFLOW (cascade
// to their neighbours) at either extreme — dark when they bottom out, joyful
// when you fill them with love. Nothing here imports anything.

export const SIM = {
  DT: 1 / 60, // one fixed logic tick; drained from an accumulator in Game
  WARMUP_SECONDS: 1.5, // grace before the win/lose check can fire
  MAX_LIVE_NODES: 520, // hard ceiling on live universes (keeps it cheap + bounded)
  CONSTELLATION_MAX: 1500, // FIFO cap on render-only memorial points
  SEED: 0x10ce10e5, // deterministic Mulberry32 seed
} as const;

// How love moves: gentle pull toward neighbours, plus the player's pour.
export const FIELD = {
  NEIGHBOR_PULL: 0.35, // /s — a universe eases toward the average of its neighbours
  POUR: 1.7, // love/s a player pours into the universe they hold
  POUR_MAX_PER_TICK: 0.06, // cap on pour gain per tick (anti-spam)
} as const;

// The ambient cooling — entropy is the house edge, and it grows over time.
export const ENTROPY = {
  BASE: 0.06, // /s baseline love drain on every universe
  RAMP_PER_MIN: 0.05, // added to the drain per elapsed minute (the rising pressure)
  MAX: 0.42, // drain ceiling
} as const;

export const SPAWN = {
  SEED_COUNT: 30, // universes in the starting cluster
  SEED_RADIUS: 240, // world radius of the seed disc
  RATE_BASE: 2.5, // new universes/s
  RATE_RAMP_PER_MIN: 0.8, // +/s per minute (the multiverse keeps growing)
  RATE_MAX: 6.0,
  DIST: 78, // distance a new universe sits from its anchor
  DIST_JITTER: 24,
  MIN_GAP: 52, // reject a spawn closer than this to any universe
  PLACE_ATTEMPTS: 10,
  K_NEIGHBORS: 3, // edges per new universe (a real web, like a Pandemic map)
  EDGE_MAX_DIST: 132, // world-unit cap on edge length
  LOVE_JITTER: 0.03, // ± initial love spread (universes start ~neutral)
} as const;

// The overflow / cascade — the heart of the game.
export const OVERFLOW = {
  ENTROPY_AT: 0.04, // love at/below this → the universe overflows into DARKNESS
  LOVE_AT: 0.96, // love at/above this → it overflows into JOY
  LOVE_SPLASH: 0.2, // a joy-burst lifts each neighbour modestly — you build love up
  DARK_SPLASH: 0.4, // a dark outbreak shoves hard — dangerous, chains easily
  FADE_SECONDS: 0.9, // an overflowed universe bursts, fades, then is culled
} as const;

// Win/lose: two race tracks, like Pandemic's cure markers vs the outbreak track.
export const OUTCOME = {
  warmupSeconds: 1.5,
  winLoveOverflows: 30, // this many bursts of joy → Love Explosion (win)
  loseEntropyOverflows: 12, // this many dark outbreaks → Entropy Collapse (lose)
} as const;
