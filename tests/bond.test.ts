import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { BondController } from '../src/game/bond.ts';
import { BOND } from '../src/sim/constants.ts';

// A loving chain 1-2-…-n.
function chain(mv: Multiverse, n: number): number[] {
  const ids: number[] = [];
  for (let i = 0; i < n; i++) {
    const node = makeNode(i + 1, i * 40, 0, 0.5);
    node.state = 'loving';
    mv.graph.add(node);
    ids.push(node.id);
  }
  for (let i = 0; i < n - 1; i++) mv.graph.addEdge(i + 1, i + 2);
  return ids;
}

describe('co-op bond', () => {
  it('fires after both players hold linked targets for the charge time, then cools down', () => {
    const mv = new Multiverse(1);
    const ids = chain(mv, 4); // 1-2-3-4: ends are exactly MAX_PATH(3) edges apart
    const bond = new BondController();
    const dt = 1 / 60;
    let fired = false;
    for (let t = 0; t < BOND.CHARGE_SECONDS + 0.1; t += dt) {
      if (bond.update(mv, dt, true, ids[0], ids[3]) === 'fired') {
        fired = true;
        break;
      }
    }
    expect(fired).toBe(true);
    expect(mv.graph.get(ids[0])!.love).toBe(1); // bridge flooded with love
    expect(bond.update(mv, dt, true, ids[0], ids[3])).toBe('cooldown'); // now on cooldown
  });

  it('does not fire when targets are not linked within MAX_PATH', () => {
    const mv = new Multiverse(1);
    mv.graph.add(makeNode(1, 0, 0, 0.5));
    mv.graph.add(makeNode(2, 500, 0, 0.5)); // unconnected
    const bond = new BondController();
    let res = '';
    for (let t = 0; t < BOND.CHARGE_SECONDS + 0.2; t += 1 / 60) {
      res = bond.update(mv, 1 / 60, true, 1, 2);
    }
    expect(res).toBe('unlinked');
  });

  it('does not fire unless both players are active', () => {
    const mv = new Multiverse(1);
    const ids = chain(mv, 3);
    const bond = new BondController();
    let res = '';
    for (let t = 0; t < BOND.CHARGE_SECONDS + 0.2; t += 1 / 60) {
      res = bond.update(mv, 1 / 60, false, ids[0], ids[2]);
    }
    expect(res).toBe('idle');
  });
});
