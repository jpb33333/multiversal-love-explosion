// The Multiverse owns the graph, the RNG, the clock, and the overflow rules. It
// runs the fixed-tick pipeline (spawn → dynamics → overflow → fade) and exposes
// the read-only queries the renderer, the outcome classifier, and the cursors
// need. It imports no rendering — the boundary that keeps it unit-testable.

import { GraphStore, type MvNode } from './graph.ts';
import { mulberry32 } from './rng.ts';
import { SIM, FIELD, ENTROPY, SPAWN, OVERFLOW } from './constants.ts';
import { clamp } from '../utils/clamp.ts';
import { stepDynamics } from './dynamics.ts';
import { seedCluster, spawnOne } from './spawn.ts';

// How far the P2 keyboard cursor can hop in one step.
const HOP_RADIUS = SPAWN.EDGE_MAX_DIST * 1.7;

export interface Tally {
  nodeCount: number;
  avgLove: number;
}

export interface OverflowEvent {
  x: number;
  y: number;
  love: boolean; // true = a burst of joy, false = a dark outbreak
}

export interface ConstellationPoint {
  x: number;
  y: number;
  love: boolean;
}

export class Multiverse {
  readonly graph = new GraphStore();
  rng: () => number;
  time = 0;

  loveOverflows = 0; // bursts of joy — progress toward the win
  entropyOverflows = 0; // dark outbreaks — the danger track
  overflowEvents: OverflowEvent[] = []; // drained by the Game each frame (→ fx)
  constellation: ConstellationPoint[] = []; // render-only memorial of culled universes

  private spawnAcc = 0;
  private nextId = 1;

  constructor(seed: number = SIM.SEED) {
    this.rng = mulberry32(seed);
  }

  static create(seed: number = SIM.SEED): Multiverse {
    const mv = new Multiverse(seed);
    seedCluster(mv);
    return mv;
  }

  allocId(): number {
    return this.nextId++;
  }

  tick(dt: number): void {
    this.time += dt;
    for (const n of this.graph.values()) n.age += dt;

    this.maybeSpawn(dt);
    stepDynamics(this, dt, this.entropyBias());
    this.resolveOverflows();
    this.updateDying(dt);

    if (this.constellation.length > SIM.CONSTELLATION_MAX) {
      this.constellation.splice(0, this.constellation.length - SIM.CONSTELLATION_MAX);
    }
  }

  // Ambient love drain, rising over time — the pressure.
  entropyBias(): number {
    const mins = this.time / 60;
    return clamp(ENTROPY.BASE + ENTROPY.RAMP_PER_MIN * mins, 0, ENTROPY.MAX);
  }

  private maybeSpawn(dt: number): void {
    const mins = this.time / 60;
    const rate = clamp(
      SPAWN.RATE_BASE + SPAWN.RATE_RAMP_PER_MIN * mins,
      SPAWN.RATE_BASE,
      SPAWN.RATE_MAX,
    );
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.graph.size >= SIM.MAX_LIVE_NODES) {
        this.spawnAcc = 0;
        break;
      }
      spawnOne(this);
    }
  }

  // The heart: any universe at an extreme bursts and shoves its neighbours,
  // which can chain into a cascade over the next ticks. Collected first, then
  // applied, so it's deterministic and one burst per universe per tick.
  private resolveOverflows(): void {
    const bursting: MvNode[] = [];
    for (const node of this.graph.values()) {
      if (node.dying) continue;
      if (node.love <= OVERFLOW.ENTROPY_AT || node.love >= OVERFLOW.LOVE_AT) bursting.push(node);
    }
    for (const node of bursting) {
      const isLove = node.love >= OVERFLOW.LOVE_AT;
      node.dying = true;
      node.dieT = 0;
      node.burstLove = isLove;
      node.love = isLove ? 1 : 0;
      const splash = isLove ? OVERFLOW.LOVE_SPLASH : -OVERFLOW.DARK_SPLASH;
      for (const nid of node.neighbors) {
        const nb = this.graph.get(nid);
        if (!nb || nb.dying) continue;
        nb.love = clamp(nb.love + splash, 0, 1);
      }
      if (isLove) this.loveOverflows++;
      else this.entropyOverflows++;
      this.overflowEvents.push({ x: node.x, y: node.y, love: isLove });
    }
  }

  // Burst → fade → cull. This is what keeps the live set bounded (every
  // overflowed universe leaves within FADE_SECONDS).
  private updateDying(dt: number): void {
    const toRemove: number[] = [];
    for (const node of this.graph.values()) {
      if (!node.dying) continue;
      node.dieT += dt / OVERFLOW.FADE_SECONDS;
      if (node.dieT >= 1) {
        toRemove.push(node.id);
        this.constellation.push({ x: node.x, y: node.y, love: node.burstLove });
      }
    }
    for (const id of toRemove) this.graph.remove(id);
  }

  // ── player input ──

  // Pour love into a universe this tick (a held caress). No-op if it's bursting.
  nurture(id: number): void {
    const n = this.graph.get(id);
    if (!n || n.dying) return;
    n.pour = FIELD.POUR;
  }

  // ── queries (render / outcome / cursors read these; none mutate) ──

  tally(): Tally {
    let sum = 0;
    let n = 0;
    for (const node of this.graph.values()) {
      if (node.dying) continue;
      sum += node.love;
      n++;
    }
    return { nodeCount: n, avgLove: n > 0 ? sum / n : 0.5 };
  }

  centroid(): { x: number; y: number } | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const node of this.graph.values()) {
      sx += node.x;
      sy += node.y;
      n++;
    }
    return n > 0 ? { x: sx / n, y: sy / n } : null;
  }

  // Nearest universe to a point (within maxDist), skipping bursting ones — for
  // the P1 pointer hit-test.
  nearestNode(p: { x: number; y: number }, maxDist: number): number | null {
    let best: number | null = null;
    let bestD = maxDist * maxDist;
    for (const n of this.graph.values()) {
      if (n.dying) continue;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best;
  }

  // The universe best aligned with `dir` within hop range — for the P2 cursor.
  neighborsByDirection(id: number | null, dir: { x: number; y: number }): number | null {
    const dm = Math.hypot(dir.x, dir.y);
    if (dm < 1e-6) return id;
    const dnx = dir.x / dm;
    const dny = dir.y / dm;
    const cur = id !== null ? this.graph.get(id) : undefined;
    if (!cur || cur.dying) {
      const c = this.centroid();
      return c ? this.nearestNode(c, HOP_RADIUS * 4) : null;
    }
    const radSq = HOP_RADIUS * HOP_RADIUS;
    let best: number | null = null;
    let bestScore = 0.25;
    for (const n of this.graph.values()) {
      if (n.id === cur.id || n.dying) continue;
      const dx = n.x - cur.x;
      const dy = n.y - cur.y;
      const dsq = dx * dx + dy * dy;
      if (dsq > radSq || dsq < 1e-6) continue;
      const dd = Math.sqrt(dsq);
      const align = (dx / dd) * dnx + (dy / dd) * dny;
      const score = align - 0.0006 * dd;
      if (align > 0.35 && score > bestScore) {
        bestScore = score;
        best = n.id;
      }
    }
    return best ?? id;
  }
}
