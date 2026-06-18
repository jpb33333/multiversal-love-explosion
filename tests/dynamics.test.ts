import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { stepDynamics } from '../src/sim/dynamics.ts';
import { FIELD } from '../src/sim/constants.ts';

function line(loves: number[]): Multiverse {
  const mv = new Multiverse(1);
  for (let i = 0; i < loves.length; i++) mv.graph.add(makeNode(i + 1, i * 90, 0, loves[i]));
  for (let i = 0; i < loves.length - 1; i++) mv.graph.addEdge(i + 1, i + 2);
  return mv;
}

describe('dynamics', () => {
  it('keeps every love value in [0,1] under extreme inputs', () => {
    const mv = line([1, 0, 1, 0, 0.5]);
    for (let t = 0; t < 1500; t++) {
      for (const n of mv.graph.values()) n.pour = FIELD.POUR * 50;
      stepDynamics(mv, 1 / 60, 0.5);
      for (const n of mv.graph.values()) {
        expect(n.love).toBeGreaterThanOrEqual(0);
        expect(n.love).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic and independent of iteration order (double buffer)', () => {
    const loves = [0.9, 0.1, 0.7, 0.3, 0.55, 0.6];
    const fwd = new Multiverse(1);
    for (let i = 0; i < loves.length; i++) fwd.graph.add(makeNode(i + 1, i * 80, 0, loves[i]));
    for (let i = 0; i < loves.length - 1; i++) fwd.graph.addEdge(i + 1, i + 2);
    const rev = new Multiverse(1);
    for (let i = loves.length - 1; i >= 0; i--) rev.graph.add(makeNode(i + 1, i * 80, 0, loves[i]));
    for (let i = 0; i < loves.length - 1; i++) rev.graph.addEdge(i + 1, i + 2);
    for (let t = 0; t < 40; t++) {
      stepDynamics(fwd, 1 / 60, 0.05);
      stepDynamics(rev, 1 / 60, 0.05);
    }
    for (let i = 1; i <= loves.length; i++) {
      expect(rev.graph.get(i)!.love).toBeCloseTo(fwd.graph.get(i)!.love, 12);
    }
  });

  it('pouring raises love; entropy alone drains it', () => {
    const mv = new Multiverse(1);
    mv.graph.add(makeNode(1, 0, 0, 0.5));
    for (let t = 0; t < 20; t++) {
      mv.graph.get(1)!.pour = FIELD.POUR;
      stepDynamics(mv, 1 / 60, 0.05);
    }
    expect(mv.graph.get(1)!.love).toBeGreaterThan(0.5);

    const cold = new Multiverse(1);
    cold.graph.add(makeNode(1, 0, 0, 0.5));
    for (let t = 0; t < 20; t++) stepDynamics(cold, 1 / 60, 0.2);
    expect(cold.graph.get(1)!.love).toBeLessThan(0.5);
  });
});
