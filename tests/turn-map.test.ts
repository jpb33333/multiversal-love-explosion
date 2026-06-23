import { describe, it, expect } from 'vitest';
import { Cosmos } from '../src/sim/turn/Cosmos.ts';
import { expandFrontier } from '../src/sim/turn/map.ts';
import { HAVEN, LOVE, GOAL } from '../src/sim/turn/constants.ts';

function reachableFromHavens(c: Cosmos): Set<number> {
  const seen = new Set<number>(c.havenIds);
  const stack = [...c.havenIds];
  while (stack.length) {
    const id = stack.pop()!;
    const u = c.get(id)!;
    for (const nb of u.neighbors) if (!seen.has(nb)) {
      seen.add(nb);
      stack.push(nb);
    }
  }
  return seen;
}

describe('turn map', () => {
  it('builds a warm haven core, full of love', () => {
    const c = Cosmos.create(1);
    const havens = [...c.universes.values()].filter(u => u.kind === 'haven');
    expect(havens).toHaveLength(HAVEN.COUNT);
    for (const h of havens) {
      expect(h.love).toBe(LOVE.CAP);
      expect(h.everLoved).toBe(true);
    }
  });

  it('places the Far Shore far out on the major axis', () => {
    const c = Cosmos.create(1);
    const goal = c.get(c.goalId)!;
    expect(goal.kind).toBe('goal');
    expect(goal.ring).toBe(GOAL.RING);
    expect(goal.x).toBeGreaterThan(600);
    expect(Math.abs(goal.y)).toBeLessThan(40);
  });

  it('wires every couple back to the havens (no stranded universes)', () => {
    const c = Cosmos.create(7);
    const reachable = reachableFromHavens(c);
    for (const u of c.universes.values()) {
      if (u.kind === 'goal') continue; // the Far Shore is unwired until the frontier reaches it
      expect(u.neighbors.length).toBeGreaterThan(0);
      expect(reachable.has(u.id)).toBe(true);
    }
  });

  it('expanding the frontier grows the oval and wires the new ring in', () => {
    const c = Cosmos.create(3);
    const before = c.universes.size;
    expandFrontier(c, c.frontierRing + 1);
    expect(c.universes.size).toBeGreaterThan(before);
    for (const u of c.universes.values()) {
      if (u.kind === 'goal') continue; // wires in only once the frontier reaches it
      expect(u.neighbors.length).toBeGreaterThan(0);
    }
  });

  it('replays identically from the same seed', () => {
    const sig = (seed: number): string => {
      const c = Cosmos.create(seed);
      return [...c.universes.values()].map(u => `${u.id}:${u.x.toFixed(2)},${u.y.toFixed(2)}`).join('|');
    };
    expect(sig(42)).toBe(sig(42));
  });
});
