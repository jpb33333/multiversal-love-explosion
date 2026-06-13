// Lock-in — the "Tetris" beat. A connected component of loving nodes that has
// grown big enough, pure enough, and held long enough auto-locks: it
// crystallizes, banks score, relieves entropy, grants love-seeded spawns, and
// (over LOCK.FADE_SECONDS) fades and is culled. Auto-locking keeps the
// two-player controls to a single verb — nurture — while the co-op bond is what
// converts-and-locks a big neighborhood in one decisive stroke (see game/bond).
//
// Pure: the `import type` of Multiverse is erased, so no import cycle.

import type { Multiverse } from './Multiverse.ts';
import type { MvNode } from './graph.ts';
import { LOCK } from './constants.ts';

export function scanLocks(mv: Multiverse, dt: number): void {
  mv.lockScanAcc += dt;
  if (mv.lockScanAcc < LOCK.SCAN_INTERVAL) return;
  mv.lockScanAcc = 0;

  const graph = mv.graph;
  const visited = new Set<number>();
  for (const start of graph.values()) {
    if (start.state !== 'loving' || visited.has(start.id)) continue;

    // Flood the loving-only connected component from this node.
    const comp: MvNode[] = [];
    const stack: MvNode[] = [start];
    visited.add(start.id);
    while (stack.length > 0) {
      const n = stack.pop()!;
      comp.push(n);
      for (const nid of n.neighbors) {
        if (visited.has(nid)) continue;
        const nb = graph.get(nid);
        if (!nb || nb.state !== 'loving') continue;
        visited.add(nid);
        stack.push(nb);
      }
    }

    if (comp.length < LOCK.MIN_SIZE) continue;
    let sumLove = 0;
    let minTimer = Infinity;
    for (const n of comp) {
      sumLove += n.love;
      if (n.lovingTimer < minTimer) minTimer = n.lovingTimer;
    }
    const meanLove = sumLove / comp.length;
    if (meanLove >= LOCK.MIN_MEAN_LOVE && minTimer >= LOCK.STABILITY_SECONDS) {
      lockCluster(mv, comp);
    }
  }
}

// Apply the full lock-in payoff to a set of nodes. Exported so the co-op bond
// can reuse it on the neighborhood it converts.
export function lockCluster(mv: Multiverse, comp: MvNode[]): void {
  if (comp.length === 0) return;
  let sumLove = 0;
  let cx = 0;
  let cy = 0;
  for (const n of comp) {
    n.state = 'locked';
    n.lockedAt = mv.time;
    sumLove += n.love;
    cx += n.x;
    cy += n.y;
  }
  const size = comp.length;
  const meanLove = sumLove / size;
  mv.score += LOCK.BASE_SCORE * size + LOCK.MEAN_BONUS * size * meanLove;
  mv.lockRelief += LOCK.RELIEF * size;
  mv.loveSpawnCredits += LOCK.SPAWN_CREDIT * size;
  mv.lockBank.push({ love: sumLove, t: mv.time });
  mv.lockEvents.push({ x: cx / size, y: cy / size, size });
}
