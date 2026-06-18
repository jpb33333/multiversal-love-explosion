// How love moves each tick: a gentle pull toward neighbours, a steady entropy
// drain, and the player's pour. Double-buffered (read old love, write new) so it
// is order-independent and deterministic — the key property for testing. Love is
// hard-clamped to [0,1], so it is bounded by construction. Dying (overflowed)
// universes are inert. Pure: imports no rendering.

import type { Multiverse } from './Multiverse.ts';
import { FIELD } from './constants.ts';
import { clamp } from '../utils/clamp.ts';

export function stepDynamics(mv: Multiverse, dt: number, entropyBias: number): void {
  const graph = mv.graph;

  // Pass 1 — compute next love for every live universe from OLD values.
  for (const node of graph.values()) {
    if (node.dying) {
      node.loveNext = node.love;
      continue;
    }
    let sum = 0;
    let deg = 0;
    for (const nid of node.neighbors) {
      const nb = graph.get(nid);
      if (!nb || nb.dying) continue;
      sum += nb.love - 0.5; // −0.5 (entropy) … +0.5 (love)
      deg++;
    }
    const field = deg > 0 ? sum / deg : 0; // mean → bounded regardless of degree
    const pour = Math.min(node.pour * dt, FIELD.POUR_MAX_PER_TICK);
    const d = (FIELD.NEIGHBOR_PULL * 2 * field - entropyBias) * dt + pour;
    node.loveNext = clamp(node.love + d, 0, 1);
  }

  // Pass 2 — commit and consume the pour.
  for (const node of graph.values()) {
    node.pour = 0;
    if (node.dying) continue;
    node.love = node.loveNext;
  }
}
