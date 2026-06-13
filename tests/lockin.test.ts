import { describe, it, expect } from 'vitest';
import { Multiverse } from '../src/sim/Multiverse.ts';
import { makeNode } from '../src/sim/graph.ts';
import { scanLocks } from '../src/sim/lockin.ts';
import { LOCK } from '../src/sim/constants.ts';

// Build a fully-connected loving clique of `n` nodes with the given love and
// lovingTimer, so readiness is exactly controllable.
function lovingClique(mv: Multiverse, n: number, love: number, lovingTimer: number): void {
  const ids: number[] = [];
  for (let i = 0; i < n; i++) {
    const node = makeNode(i + 1, (i % 3) * 30, Math.floor(i / 3) * 30, love);
    node.state = 'loving';
    node.lovingTimer = lovingTimer;
    mv.graph.add(node);
    ids.push(node.id);
  }
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) mv.graph.addEdge(ids[a], ids[b]);
  }
}

describe('lock-in', () => {
  it('auto-locks a big, pure, settled loving cluster and pays out', () => {
    const mv = new Multiverse(1);
    lovingClique(mv, LOCK.MIN_SIZE, 0.9, LOCK.STABILITY_SECONDS + 0.1);
    mv.lockScanAcc = LOCK.SCAN_INTERVAL; // force the scan to run this call
    scanLocks(mv, 1 / 60);
    for (const node of mv.graph.values()) expect(node.state).toBe('locked');
    expect(mv.score).toBeGreaterThan(0);
    expect(mv.lockBank.length).toBe(1);
    expect(mv.loveSpawnCredits).toBeGreaterThan(0);
    expect(mv.lockEvents.length).toBe(1);
  });

  it('does not lock a cluster below the minimum size', () => {
    const mv = new Multiverse(1);
    lovingClique(mv, LOCK.MIN_SIZE - 1, 0.95, LOCK.STABILITY_SECONDS + 0.1);
    mv.lockScanAcc = LOCK.SCAN_INTERVAL;
    scanLocks(mv, 1 / 60);
    for (const node of mv.graph.values()) expect(node.state).toBe('loving');
    expect(mv.score).toBe(0);
  });

  it('does not lock a cluster that has not settled (low lovingTimer)', () => {
    const mv = new Multiverse(1);
    lovingClique(mv, LOCK.MIN_SIZE + 2, 0.95, 0.1);
    mv.lockScanAcc = LOCK.SCAN_INTERVAL;
    scanLocks(mv, 1 / 60);
    for (const node of mv.graph.values()) expect(node.state).toBe('loving');
  });
});
