// Win/lose. WIN when the love goes viral — enough universes lit at once, held a
// beat to prove it's real. LOSE when the chain burns out — the love had caught
// (peaked above a floor) and then died to nothing. One instance per run; freezes
// on resolve.

import type { Multiverse } from '../sim/Multiverse.ts';
import { TAKEOFF, OUTCOME } from '../sim/constants.ts';

export type LoveOutcome =
  | { kind: 'playing' }
  | { kind: 'love_explosion' } // it went viral — win
  | { kind: 'entropy_collapse' }; // it burned out — lose

export type OutcomeKind = Exclude<LoveOutcome['kind'], 'playing'>;

export interface OutcomeConfig {
  warmupSeconds: number;
  takeoffTarget: number; // lit-at-once to count as viral
  takeoffDwell: number; // held this long to confirm
  extinctionMinPeak: number; // must have lit this many before a wipeout is a loss
}

export const DEFAULT_OUTCOME_CONFIG: OutcomeConfig = {
  warmupSeconds: OUTCOME.warmupSeconds,
  takeoffTarget: TAKEOFF.TARGET,
  takeoffDwell: TAKEOFF.DWELL,
  extinctionMinPeak: OUTCOME.extinctionMinPeak,
};

export class LoveOutcomeClassifier {
  private readonly cfg: OutcomeConfig;
  private resolved: LoveOutcome = { kind: 'playing' };
  private takeoffTimer = 0;
  private peak = 0; // best progress toward takeoff (0..1), for the scoreboard

  constructor(cfg: OutcomeConfig = DEFAULT_OUTCOME_CONFIG) {
    this.cfg = cfg;
  }

  // 0..1 — how close the chain came to going viral (kept name for stats compat).
  get peakLoveShare(): number {
    return this.peak;
  }

  reset(): void {
    this.resolved = { kind: 'playing' };
    this.takeoffTimer = 0;
    this.peak = 0;
  }

  update(mv: Multiverse, dt: number): LoveOutcome {
    const progress = Math.min(1, mv.litCount / this.cfg.takeoffTarget);
    if (progress > this.peak) this.peak = progress;

    if (this.resolved.kind !== 'playing') return this.resolved;
    if (mv.time < this.cfg.warmupSeconds) return this.resolved;

    if (mv.litCount >= this.cfg.takeoffTarget) {
      this.takeoffTimer += dt;
      if (this.takeoffTimer >= this.cfg.takeoffDwell) {
        this.resolved = { kind: 'love_explosion' };
        return this.resolved;
      }
    } else {
      this.takeoffTimer = 0;
    }

    if (mv.peakLit >= this.cfg.extinctionMinPeak && mv.litCount <= 2) {
      this.resolved = { kind: 'entropy_collapse' };
    }
    return this.resolved;
  }
}
