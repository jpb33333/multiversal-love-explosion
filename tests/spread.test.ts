import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { stepSpread } from '../src/sim/spread.ts';
import { SPREAD } from '../src/sim/constants.ts';

describe('spread', () => {
  it('a lit universe decays and goes dormant when it bottoms out', () => {
    const mv = new Multiverse(1);
    const id = mv.allocId();
    const n = makeNode(id, 0, 0);
    n.state = 'lit';
    n.signal = 0.3;
    mv.graph.add(n);
    for (let t = 0; t < 60; t++) stepSpread(mv, 1 / 60, 0.42);
    expect(mv.graph.get(id)!.state).toBe('dormant');
  });

  it('a full-signal universe spreads love to a dormant neighbour', () => {
    const mv = new Multiverse(1);
    const a = mv.allocId();
    const na = makeNode(a, 0, 0);
    na.state = 'lit';
    na.signal = 1;
    mv.graph.add(na);
    const b = mv.allocId();
    mv.graph.add(makeNode(b, 30, 0));
    mv.graph.addEdge(a, b);
    let lit = false;
    for (let t = 0; t < 60 && !lit; t++) {
      stepSpread(mv, 1 / 60, 0); // no decay, so it stays bright
      if (mv.graph.get(b)!.state === 'lit') lit = true;
    }
    expect(lit).toBe(true);
  });

  it('a too-faint universe cannot spread', () => {
    const mv = new Multiverse(1);
    const a = mv.allocId();
    const na = makeNode(a, 0, 0);
    na.state = 'lit';
    na.signal = SPREAD.MIN_SIGNAL - 0.05;
    mv.graph.add(na);
    const b = mv.allocId();
    mv.graph.add(makeNode(b, 30, 0));
    mv.graph.addEdge(a, b);
    for (let t = 0; t < 120; t++) stepSpread(mv, 1 / 60, 0);
    expect(mv.graph.get(b)!.state).toBe('dormant');
  });

  it('replays identically from the same seed (deterministic, no RNG in spread)', () => {
    const run = (): number => {
      const mv = Multiverse.create(99);
      for (let i = 0; i < 600; i++) mv.tick(1 / 60);
      return mv.litCount + mv.graph.size * 1000;
    };
    expect(run()).toBe(run());
  });
});
