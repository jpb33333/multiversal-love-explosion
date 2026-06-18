import { describe, it, expect } from 'vitest';
import { LoveOutcomeClassifier, DEFAULT_OUTCOME_CONFIG } from '../src/game/outcomes.ts';
import type { Multiverse } from '../src/sim/Multiverse.ts';

const T = DEFAULT_OUTCOME_CONFIG.takeoffTarget;
const P = DEFAULT_OUTCOME_CONFIG.extinctionMinPeak;
const DWELL = DEFAULT_OUTCOME_CONFIG.takeoffDwell;

// The classifier only reads time + litCount + peakLit.
function fakeMv(time: number, litCount: number, peakLit: number): Multiverse {
  return { time, litCount, peakLit } as unknown as Multiverse;
}

function run(
  c: LoveOutcomeClassifier,
  litCount: number,
  peakLit: number,
  fromTime: number,
  seconds: number,
  dt = 1 / 60,
) {
  let last = c.update(fakeMv(fromTime, litCount, peakLit), dt);
  for (let t = dt; t < seconds; t += dt) last = c.update(fakeMv(fromTime + t, litCount, peakLit), dt);
  return last;
}

describe('LoveOutcomeClassifier', () => {
  it('stays playing during warmup even at the takeoff target', () => {
    expect(new LoveOutcomeClassifier().update(fakeMv(1, T, T), 1 / 60).kind).toBe('playing');
  });

  it('wins when it goes viral and holds past the dwell', () => {
    expect(run(new LoveOutcomeClassifier(), T, T, 3, DWELL - 0.2).kind).toBe('playing');
    expect(run(new LoveOutcomeClassifier(), T, T, 3, DWELL + 0.3).kind).toBe('love_explosion');
  });

  it('loses when the chain burns out after catching', () => {
    expect(new LoveOutcomeClassifier().update(fakeMv(3, 0, P), 1 / 60).kind).toBe('entropy_collapse');
  });

  it('does not lose on a wipeout if it never really caught', () => {
    expect(new LoveOutcomeClassifier().update(fakeMv(3, 0, P - 1), 1 / 60).kind).toBe('playing');
  });

  it('freezes on resolve and returns to playing after reset', () => {
    const c = new LoveOutcomeClassifier();
    expect(run(c, T, T, 3, DWELL + 0.3).kind).toBe('love_explosion');
    expect(c.update(fakeMv(9, 0, P), 1 / 60).kind).toBe('love_explosion'); // frozen
    c.reset();
    expect(c.update(fakeMv(9, 0, 0), 1 / 60).kind).toBe('playing');
  });

  it('tracks peak progress toward takeoff', () => {
    const c = new LoveOutcomeClassifier();
    c.update(fakeMv(3, Math.floor(T / 2), Math.floor(T / 2)), 1 / 60);
    expect(c.peakLoveShare).toBeCloseTo(0.5, 1);
  });
});
