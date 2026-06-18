// The chain reaction, one fixed tick. Every lit universe loses signal (decay);
// when it bottoms out it goes dormant again (the love left). Then each universe
// still bright enough spreads love to a dormant neighbour as its accumulator
// ticks over — deterministic (no RNG), so a given seed replays exactly. Pure:
// imports no rendering.

import type { Multiverse } from './Multiverse.ts';
import { type MvNode } from './graph.ts';
import { SPREAD } from './constants.ts';

function firstDormantNeighbor(mv: Multiverse, node: MvNode): MvNode | null {
  for (const nid of node.neighbors) {
    const nb = mv.graph.get(nid);
    if (nb && nb.state === 'dormant') return nb;
  }
  return null;
}

export function stepSpread(mv: Multiverse, dt: number, decay: number): void {
  const graph = mv.graph;

  // Decay every lit universe (and fade the ignite flash on all).
  for (const n of graph.values()) {
    if (n.flash > 0) n.flash = Math.max(0, n.flash - dt * 3);
    if (n.state !== 'lit') continue;
    n.signal -= decay * dt;
    if (n.signal <= 0) {
      n.state = 'dormant';
      n.signal = 0;
      n.spreadAcc = 0;
    }
  }

  // Collect the universes able to spread NOW, so ones lit this very tick don't
  // also spread this tick.
  const spreaders: MvNode[] = [];
  for (const n of graph.values()) {
    if (n.state === 'lit' && n.signal >= SPREAD.MIN_SIGNAL) spreaders.push(n);
  }
  for (const n of spreaders) {
    n.spreadAcc += SPREAD.RATE * n.signal * dt;
    while (n.spreadAcc >= 1) {
      const target = firstDormantNeighbor(mv, n);
      if (!target) {
        n.spreadAcc = Math.min(n.spreadAcc, 1); // no room — don't bank infinitely
        break;
      }
      target.state = 'lit';
      target.signal = SPREAD.SEED_SIGNAL; // weak — will fizzle unless re-clicked
      target.spreadAcc = 0;
      target.flash = 1;
      mv.spreadEvents.push({ x: target.x, y: target.y });
      n.spreadAcc -= 1;
    }
  }
}
