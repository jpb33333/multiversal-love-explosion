// The Multiverse owns the graph, the RNG, the clock, and the constant tables; it
// runs the fixed-tick pipeline (spawn → contagion → lock → cull) and exposes the
// read-only queries the renderer, the outcome classifier, and the cursors need.
// It imports no rendering — the boundary that keeps the whole simulation
// unit-testable without a canvas.

import { GraphStore, type MvNode } from './graph.ts';
import { mulberry32 } from './rng.ts';
import { SIM, CONTAGION, ENTROPY, SPAWN, LOCK, CULL, CONNECT } from './constants.ts';
import { clamp } from '../utils/clamp.ts';
import { stepContagion } from './contagion.ts';
import { seedCluster, spawnOne } from './spawn.ts';
import { scanLocks } from './lockin.ts';

// How far the P2 keyboard cursor can hop in one step (a bit past an edge).
const HOP_RADIUS = SPAWN.EDGE_MAX_DIST * 1.6;

export interface Tally {
  nodeCount: number;
  potentialCount: number;
  lovingCount: number;
  unlovingCount: number;
  lockedCount: number;
  lovePower: number; // Σ love over live loving nodes
  entropyPower: number; // Σ (1 − love) over live unloving nodes
  bankedLove: number; // Σ love locked within the win window
  loveShare: number; // (lovePower + bankedLove) / (… + entropyPower)
}

export interface LockEvent {
  x: number;
  y: number;
  size: number;
}

export interface ConstellationPoint {
  x: number;
  y: number;
  love: boolean; // true = a banked loving lock; false = a dead "dark star"
}

export class Multiverse {
  readonly graph = new GraphStore();
  rng: () => number;
  time = 0;
  score = 0;

  // Accumulators / running sim state (public so the pure step modules can use them).
  spawnAcc = 0;
  lockScanAcc = 0;
  lockRelief = 0;
  loveSpawnCredits = 0;
  lockBank: { love: number; t: number }[] = [];
  lockEvents: LockEvent[] = []; // drained by the Game each frame (→ bursts)
  connectEvents: { ax: number; ay: number; bx: number; by: number }[] = []; // player links (→ fx)
  constellation: ConstellationPoint[] = []; // render-only memorial of culled nodes

  private nextId = 1;
  private unlovingCount = 0;

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

  // One fixed tick: spawn → contagion → lock → cull, plus the slow bookkeeping
  // (relief decay, win-bank window, constellation cap).
  tick(dt: number): void {
    this.time += dt;

    let unloving = 0;
    for (const n of this.graph.values()) {
      n.age += dt;
      if (n.state === 'unloving') unloving++;
    }
    this.unlovingCount = unloving;

    this.maybeSpawn(dt);
    stepContagion(this, dt, this.entropyBias());
    scanLocks(this, dt);
    this.cull(dt);

    if (this.lockRelief > 0) {
      this.lockRelief -= this.lockRelief * (dt / ENTROPY.RELIEF_DECAY);
      if (this.lockRelief < 1e-4) this.lockRelief = 0;
    }

    const cutoff = this.time - LOCK.BANK_WINDOW;
    while (this.lockBank.length > 0 && this.lockBank[0].t < cutoff) this.lockBank.shift();

    if (this.constellation.length > SIM.CONSTELLATION_MAX) {
      this.constellation.splice(0, this.constellation.length - SIM.CONSTELLATION_MAX);
    }
  }

  // Current entropy drain: a time ramp, plus pressure from live unloving nodes
  // (losing boards harden), minus active lock-in relief.
  entropyBias(): number {
    const mins = this.time / 60;
    const pressure = Math.min(
      ENTROPY.PRESSURE_PER_UNLOVING * this.unlovingCount,
      ENTROPY.PRESSURE_MAX,
    );
    const bias = ENTROPY.BASE + ENTROPY.RAMP_PER_MIN * mins + pressure - this.lockRelief;
    return clamp(bias, 0, ENTROPY.MAX);
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

  // Remove faded locked clusters and stranded entropy pockets, banking each into
  // the render-only constellation. This is what keeps the live set bounded — and
  // therefore what lets the multiverse expand effectively forever.
  private cull(dt: number): void {
    const toRemove: number[] = [];
    for (const node of this.graph.values()) {
      if (node.state === 'locked') {
        if (this.time - node.lockedAt >= LOCK.FADE_SECONDS) {
          toRemove.push(node.id);
          this.constellation.push({ x: node.x, y: node.y, love: true });
        }
      } else if (node.state === 'unloving') {
        let hasLive = false;
        for (const nid of node.neighbors) {
          const nb = this.graph.get(nid);
          if (nb && (nb.state === 'potential' || nb.state === 'loving')) {
            hasLive = true;
            break;
          }
        }
        if (hasLive) node.strandedTimer = 0;
        else node.strandedTimer += dt;
        if (node.age >= CULL.UNLOVING_MIN_AGE && node.strandedTimer >= CULL.STRANDED_DWELL) {
          toRemove.push(node.id);
          this.constellation.push({ x: node.x, y: node.y, love: false });
        }
      }
    }
    for (const id of toRemove) this.graph.remove(id);

    // Absolute safety valve: force-cull the oldest non-loving nodes if we are
    // ever over budget, so the live count is bounded under any input.
    if (this.graph.size > SIM.MAX_LIVE_NODES) {
      const overflow: MvNode[] = [];
      for (const n of this.graph.values()) if (n.state !== 'loving') overflow.push(n);
      overflow.sort((a, b) => b.age - a.age);
      const excess = this.graph.size - SIM.MAX_LIVE_NODES;
      for (let i = 0; i < excess && i < overflow.length; i++) this.graph.remove(overflow[i].id);
    }
  }

  // ── player input ──

  // Pour love into a node this tick (a held caress). Love-only; entropy is the
  // sole downward force. No-op on locked nodes.
  nurture(id: number): void {
    const n = this.graph.get(id);
    if (!n || n.state === 'locked') return;
    n.nudge = CONTAGION.NUDGE;
  }

  // Wire two nearby universes together (the player dragged from `from` to `to`).
  // Love rushes from the more-loving end into the other right away, then keeps
  // flowing along the new permanent edge via contagion. Returns false if the
  // link is invalid (same node, locked, or too far apart).
  connect(from: number, to: number): boolean {
    if (from === to) return false;
    const nf = this.graph.get(from);
    const nt = this.graph.get(to);
    if (!nf || !nt || nf.state === 'locked' || nt.state === 'locked') return false;
    const dx = nf.x - nt.x;
    const dy = nf.y - nt.y;
    if (dx * dx + dy * dy > CONNECT.MAX_DIST * CONNECT.MAX_DIST) return false;
    this.graph.addEdge(from, to);
    // Channel love from the source into the target — but only ever upward.
    if (nf.love > nt.love) {
      nt.love = clamp(nt.love + (nf.love - nt.love) * CONNECT.CHANNEL, 0, 1);
    }
    this.connectEvents.push({ ax: nf.x, ay: nf.y, bx: nt.x, by: nt.y });
    return true;
  }

  // ── queries (render / outcome / cursors read these; none mutate) ──

  tally(): Tally {
    let potentialCount = 0;
    let lovingCount = 0;
    let unlovingCount = 0;
    let lockedCount = 0;
    let lovePower = 0;
    let entropyPower = 0;
    for (const n of this.graph.values()) {
      switch (n.state) {
        case 'potential':
          potentialCount++;
          break;
        case 'loving':
          lovingCount++;
          lovePower += n.love;
          break;
        case 'unloving':
          unlovingCount++;
          entropyPower += 1 - n.love;
          break;
        case 'locked':
          lockedCount++;
          break;
      }
    }
    let bankedLove = 0;
    for (const e of this.lockBank) bankedLove += e.love;
    const totalLove = lovePower + bankedLove;
    const denom = totalLove + entropyPower;
    const loveShare = denom > 1e-9 ? totalLove / denom : 0.5;
    return {
      nodeCount: this.graph.size,
      potentialCount,
      lovingCount,
      unlovingCount,
      lockedCount,
      lovePower,
      entropyPower,
      bankedLove,
      loveShare,
    };
  }

  // Unweighted mean of all live node positions — the camera target. Stable even
  // before any love exists (unlike a love-weighted centroid).
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

  // Nearest nurturable (non-locked) node to a point, within maxDist. For P1
  // pointer hit-testing.
  nearestNode(p: { x: number; y: number }, maxDist: number): number | null {
    let best: number | null = null;
    let bestD = maxDist * maxDist;
    for (const n of this.graph.values()) {
      if (n.state === 'locked') continue;
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

  // The node best aligned with `dir` within hop range — for the P2 keyboard
  // cursor. Returns the current id if nothing lies that way, or the node nearest
  // the centroid when nothing is selected yet.
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
      if (n.id === cur.id || n.state === 'locked') continue;
      const dx = n.x - cur.x;
      const dy = n.y - cur.y;
      const dsq = dx * dx + dy * dy;
      if (dsq > radSq || dsq < 1e-6) continue;
      const dd = Math.sqrt(dsq);
      const align = (dx / dd) * dnx + (dy / dd) * dny; // cos of angle to dir
      const score = align - 0.0006 * dd; // prefer aligned, then near
      if (align > 0.35 && score > bestScore) {
        bestScore = score;
        best = n.id;
      }
    }
    return best ?? id;
  }
}
