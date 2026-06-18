import { describe, it, expect } from 'vitest';
import { LoveOutcomeClassifier, DEFAULT_OUTCOME_CONFIG } from '../src/game/outcomes.ts';
import type { Multiverse } from '../src/sim/Multiverse.ts';

const W = DEFAULT_OUTCOME_CONFIG.winLoveOverflows;
const L = DEFAULT_OUTCOME_CONFIG.loseEntropyOverflows;

// The classifier only reads time + the two overflow counters.
function fakeMv(time: number, loveOverflows: number, entropyOverflows: number): Multiverse {
  return { time, loveOverflows, entropyOverflows } as unknown as Multiverse;
}

describe('LoveOutcomeClassifier', () => {
  it('stays playing during warmup even at the win threshold', () => {
    const c = new LoveOutcomeClassifier();
    expect(c.update(fakeMv(0.5, W, 0)).kind).toBe('playing');
  });

  it('wins when love-bursts reach the target', () => {
    expect(new LoveOutcomeClassifier().update(fakeMv(5, W - 1, 0)).kind).toBe('playing');
    expect(new LoveOutcomeClassifier().update(fakeMv(5, W, 0)).kind).toBe('love_explosion');
  });

  it('loses when entropy-outbreaks reach the target', () => {
    expect(new LoveOutcomeClassifier().update(fakeMv(5, 0, L - 1)).kind).toBe('playing');
    expect(new LoveOutcomeClassifier().update(fakeMv(5, 0, L)).kind).toBe('entropy_collapse');
  });

  it('freezes on resolve and returns to playing after reset', () => {
    const c = new LoveOutcomeClassifier();
    expect(c.update(fakeMv(5, W, 0)).kind).toBe('love_explosion');
    expect(c.update(fakeMv(9, 0, L)).kind).toBe('love_explosion'); // can't be un-won
    c.reset();
    expect(c.update(fakeMv(9, 0, 0)).kind).toBe('playing');
  });

  it('tracks peak progress toward the win', () => {
    const c = new LoveOutcomeClassifier();
    c.update(fakeMv(5, Math.floor(W / 2), 0));
    expect(c.peakLoveShare).toBeCloseTo(0.5, 1);
  });
});
