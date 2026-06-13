import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { SIM } from '../src/sim/constants.ts';

describe('Multiverse', () => {
  it('seeds a starting cluster with a defined centroid', () => {
    const mv = Multiverse.create(123);
    expect(mv.graph.size).toBeGreaterThan(0);
    expect(mv.centroid()).not.toBeNull();
  });

  it('keeps the live node count bounded over a long unattended run (infinite-play guarantee)', () => {
    const mv = Multiverse.create(SIM.SEED);
    const ticks = 6 * 60 * 60; // 6 simulated minutes — past the peak spawn rate
    let peak = 0;
    for (let i = 0; i < ticks; i++) {
      mv.tick(SIM.DT);
      if (mv.graph.size > peak) peak = mv.graph.size;
    }
    expect(peak).toBeLessThanOrEqual(SIM.MAX_LIVE_NODES);
    expect(peak).toBeGreaterThan(40); // it really grew — spawning + culling both work
  });

  it('reports a love share in [0,1] and hit-tests nearest nodes', () => {
    const mv = Multiverse.create(7);
    const t = mv.tally();
    expect(t.loveShare).toBeGreaterThanOrEqual(0);
    expect(t.loveShare).toBeLessThanOrEqual(1);
    const c = mv.centroid()!;
    expect(mv.nearestNode(c, 1e6)).not.toBeNull();
    expect(mv.nearestNode({ x: 1e9, y: 1e9 }, 10)).toBeNull(); // nothing within 10px
  });
});
