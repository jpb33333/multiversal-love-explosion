// The Multiverse owns the network, the RNG, and the clock. It runs the fixed
// tick (grow the field → decay+spread → count) and exposes the read-only queries
// the renderer, the classifier, and the cursors need. Imports no rendering.

import { GraphStore } from './graph.ts';
import { mulberry32 } from './rng.ts';
import { SIM, DECAY, IGNITE, SPAWN } from './constants.ts';
import { clamp } from '../utils/clamp.ts';
import { stepSpread } from './spread.ts';
import { seedField, spawnOne } from './spawn.ts';

const HOP_RADIUS = SPAWN.EDGE_MAX_DIST * 1.7;

export interface Tally {
  nodeCount: number;
  litCount: number;
}

export interface SpreadEvent {
  x: number;
  y: number;
}

export class Multiverse {
  readonly graph = new GraphStore();
  rng: () => number;
  time = 0;

  litCount = 0; // universes currently carrying love
  peakLit = 0; // most ever lit at once (progress toward takeoff)
  spreadEvents: SpreadEvent[] = []; // new infections this tick (drained by Game → sparks)

  private spawnAcc = 0;
  private nextId = 1;

  constructor(seed: number = SIM.SEED) {
    this.rng = mulberry32(seed);
  }

  static create(seed: number = SIM.SEED): Multiverse {
    const mv = new Multiverse(seed);
    seedField(mv);
    mv.igniteSeeds();
    mv.recount();
    return mv;
  }

  allocId(): number {
    return this.nextId++;
  }

  // Light a few universes nearest the centre to start the chain.
  private igniteSeeds(): void {
    const byDist = [...this.graph.values()].sort((a, b) => a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y));
    for (let i = 0; i < Math.min(IGNITE.SEED_SPARKS, byDist.length); i++) this.ignite(byDist[i].id);
  }

  tick(dt: number): void {
    this.time += dt;
    for (const n of this.graph.values()) n.age += dt;
    this.maybeSpawn(dt);
    stepSpread(this, dt, this.decayRate());
    this.recount();
  }

  private recount(): void {
    let lit = 0;
    for (const n of this.graph.values()) if (n.state === 'lit') lit++;
    this.litCount = lit;
    if (lit > this.peakLit) this.peakLit = lit;
  }

  // Signal lost per second — rises with elapsed time (the pressure).
  decayRate(): number {
    return clamp(DECAY.BASE + DECAY.RAMP_PER_MIN * (this.time / 60), DECAY.BASE, DECAY.MAX);
  }

  private maybeSpawn(dt: number): void {
    const rate = clamp(
      SPAWN.RATE + SPAWN.RATE_RAMP_PER_MIN * (this.time / 60),
      SPAWN.RATE,
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

  // ── player input: a click sparks (or refreshes) love at a universe ──
  ignite(id: number): void {
    const n = this.graph.get(id);
    if (!n) return;
    n.state = 'lit';
    n.signal = IGNITE.SIGNAL;
    n.flash = 1;
  }

  // ── queries (render / outcome / cursors read these; none mutate) ──

  tally(): Tally {
    return { nodeCount: this.graph.size, litCount: this.litCount };
  }

  // Camera target: the centre of the love (lit universes), or all if none lit.
  centroid(): { x: number; y: number } | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const node of this.graph.values()) {
      if (node.state !== 'lit') continue;
      sx += node.x;
      sy += node.y;
      n++;
    }
    if (n > 0) return { x: sx / n, y: sy / n };
    // no love yet — fall back to the whole field
    let ax = 0;
    let ay = 0;
    let m = 0;
    for (const node of this.graph.values()) {
      ax += node.x;
      ay += node.y;
      m++;
    }
    return m > 0 ? { x: ax / m, y: ay / m } : null;
  }

  // Nearest universe (lit or dormant) to a point — a click ignites whatever's
  // under it.
  nearestNode(p: { x: number; y: number }, maxDist: number): number | null {
    let best: number | null = null;
    let bestD = maxDist * maxDist;
    for (const n of this.graph.values()) {
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
    if (!cur) {
      const c = this.centroid();
      return c ? this.nearestNode(c, HOP_RADIUS * 4) : null;
    }
    const radSq = HOP_RADIUS * HOP_RADIUS;
    let best: number | null = null;
    let bestScore = 0.25;
    for (const n of this.graph.values()) {
      if (n.id === cur.id) continue;
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
