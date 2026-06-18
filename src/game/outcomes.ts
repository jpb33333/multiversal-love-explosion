// Win/lose — two race tracks, like Pandemic's cure markers vs the outbreak
// track. Win when enough universes have burst into JOY; lose when too many have
// burst into DARKNESS. One instance per run; freezes on resolve.

import type { Multiverse } from '../sim/Multiverse.ts';
import { OUTCOME } from '../sim/constants.ts';

export type LoveOutcome =
  | { kind: 'playing' }
  | { kind: 'love_explosion' } // win
  | { kind: 'entropy_collapse' }; // lose

export type OutcomeKind = Exclude<LoveOutcome['kind'], 'playing'>;

export interface OutcomeConfig {
  warmupSeconds: number;
  winLoveOverflows: number;
  loseEntropyOverflows: number;
}

export const DEFAULT_OUTCOME_CONFIG: OutcomeConfig = {
  warmupSeconds: OUTCOME.warmupSeconds,
  winLoveOverflows: OUTCOME.winLoveOverflows,
  loseEntropyOverflows: OUTCOME.loseEntropyOverflows,
};

export class LoveOutcomeClassifier {
  private readonly cfg: OutcomeConfig;
  private resolved: LoveOutcome = { kind: 'playing' };
  private peak = 0; // furthest progress toward the win (0..1), for the scoreboard

  constructor(cfg: OutcomeConfig = DEFAULT_OUTCOME_CONFIG) {
    this.cfg = cfg;
  }

  // 0..1 — how close love came to winning (kept name for stats compatibility).
  get peakLoveShare(): number {
    return this.peak;
  }

  reset(): void {
    this.resolved = { kind: 'playing' };
    this.peak = 0;
  }

  update(mv: Multiverse): LoveOutcome {
    const progress = Math.min(1, mv.loveOverflows / this.cfg.winLoveOverflows);
    if (progress > this.peak) this.peak = progress;

    if (this.resolved.kind !== 'playing') return this.resolved;
    if (mv.time < this.cfg.warmupSeconds) return this.resolved;

    if (mv.loveOverflows >= this.cfg.winLoveOverflows) {
      this.resolved = { kind: 'love_explosion' };
    } else if (mv.entropyOverflows >= this.cfg.loseEntropyOverflows) {
      this.resolved = { kind: 'entropy_collapse' };
    }
    return this.resolved;
  }
}
