import { describe, it, expect } from 'vitest';
import { Cosmos } from '../src/sim/turn/Cosmos.ts';
import { havenConnectedLoved, placeableSet } from '../src/sim/turn/supply.ts';
import { LOVE } from '../src/sim/turn/constants.ts';

describe('turn supply routes', () => {
  it('starts with only the havens connected, and the line is extendable', () => {
    const c = Cosmos.create(1);
    const connected = havenConnectedLoved(c);
    expect([...connected].sort()).toEqual([...c.havenIds].sort());

    const set = placeableSet(c);
    expect(set.size).toBeGreaterThan(0);
    for (const id of set) {
      const u = c.get(id)!;
      expect(u.kind).not.toBe('haven');
      expect(u.love).toBeLessThan(LOVE.CAP);
    }
  });

  it('placing love extends the suppliable frontier outward', () => {
    const c = Cosmos.create(1);
    const first = [...placeableSet(c)][0];
    expect(c.place(first)).toBe(true);
    const after = placeableSet(c);
    // it still has room (love 1 < CAP), so it stays a valid top-up target
    const u = c.get(first)!;
    expect(u.love).toBeLessThan(LOVE.CAP);
    expect(after.has(first)).toBe(true);
    // and lighting it opened fresh ground: a cold neighbour is now suppliable
    const openedNeighbor = u.neighbors.some(nb => {
      const n = c.get(nb)!;
      return n.kind !== 'haven' && n.love === 0 && after.has(nb);
    });
    expect(openedNeighbor).toBe(true);
  });

  it('a loved cluster cut off from every haven cannot be resupplied', () => {
    const c = Cosmos.create(2);
    // strand a far ring-2 couple: loved, but every path to a haven is cold
    const lone = [...c.universes.values()].find(u => u.ring === 2 && u.kind === 'normal')!;
    lone.love = 2;
    lone.everLoved = true;
    expect(lone.love).toBeGreaterThanOrEqual(1);
    expect(havenConnectedLoved(c).has(lone.id)).toBe(false); // stranded behind the cold
    expect(placeableSet(c).has(lone.id)).toBe(false); // so: unsupplied
  });
});
