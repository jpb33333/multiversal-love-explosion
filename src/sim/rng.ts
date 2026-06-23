// Mulberry32 — a small, fast, deterministic PRNG. The same seed yields the same
// sequence, so spawn placement, jitter, and the whole simulation are
// reproducible (and therefore unit-testable). Promoted to its own module from
// the inline copies BW kept in starfield/particles/comet.

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// In-place Fisher–Yates using a seeded rng — deterministic given the rng. Used
// to keep the turn-based entropy deck reproducible (intensify reshuffles, deck
// inserts), so a seed replays exactly.
export function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
