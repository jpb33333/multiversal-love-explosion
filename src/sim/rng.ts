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
