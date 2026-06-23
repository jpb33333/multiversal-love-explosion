import { describe, it, expect } from 'vitest';
import { Cosmos } from '../src/sim/turn/Cosmos.ts';
import { HAVEN, COLLAPSE, GOAL } from '../src/sim/turn/constants.ts';

describe('turn cosmos loop', () => {
  it('a placement spends one love from the budget', () => {
    const c = Cosmos.create(1);
    const id = [...c.placeable()][0];
    expect(c.budget).toBe(HAVEN.OUTPUT_PER_ROUND);
    expect(c.place(id)).toBe(true);
    expect(c.budget).toBe(HAVEN.OUTPUT_PER_ROUND - 1);
  });

  it('refuses placements off the supply line and when the budget is spent', () => {
    const c = Cosmos.create(1);
    const offLine = [...c.universes.values()].find(u => !c.placeable().has(u.id) && u.kind !== 'haven')!;
    expect(c.place(offLine.id)).toBe(false);
    c.budget = 0;
    const onLine = [...c.placeable()][0];
    expect(c.place(onLine)).toBe(false);
  });

  it('ending the turn advances the round, refills the budget, and grows the oval', () => {
    const c = Cosmos.create(1);
    c.place([...c.placeable()][0]);
    const size0 = c.universes.size;
    c.endTurn();
    expect(c.round).toBe(2);
    expect(c.budget).toBe(HAVEN.OUTPUT_PER_ROUND);
    expect(c.universes.size).toBeGreaterThan(size0);
  });

  it('classifies the win only when love reaches the Far Shore by a living line', () => {
    const c = Cosmos.create(1);
    expect(c.outcome()).toBe('playing');
    // love on the goal alone is not enough — it must trace back to a haven
    c.get(c.goalId)!.love = 1;
    expect(c.outcome()).toBe('playing');
    // forge a living link from a haven to the goal: now the line is unbroken
    const haven = c.get(c.havenIds[0])!;
    const goal = c.get(c.goalId)!;
    haven.neighbors.push(goal.id);
    goal.neighbors.push(haven.id);
    expect(c.outcome()).toBe('love_reaches_shore');
  });

  it('classifies heat death when the collapse track fills', () => {
    const c = Cosmos.create(1);
    c.collapse = COLLAPSE.MAX;
    expect(c.outcome()).toBe('heat_death');
  });

  it('replays identically from the same seed under the same actions', () => {
    const run = (): string => {
      const c = Cosmos.create(99);
      for (let r = 0; r < 5; r++) {
        const ids = [...c.placeable()];
        for (let i = 0; i < 3 && i < ids.length; i++) c.place(ids[i]);
        c.endTurn();
      }
      let h = c.round * 1000 + c.collapse * 100 + c.livingCount();
      for (const u of c.universes.values()) h += u.love * (u.id + 1);
      return String(h) + '/' + c.universes.size;
    };
    expect(run()).toBe(run());
  });

  it('the goal sits beyond the initial frontier (a real distance to cross)', () => {
    const c = Cosmos.create(1);
    expect(GOAL.RING).toBeGreaterThan(c.frontierRing);
  });
});
