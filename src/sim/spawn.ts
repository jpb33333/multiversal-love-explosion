// Frontier spawning. New universes appear adjacent to the CURRENT live cluster
// (near a random existing node), not at an ever-distant global radius — so they
// always bloom near the action while the whole cluster drifts through unbounded
// space as the interior is culled behind it. Edges are wired to the k nearest
// live neighbors within a distance cap (bounded degree → stable, cheap).
//
// Pure: operates on the Multiverse's public surface (rng, graph, allocId,
// loveSpawnCredits). The `import type` of Multiverse is erased at runtime, so
// there is no import cycle with Multiverse.ts.

import type { Multiverse } from './Multiverse.ts';
import { makeNode, type MvNode } from './graph.ts';
import { SPAWN } from './constants.ts';
import { clamp } from '../utils/clamp.ts';

const TWO_PI = Math.PI * 2;

function tooClose(mv: Multiverse, x: number, y: number, minGap: number): boolean {
  const minSq = minGap * minGap;
  for (const n of mv.graph.values()) {
    const dx = n.x - x;
    const dy = n.y - y;
    if (dx * dx + dy * dy < minSq) return true;
  }
  return false;
}

function wireEdges(mv: Multiverse, node: MvNode): void {
  const maxSq = SPAWN.EDGE_MAX_DIST * SPAWN.EDGE_MAX_DIST;
  const cands: { id: number; d: number }[] = [];
  for (const n of mv.graph.values()) {
    if (n.id === node.id) continue;
    const dx = n.x - node.x;
    const dy = n.y - node.y;
    const d = dx * dx + dy * dy;
    if (d <= maxSq) cands.push({ id: n.id, d });
  }
  cands.sort((a, b) => a.d - b.d);
  const k = Math.min(SPAWN.K_NEIGHBORS, cands.length);
  for (let i = 0; i < k; i++) mv.graph.addEdge(node.id, cands[i].id);
}

// Initial central disc, so the very first loving cluster has somewhere to grow.
export function seedCluster(mv: Multiverse): void {
  for (let i = 0; i < SPAWN.SEED_COUNT; i++) {
    const ang = mv.rng() * TWO_PI;
    const r = Math.sqrt(mv.rng()) * SPAWN.SEED_RADIUS; // sqrt → uniform over the disc
    const love = 0.5 + (mv.rng() - 0.5) * 2 * SPAWN.LOVE_JITTER;
    const node = makeNode(mv.allocId(), Math.cos(ang) * r, Math.sin(ang) * r, clamp(love, 0, 1));
    mv.graph.add(node);
    wireEdges(mv, node);
  }
}

// One frontier spawn. Picks a random live node as anchor, finds an open spot a
// short hop away, and wires it in. Skips silently if the area is too crowded
// (keeps clusters from overlapping into mush).
export function spawnOne(mv: Multiverse): void {
  const count = mv.graph.size;
  if (count === 0) {
    mv.graph.add(makeNode(mv.allocId(), 0, 0, 0.5));
    return;
  }

  const idx = Math.floor(mv.rng() * count);
  let anchor: MvNode | null = null;
  let i = 0;
  for (const n of mv.graph.values()) {
    if (i === idx) {
      anchor = n;
      break;
    }
    i++;
  }
  if (!anchor) return;

  let px = 0;
  let py = 0;
  let placed = false;
  for (let attempt = 0; attempt < SPAWN.PLACE_ATTEMPTS; attempt++) {
    const ang = mv.rng() * TWO_PI;
    const dist = SPAWN.DIST + (mv.rng() - 0.5) * 2 * SPAWN.DIST_JITTER;
    px = anchor.x + Math.cos(ang) * dist;
    py = anchor.y + Math.sin(ang) * dist;
    if (!tooClose(mv, px, py, SPAWN.MIN_GAP)) {
      placed = true;
      break;
    }
  }
  if (!placed) return;

  let love: number;
  if (mv.loveSpawnCredits >= 1) {
    mv.loveSpawnCredits -= 1;
    love = SPAWN.LOVE_SEEDED;
  } else {
    love = 0.5 + (mv.rng() - 0.5) * 2 * SPAWN.LOVE_JITTER;
  }
  const node = makeNode(mv.allocId(), px, py, clamp(love, 0, 1));
  mv.graph.add(node);
  wireEdges(mv, node);
}
