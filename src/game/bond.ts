// The co-op "love bond" — the signature couple mechanic. When BOTH players hold
// a caress on two universes linked within BOND.MAX_PATH edges, and hold it for
// BOND.CHARGE_SECONDS, the bond fires: it floods the connecting bridge (the
// shortest path plus its immediate neighbors) with full love and, if that forms
// a big-enough cluster, locks it in instantly. A shared cooldown keeps it
// decisive rather than spammable. It is tuned (see CONTAGION vs ENTROPY) so its
// instantaneous love injection exceeds what one player can do alone late game —
// so winning eventually *requires* cooperating.

import type { Multiverse } from '../sim/Multiverse.ts';
import type { MvNode } from '../sim/graph.ts';
import { lockCluster } from '../sim/lockin.ts';
import { BOND, LOCK } from '../sim/constants.ts';

export type BondResult =
  | 'fired'
  | 'charging'
  | 'cooldown'
  | 'idle' // not both active / no valid targets
  | 'unlinked'; // both active but targets aren't linked within MAX_PATH

export class BondController {
  private charge = 0;
  private cooldown = 0;
  // Last successful fire — read by the renderer for the burst effect.
  lastFireAt = -1;
  lastFireX = 0;
  lastFireY = 0;
  lastFireSize = 0;

  get cooldownRemaining(): number {
    return this.cooldown;
  }

  // Charge progress 0..1 (for a UI ring).
  get chargeProgress(): number {
    return Math.min(this.charge / BOND.CHARGE_SECONDS, 1);
  }

  reset(): void {
    this.charge = 0;
    this.cooldown = 0;
    this.lastFireAt = -1;
    this.lastFireSize = 0;
  }

  // Call once per fixed tick. `bothActive` = both players are pouring love;
  // `a`/`b` are their currently targeted node ids (or null).
  update(
    mv: Multiverse,
    dt: number,
    bothActive: boolean,
    a: number | null,
    b: number | null,
  ): BondResult {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      this.charge = 0;
      return 'cooldown';
    }
    if (!bothActive || a === null || b === null || a === b) {
      this.charge = 0;
      return 'idle';
    }

    const path = shortestPath(mv, a, b, BOND.MAX_PATH);
    if (!path) {
      this.charge = 0;
      return 'unlinked';
    }

    this.charge += dt;
    if (this.charge < BOND.CHARGE_SECONDS) return 'charging';

    this.fire(mv, path);
    this.charge = 0;
    this.cooldown = BOND.COOLDOWN_SECONDS;
    return 'fired';
  }

  private fire(mv: Multiverse, path: number[]): void {
    // The bridge: the path nodes plus their 1-hop neighbors, capped.
    const set = new Set<number>(path);
    for (const id of path) {
      if (set.size >= BOND.MAX_NODES) break;
      const n = mv.graph.get(id);
      if (!n) continue;
      for (const nid of n.neighbors) {
        if (set.size >= BOND.MAX_NODES) break;
        set.add(nid);
      }
    }

    const nodes: MvNode[] = [];
    let cx = 0;
    let cy = 0;
    for (const id of set) {
      const n = mv.graph.get(id);
      if (!n || n.state === 'locked') continue;
      n.love = 1;
      n.loveNext = 1;
      n.state = 'loving';
      n.lovingTimer = LOCK.STABILITY_SECONDS; // immediately lock-eligible
      nodes.push(n);
      cx += n.x;
      cy += n.y;
    }

    this.lastFireAt = mv.time;
    this.lastFireSize = nodes.length;
    if (nodes.length > 0) {
      this.lastFireX = cx / nodes.length;
      this.lastFireY = cy / nodes.length;
    }
    // Instant lock if the bridge is big enough — the decisive payoff.
    if (nodes.length >= LOCK.MIN_SIZE) lockCluster(mv, nodes);
  }
}

// Breadth-first shortest path (≤ maxLen edges) between a and b, inclusive of
// both endpoints, or null if there's no path within range.
function shortestPath(mv: Multiverse, a: number, b: number, maxLen: number): number[] | null {
  if (a === b) return [a];
  const prev = new Map<number, number>();
  const visited = new Set<number>([a]);
  let frontier: number[] = [a];
  let depth = 0;
  while (frontier.length > 0 && depth < maxLen) {
    const next: number[] = [];
    for (const id of frontier) {
      const node = mv.graph.get(id);
      if (!node) continue;
      for (const nid of node.neighbors) {
        if (visited.has(nid)) continue;
        visited.add(nid);
        prev.set(nid, id);
        if (nid === b) {
          const path = [b];
          let cur = b;
          while (cur !== a) {
            cur = prev.get(cur)!;
            path.push(cur);
          }
          return path.reverse();
        }
        next.push(nid);
      }
    }
    frontier = next;
    depth++;
  }
  return null;
}
