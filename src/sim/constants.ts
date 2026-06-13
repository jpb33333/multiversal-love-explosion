// All tunable simulation numbers, grouped by concern (BW's PHYSICS / LIMITS
// idiom). Nothing here imports anything; don't scatter a magic number elsewhere
// — add it to the right table. Units are game-feel-tuned, not physical: love is
// a unitless 0..1 order parameter, positions are design-space px, time is
// seconds. (v0.3.0: tuned denser + more responsive + solo-winnable.)

export const SIM = {
  DT: 1 / 60, // one fixed logic tick; drained from an accumulator in Game
  WARMUP_SECONDS: 2.0, // grace before the win/lose classifier may fire
  MAX_LIVE_NODES: 600, // hard ceiling on live nodes (keeps the sim cheap + bounded)
  CONSTELLATION_MAX: 2000, // FIFO cap on render-only culled-node memorial points
  SEED: 0x10ce10e5, // deterministic Mulberry32 seed (reproducible runs + tests)
} as const;

export const CONTAGION = {
  GAIN: 1.0, // neighbor-field strength per second (must beat ENTROPY.BASE)
  RECENTER: 0.4, // /s pull of ISOLATED potentials back to 0.5 (kills numeric drift)
  COMMIT_HI: 0.8, // potential → loving at/above this …
  COMMIT_LO: 0.2, // potential → unloving at/below this …
  COMMIT_DWELL: 0.4, // … once the threshold has held this many seconds (anti-flicker)
  RELAPSE_LO: 0.35, // loving relapses to potential below this (hysteresis)
  RELAPSE_HI: 0.65, // unloving relapses to potential above this (hysteresis)
  NUDGE: 1.4, // love/s a held player caress injects — punchy so holding feels alive
  NUDGE_MAX_PER_TICK: 0.08, // hard cap on a single node's nudge gain per tick (anti-spam)
} as const;

export const ENTROPY = {
  BASE: 0.05, // baseline love drain /s — entropy is the house edge
  RAMP_PER_MIN: 0.042, // added to the drain per elapsed minute (escalation)
  MAX: 0.42, // drain ceiling so late game is brutal, not instant-death
  PRESSURE_PER_UNLOVING: 0.0008, // extra drain /s per live unloving node (losing boards harden)
  PRESSURE_MAX: 0.15, // cap on the pressure term
  RELIEF_DECAY: 5.0, // seconds for a lock-in's entropy relief to fade
} as const;

export const SPAWN = {
  SEED_COUNT: 18, // nodes placed at t=0 so the first cluster can grow
  SEED_RADIUS: 120, // world radius of the initial seed disc (tight = reads as a cluster)
  RATE_BASE: 3.0, // spawns/s at t=0
  RATE_RAMP_PER_MIN: 2.2, // +spawns/s per elapsed minute
  RATE_MAX: 15.0, // spawns/s ceiling ("too much" target)
  DIST: 70, // distance a new node sits from its anchor node (tighter = denser web)
  DIST_JITTER: 22, // ± jitter on that distance
  MIN_GAP: 46, // reject a spawn closer than this to any existing node
  PLACE_ATTEMPTS: 10, // tries to find an open spot before skipping the spawn
  K_NEIGHBORS: 4, // max proximity edges wired per spawn (bounded degree)
  EDGE_MAX_DIST: 120, // world-unit cap on edge length (> DIST → several visible edges)
  LOVE_JITTER: 0.03, // ± initial love spread for a fresh potential
  LOVE_SEEDED: 0.66, // initial love for a node spawned on a lock-in credit
} as const;

export const LOCK = {
  SCAN_INTERVAL: 0.25, // seconds between connected-component lock scans (cost control)
  MIN_SIZE: 5, // loving-cluster size to auto-lock (the "shape" you built)
  MIN_MEAN_LOVE: 0.82, // cluster must be genuinely loving, not borderline
  STABILITY_SECONDS: 0.6, // every member loving this long (settled, not a fluke)
  FADE_SECONDS: 2.0, // locked → culled fade duration (then banked to constellation)
  BASE_SCORE: 10, // points per node locked
  MEAN_BONUS: 8, // extra points × size × meanLove (rewards purity)
  RELIEF: 0.012, // entropy relief /s per node locked (the breather)
  SPAWN_CREDIT: 0.6, // love-seeded frontier spawns granted per node locked
  BANK_WINDOW: 14, // seconds a lock's love counts toward the win love-share
} as const;

export const CULL = {
  UNLOVING_MIN_AGE: 6, // seconds before an unloving node is eligible to be culled
  STRANDED_DWELL: 3, // seconds with no living neighbor before a "dark star" is banked
} as const;

export const BOND = {
  MAX_PATH: 3, // max edge-distance between the two bonded targets
  CHARGE_SECONDS: 0.6, // both caresses held this long to fire
  MAX_NODES: 16, // cap on the love-bridge neighborhood converted
  COOLDOWN_SECONDS: 6.0, // shared couple cooldown — decisive, not spammable
} as const;
