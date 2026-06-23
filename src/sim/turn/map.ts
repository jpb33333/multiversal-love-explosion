// Geometry: build the starting oval and grow it. Universes sit on elliptical
// rings around a warm haven core; the Far Shore is a lone beacon far out on the
// major axis, unwired until the expanding frontier reaches it. Each onslaught
// the oval grows by one ring (more couples to keep alive, the Tetris pressure).
// Wiring is k-nearest within a distance cap, but every universe keeps at least
// its single nearest edge so nothing is ever stranded. Pure: no rendering.

import type { Cosmos } from './Cosmos.ts';
import type { Universe, UniverseKind } from './types.ts';
import { makeUniverse } from './types.ts';
import { MAP, HAVEN, GOAL, LOVE } from './constants.ts';

function ringRadius(ring: number): number {
  return MAP.CORE_RADIUS + ring * MAP.RING_GAP;
}

function add(c: Cosmos, x: number, y: number, ring: number, kind: UniverseKind): Universe {
  const u = makeUniverse(c.allocId(), x, y, ring, kind);
  c.universes.set(u.id, u);
  return u;
}

function connect(a: Universe, b: Universe): void {
  if (a.id === b.id) return;
  if (!a.neighbors.includes(b.id)) a.neighbors.push(b.id);
  if (!b.neighbors.includes(a.id)) b.neighbors.push(a.id);
}

function dist2(a: Universe, b: Universe): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// Wire each of `ids` to its nearest universes within the cap (and always to its
// single nearest, so it can never be isolated).
function wireNodes(c: Cosmos, ids: number[]): void {
  const all = [...c.universes.values()];
  const maxSq = MAP.EDGE_MAX_DIST * MAP.EDGE_MAX_DIST;
  for (const id of ids) {
    const u = c.universes.get(id);
    if (!u) continue;
    const ranked = all
      .filter(o => o.id !== id)
      .map(o => ({ o, d: dist2(u, o) }))
      .sort((p, q) => p.d - q.d);
    let made = 0;
    for (const { o, d } of ranked) {
      if (made >= MAP.K_NEIGHBORS) break;
      if (d <= maxSq) {
        connect(u, o);
        made++;
      }
    }
    // Never strand a normal universe — but the Far Shore stays unwired until the
    // expanding frontier truly grows out to within reach of it.
    if (made === 0 && ranked.length > 0 && u.kind !== 'goal') connect(u, ranked[0].o);
  }
}

// One elliptical loop of `count` universes, jittered so it reads organic.
function spawnRing(c: Cosmos, ring: number): number[] {
  const count = MAP.BASE_PER_RING + ring * MAP.PER_RING_GROWTH;
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const angle = baseAngle + (c.rng() - 0.5) * MAP.ANGLE_JITTER;
    const rad = ringRadius(ring) + (c.rng() - 0.5) * MAP.RADIUS_JITTER;
    const x = rad * MAP.ASPECT * Math.cos(angle);
    const y = rad * Math.sin(angle);
    ids.push(add(c, x, y, ring, 'normal').id);
  }
  return ids;
}

export function buildWorld(c: Cosmos): void {
  // Warm core: a tight cluster of havens at the centre, born full of love.
  for (let i = 0; i < HAVEN.COUNT; i++) {
    const angle = (i / HAVEN.COUNT) * Math.PI * 2 + 0.4;
    const rad = MAP.CORE_RADIUS * 0.45;
    const u = add(c, rad * MAP.ASPECT * Math.cos(angle), rad * Math.sin(angle), 0, 'haven');
    u.love = LOVE.CAP;
    u.everLoved = true;
    c.havenIds.push(u.id);
  }

  for (let ring = 1; ring <= MAP.INITIAL_RINGS; ring++) spawnRing(c, ring);

  // The Far Shore: a lone beacon out on the major axis, wired in later once the
  // expanding frontier grows out to meet it.
  const goal = add(c, ringRadius(GOAL.RING) * MAP.ASPECT, 0, GOAL.RING, 'goal');
  c.goalId = goal.id;

  wireNodes(c, [...c.universes.keys()]);
  c.frontierRing = MAP.INITIAL_RINGS;
}

// Grow the oval by one ring (called by the onslaught). New cold universes wire to
// the existing graph — and, once we reach it, to the Far Shore.
export function expandFrontier(c: Cosmos, ring: number): void {
  const ids = spawnRing(c, ring);
  wireNodes(c, ids);
}
