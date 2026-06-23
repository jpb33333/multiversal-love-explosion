// Every tunable for the turn-based game, grouped by concern. The loop: the
// havens (warm core) grant a love budget each round; you extend a living supply
// line outward across the ever-expanding oval toward the Far Shore. Then entropy
// draws couples from a deck and snuffs them — a couple already cold OUTBREAKS,
// spilling cold to its neighbours and ticking the collapse track toward heat
// death. Reach the Shore to win; let the track fill and you lose. Nothing here
// imports anything.

export const LOVE = {
  CAP: 3, // most love a universe can stockpile — a buffer against the draw
} as const;

// Geometry of the oval (the CMB heat map). Positions bake ASPECT into x, so the
// world is a wide ellipse; plain distance is used for wiring.
export const MAP = {
  ASPECT: 1.4, // oval is this much wider than tall
  CORE_RADIUS: 46, // radius of the haven core (ring 0)
  RING_GAP: 92, // radial distance between rings
  BASE_PER_RING: 7, // universes on the innermost loop
  PER_RING_GROWTH: 2, // +this many per ring outward (circumference grows)
  ANGLE_JITTER: 0.22, // radians of placement randomness (organic, not a grid)
  RADIUS_JITTER: 22,
  INITIAL_RINGS: 2, // loops present at the start (beyond the haven core)
  K_NEIGHBORS: 4,
  EDGE_MAX_DIST: 165, // universes within this are wired (rings overlap to connect)
} as const;

export const HAVEN = {
  COUNT: 3, // warm-core universes that never die
  OUTPUT_PER_ROUND: 6, // love cubes you may place each round
} as const;

export const GOAL = {
  RING: 6, // the Far Shore sits this far out, on the major axis
} as const;

export const ENTROPY = {
  BASE_DRAWS: 2, // couples the onslaught hits on round 1
  RAMP_EVERY: 2, // +1 draw every this many rounds — the screws tighten
  MAX_DRAWS: 7,
  EXPAND_RINGS_PER_ROUND: 1, // new frontier loops added each onslaught
} as const;

export const COLLAPSE = {
  MAX: 10, // outbreaks before heat death wins (lose)
} as const;

export const TURN_SIM = {
  SEED: 0x10cef00d, // deterministic Mulberry32 seed
} as const;
