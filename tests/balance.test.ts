import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { LoveOutcomeClassifier } from '../src/game/outcomes.ts';
import { SIM, TAKEOFF } from '../src/sim/constants.ts';

// A "smart-ish" player: when small, expand by lighting a dormant neighbour of a
// lit universe; when large, sustain by refreshing the most-faded lit one.
function autoClick(mv: Multiverse): void {
  const lit = [...mv.graph.values()].filter(n => n.state === 'lit');
  if (lit.length === 0) {
    const c = mv.centroid();
    if (c) {
      const id = mv.nearestNode(c, 1e9);
      if (id !== null) mv.ignite(id);
    }
    return;
  }
  if (lit.length < TAKEOFF.TARGET) {
    for (const n of lit) {
      for (const nid of n.neighbors) {
        const nb = mv.graph.get(nid);
        if (nb && nb.state === 'dormant') {
          mv.ignite(nid);
          return;
        }
      }
    }
  }
  let lowest = lit[0];
  for (const n of lit) if (n.signal < lowest.signal) lowest = n;
  mv.ignite(lowest.id);
}

function play(seed: number, clicksPerSec: number, maxSec: number) {
  const mv = Multiverse.create(seed);
  const cls = new LoveOutcomeClassifier();
  const dt = SIM.DT;
  let acc = 0;
  let outcome = 'playing';
  let t = 0;
  for (let i = 0; i < maxSec / dt && outcome === 'playing'; i++) {
    acc += clicksPerSec * dt;
    while (acc >= 1) {
      acc -= 1;
      autoClick(mv);
    }
    mv.tick(dt);
    outcome = cls.update(mv, dt).kind;
    t += dt;
  }
  return { outcome, peakLit: mv.peakLit, lit: mv.litCount, t };
}

describe('balance probe', () => {
  it('difficulty curve across click rates', () => {
    console.log(`\n  target=${TAKEOFF.TARGET} lit to go viral`);
    for (const cps of [0, 2, 3, 4, 6, 8, 12]) {
      const r = play(1, cps, 180);
      console.log(
        `  ${String(cps).padStart(2)} clicks/s → ${r.outcome.padEnd(16)} peakLit=${String(r.peakLit).padStart(3)} endLit=${String(r.lit).padStart(3)}  @ ${r.t.toFixed(1)}s`,
      );
    }
  });

  // Lock the difficulty curve so future tuning can't silently break it:
  // doing nothing must burn out, and a frantic two-handed rate must go viral.
  it('idle always burns out', () => {
    expect(play(1, 0, 20).outcome).toBe('entropy_collapse');
  });

  it('a slow solo rate cannot keep up and burns out', () => {
    expect(play(1, 4, 180).outcome).toBe('entropy_collapse');
  });

  it('a frantic two-handed rate goes viral', () => {
    expect(play(1, 12, 60).outcome).toBe('love_explosion');
  });
});
