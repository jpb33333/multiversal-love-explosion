import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { CONNECT } from '../src/sim/constants.ts';

describe('connect (player-drawn links)', () => {
  it('links two nearby universes and channels love from the loving one', () => {
    const mv = new Multiverse(1);
    const a = makeNode(1, 0, 0, 1.0);
    a.state = 'loving';
    mv.graph.add(a);
    mv.graph.add(makeNode(2, 40, 0, 0.2));

    expect(mv.connect(1, 2)).toBe(true);
    expect(mv.graph.get(1)!.neighbors).toContain(2);
    expect(mv.graph.get(2)!.neighbors).toContain(1);
    expect(mv.graph.get(2)!.love).toBeGreaterThan(0.2); // love rushed in
    expect(mv.connectEvents.length).toBe(1);
  });

  it('refuses to link universes that are too far apart', () => {
    const mv = new Multiverse(1);
    mv.graph.add(makeNode(1, 0, 0, 1.0));
    mv.graph.add(makeNode(2, CONNECT.MAX_DIST + 60, 0, 0.2));
    expect(mv.connect(1, 2)).toBe(false);
    expect(mv.graph.get(1)!.neighbors).not.toContain(2);
  });

  it('never lowers the target when the source is colder, and rejects locked nodes', () => {
    const mv = new Multiverse(1);
    mv.graph.add(makeNode(1, 0, 0, 0.1));
    mv.graph.add(makeNode(2, 40, 0, 0.9));
    mv.connect(1, 2);
    expect(mv.graph.get(2)!.love).toBe(0.9); // unchanged — connecting only ever helps

    const locked = makeNode(3, 60, 0, 0.5);
    locked.state = 'locked';
    mv.graph.add(locked);
    expect(mv.connect(1, 3)).toBe(false);
  });
});
