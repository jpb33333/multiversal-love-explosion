// The contagion update — the heart of the simulation. A bounded, deterministic,
// double-buffered discrete step: every node reads its neighbors' OLD love and
// writes a NEW love, so the result is independent of iteration order (the key
// property for testability). Love is hard-clamped to [0,1] every tick, so it is
// bounded by construction. Locked nodes are inert: they neither change nor pull.
//
// Pure: imports no rendering. `entropyBias` (time/pressure/relief) is computed
// by the Multiverse and passed in, keeping that policy out of the hot loop.

import type { Multiverse } from './Multiverse.ts';
import { CONTAGION } from './constants.ts';
import { clamp } from '../utils/clamp.ts';

export function stepContagion(mv: Multiverse, dt: number, entropyBias: number): void {
  const graph = mv.graph;

  // Pass 1 — compute next love for every live node from OLD values only.
  for (const node of graph.values()) {
    if (node.state === 'locked') {
      node.loveNext = node.love;
      continue;
    }
    let sum = 0;
    let deg = 0;
    for (const nid of node.neighbors) {
      const nb = graph.get(nid);
      if (!nb || nb.state === 'locked') continue;
      sum += 2 * nb.love - 1; // +1 fully loving, -1 fully unloving, 0 undecided
      deg++;
    }
    // Mean (not sum) over neighbors → a node's incoming pull is bounded to
    // [-1,1] regardless of degree, so high-degree hubs can't force unboundedly.
    const field = deg > 0 ? sum / deg : 0;
    const isPotential = node.state === 'potential' ? 1 : 0;
    const nudgeDelta = Math.min(node.nudge * dt, CONTAGION.NUDGE_MAX_PER_TICK);
    const d =
      (CONTAGION.GAIN * field -
        entropyBias +
        CONTAGION.RECENTER * (0.5 - node.love) * isPotential) *
        dt +
      nudgeDelta;
    node.loveNext = clamp(node.love + d, 0, 1);
  }

  // Pass 2 — commit, consume the nudge, and run per-node state transitions.
  for (const node of graph.values()) {
    node.nudge = 0;
    if (node.state === 'locked') continue;
    node.love = node.loveNext;

    switch (node.state) {
      case 'potential':
        if (node.love >= CONTAGION.COMMIT_HI || node.love <= CONTAGION.COMMIT_LO) {
          node.commitTimer += dt;
          if (node.commitTimer >= CONTAGION.COMMIT_DWELL) {
            if (node.love >= CONTAGION.COMMIT_HI) {
              node.state = 'loving';
              node.lovingTimer = 0;
            } else {
              node.state = 'unloving';
              node.strandedTimer = 0;
            }
            node.commitTimer = 0;
          }
        } else {
          node.commitTimer = 0;
        }
        break;
      case 'loving':
        node.lovingTimer += dt;
        if (node.love < CONTAGION.RELAPSE_LO) {
          node.state = 'potential';
          node.lovingTimer = 0;
          node.commitTimer = 0;
        }
        break;
      case 'unloving':
        if (node.love > CONTAGION.RELAPSE_HI) {
          node.state = 'potential';
          node.commitTimer = 0;
        }
        break;
    }
  }
}
