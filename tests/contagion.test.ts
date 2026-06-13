import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { stepContagion } from '../src/sim/contagion.ts';
import { CONTAGION } from '../src/sim/constants.ts';

// A bare Multiverse with explicit nodes/edges (no random seeding) — the
// deterministic fixture style BW uses for its physics tests.
function line(loves: number[], seed = 1): Multiverse {
  const mv = new Multiverse(seed);
  for (let i = 0; i < loves.length; i++) mv.graph.add(makeNode(i + 1, i * 90, 0, loves[i]));
  for (let i = 0; i < loves.length - 1; i++) mv.graph.addEdge(i + 1, i + 2);
  return mv;
}

describe('contagion', () => {
  it('keeps every love value in [0,1] under extreme inputs (the core invariant)', () => {
    const mv = line([1, 0, 1, 0, 0.5]);
    for (let t = 0; t < 2000; t++) {
      for (const n of mv.graph.values()) n.nudge = CONTAGION.NUDGE * 100; // absurd spam
      stepContagion(mv, 1 / 60, 0.9); // brutal entropy
      for (const n of mv.graph.values()) {
        expect(n.love).toBeGreaterThanOrEqual(0);
        expect(n.love).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic and independent of node iteration order (double-buffer)', () => {
    const loves = [0.9, 0.1, 0.7, 0.3, 0.55, 0.6];
    const fwd = new Multiverse(1);
    for (let i = 0; i < loves.length; i++) fwd.graph.add(makeNode(i + 1, i * 80, 0, loves[i]));
    for (let i = 0; i < loves.length - 1; i++) fwd.graph.addEdge(i + 1, i + 2);

    const rev = new Multiverse(1);
    for (let i = loves.length - 1; i >= 0; i--) rev.graph.add(makeNode(i + 1, i * 80, 0, loves[i]));
    for (let i = 0; i < loves.length - 1; i++) rev.graph.addEdge(i + 1, i + 2);

    for (let t = 0; t < 50; t++) {
      stepContagion(fwd, 1 / 60, 0.06);
      stepContagion(rev, 1 / 60, 0.06);
    }
    for (let i = 1; i <= loves.length; i++) {
      expect(rev.graph.get(i)!.love).toBeCloseTo(fwd.graph.get(i)!.love, 12);
    }
  });

  it('loving neighbors raise an undecided node; entropy alone drains an isolated one', () => {
    const mv = line([1, 0.5, 1]);
    const before = mv.graph.get(2)!.love;
    for (let t = 0; t < 10; t++) {
      mv.graph.get(1)!.love = 1; // pin the loving ends so they keep pulling
      mv.graph.get(3)!.love = 1;
      stepContagion(mv, 1 / 60, 0); // no entropy
    }
    expect(mv.graph.get(2)!.love).toBeGreaterThan(before);

    const iso = new Multiverse(1);
    const n = makeNode(1, 0, 0, 0.5);
    n.state = 'unloving'; // committed, so the potential RECENTER pull doesn't fight us
    iso.graph.add(n);
    for (let t = 0; t < 10; t++) stepContagion(iso, 1 / 60, 0.2);
    expect(iso.graph.get(1)!.love).toBeLessThan(0.5);
  });
});
