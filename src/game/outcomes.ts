// Win/lose classification — the heart of the game design, and a direct analog of
// Infinite Binary Wobble's OutcomeClassifier: one instance per run, `update(mv,
// dt)` every frame, a warmup grace, dwell timers so a momentary swing can't
// resolve, and a frozen outcome once decided.
//
// The key move for an *infinitely expanding* world: never measure absolute node
// counts (they're unbounded and meaningless after culling). Measure love's
// SHARE of the committed field — exactly as BW switched from absolute canvas
// position to distance-from-barycenter once its camera followed the system.

import type { Multiverse } from '../sim/Multiverse.ts';
import { SIM } from '../sim/constants.ts';

export type LoveOutcome =
  | { kind: 'playing' }
  | { kind: 'love_explosion' } // win: love decisively outshines entropy
  | { kind: 'entropy_collapse' }; // lose: entropy overwhelms the multiverse

export interface OutcomeConfig {
  warmupSeconds: number; // grace before any resolution (graph must seed + form)
  winLoveShare: number; // love's share of the field must reach this …
  winDwellSeconds: number; // … and hold this long (no one-frame spikes)
  winMinBanked: number; // … and you must have actually LOCKED this much love
  loseEntropyShare: number; // entropy's share reaches this …
  loseDwellSeconds: number; // … sustained this long → collapse
  loseWipeoutSeconds: number; // OR love is extinguished this long → collapse
}

export const DEFAULT_OUTCOME_CONFIG: OutcomeConfig = {
  warmupSeconds: SIM.WARMUP_SECONDS,
  winLoveShare: 0.72,
  winDwellSeconds: 3.0,
  winMinBanked: 18,
  loseEntropyShare: 0.8,
  loseDwellSeconds: 4.0,
  loseWipeoutSeconds: 2.0,
};

export class LoveOutcomeClassifier {
  private readonly cfg: OutcomeConfig;
  private resolved: LoveOutcome = { kind: 'playing' };
  private winTimer = 0;
  private loseTimer = 0;
  private wipeoutTimer = 0;
  private hadLove = false; // true once any love has existed — gates the wipeout loss
  private peakShare = 0;

  constructor(cfg: OutcomeConfig = DEFAULT_OUTCOME_CONFIG) {
    this.cfg = cfg;
  }

  // Highest love-share reached this run (for the scoreboard).
  get peakLoveShare(): number {
    return this.peakShare;
  }

  reset(): void {
    this.resolved = { kind: 'playing' };
    this.winTimer = 0;
    this.loseTimer = 0;
    this.wipeoutTimer = 0;
    this.hadLove = false;
    this.peakShare = 0;
  }

  update(mv: Multiverse, dt: number): LoveOutcome {
    const t = mv.tally();
    if (t.loveShare > this.peakShare) this.peakShare = t.loveShare;
    if (t.lovingCount > 0 || t.bankedLove > 0) this.hadLove = true;

    if (this.resolved.kind !== 'playing') return this.resolved;
    if (mv.time < this.cfg.warmupSeconds) return this.resolved;

    // WIN — love dominates the field AND real love has been banked, sustained.
    if (t.loveShare >= this.cfg.winLoveShare && t.bankedLove >= this.cfg.winMinBanked) {
      this.winTimer += dt;
      if (this.winTimer >= this.cfg.winDwellSeconds) {
        this.resolved = { kind: 'love_explosion' };
        return this.resolved;
      }
    } else {
      this.winTimer = 0;
    }

    // LOSE (share) — entropy dominates the field, sustained.
    const entropyShare = 1 - t.loveShare;
    if (entropyShare >= this.cfg.loseEntropyShare) {
      this.loseTimer += dt;
      if (this.loseTimer >= this.cfg.loseDwellSeconds) {
        this.resolved = { kind: 'entropy_collapse' };
        return this.resolved;
      }
    } else {
      this.loseTimer = 0;
    }

    // LOSE (wipeout) — love once existed and is now extinguished, sustained.
    if (this.hadLove && t.lovingCount === 0 && t.bankedLove <= 0) {
      this.wipeoutTimer += dt;
      if (this.wipeoutTimer >= this.cfg.loseWipeoutSeconds) {
        this.resolved = { kind: 'entropy_collapse' };
        return this.resolved;
      }
    } else {
      this.wipeoutTimer = 0;
    }

    return this.resolved;
  }
}
