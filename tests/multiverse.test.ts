import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { SIM, OVERFLOW } from '../src/sim/constants.ts';

describe('Multiverse', () => {
  it('seeds a starting web with a defined centroid', () => {
    const mv = Multiverse.create(123);
    expect(mv.graph.size).toBeGreaterThan(0);
    expect(mv.centroid()).not.toBeNull();
  });

  it('a universe at zero love bursts into darkness, shoves neighbours, then is culled', () => {
    const mv = new Multiverse(1);
    const center = mv.allocId(); // allocate via the Multiverse so spawn won't reuse ids
    mv.graph.add(makeNode(center, 0, 0, 0.0)); // about to overflow
    const nb: number[] = [];
    for (let i = 0; i < 3; i++) {
      const id = mv.allocId();
      mv.graph.add(makeNode(id, (i + 1) * 20, 0, 0.5));
      mv.graph.addEdge(center, id);
      nb.push(id);
    }
    mv.tick(1 / 60);
    expect(mv.entropyOverflows).toBe(1);
    expect(mv.graph.get(center)!.dying).toBe(true);
    expect(mv.graph.get(nb[0])!.love).toBeLessThan(0.5); // splashed toward entropy
    for (let t = 0; t < Math.ceil(OVERFLOW.FADE_SECONDS * 60) + 4; t++) mv.tick(1 / 60);
    expect(mv.graph.has(center)).toBe(false); // faded and culled
  });

  it('a universe at full love bursts into joy and lifts its neighbour', () => {
    const mv = new Multiverse(1);
    const a = mv.allocId();
    const b = mv.allocId();
    mv.graph.add(makeNode(a, 0, 0, 1.0));
    mv.graph.add(makeNode(b, 30, 0, 0.3));
    mv.graph.addEdge(a, b);
    mv.tick(1 / 60);
    expect(mv.loveOverflows).toBe(1);
    expect(mv.graph.get(b)!.love).toBeGreaterThan(0.3);
  });

  it('keeps the live count bounded over a long unattended run (entropy wins alone)', () => {
    const mv = Multiverse.create(SIM.SEED);
    let peak = 0;
    for (let i = 0; i < 5 * 60 * 60; i++) {
      mv.tick(SIM.DT);
      if (mv.graph.size > peak) peak = mv.graph.size;
    }
    expect(peak).toBeLessThanOrEqual(SIM.MAX_LIVE_NODES);
    expect(peak).toBeGreaterThan(20);
    expect(mv.entropyOverflows).toBeGreaterThan(0); // left alone, the dark wins
  });

  it('hit-tests the nearest universe and ignores far points', () => {
    const mv = Multiverse.create(7);
    const c = mv.centroid()!;
    expect(mv.nearestNode(c, 1e6)).not.toBeNull();
    expect(mv.nearestNode({ x: 1e9, y: 1e9 }, 10)).toBeNull();
  });
});
