import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { SIM } from '../src/sim/constants.ts';

describe('Multiverse', () => {
  it('seeds a field and starts a few sparks lit', () => {
    const mv = Multiverse.create(123);
    expect(mv.graph.size).toBeGreaterThan(0);
    expect(mv.litCount).toBeGreaterThan(0);
    expect(mv.centroid()).not.toBeNull();
  });

  it('clicking a dormant universe lights it', () => {
    const mv = Multiverse.create(7);
    let dormant = -1;
    for (const n of mv.graph.values()) {
      if (n.state === 'dormant') {
        dormant = n.id;
        break;
      }
    }
    expect(dormant).toBeGreaterThan(0);
    mv.ignite(dormant);
    mv.tick(1 / 60);
    expect(mv.graph.get(dormant)!.state).toBe('lit');
  });

  it('keeps the node count bounded over a long run', () => {
    const mv = Multiverse.create(SIM.SEED);
    let peak = 0;
    for (let i = 0; i < 5 * 60 * 60; i++) {
      mv.tick(SIM.DT);
      if (mv.graph.size > peak) peak = mv.graph.size;
    }
    expect(peak).toBeLessThanOrEqual(SIM.MAX_LIVE_NODES);
    expect(peak).toBeGreaterThan(50);
  });

  it('hit-tests the nearest universe and ignores far points', () => {
    const mv = Multiverse.create(7);
    const c = mv.centroid()!;
    expect(mv.nearestNode(c, 1e6)).not.toBeNull();
    expect(mv.nearestNode({ x: 1e9, y: 1e9 }, 10)).toBeNull();
  });
});
