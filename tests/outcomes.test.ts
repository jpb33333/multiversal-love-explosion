import { describe, it, expect } from 'vitest';
import { LoveOutcomeClassifier } from '../src/game/outcomes.ts';
import type { Multiverse, Tally } from '../src/sim/Multiverse.ts';

const ZERO: Tally = {
  nodeCount: 0,
  potentialCount: 0,
  lovingCount: 0,
  unlovingCount: 0,
  lockedCount: 0,
  lovePower: 0,
  entropyPower: 0,
  bankedLove: 0,
  loveShare: 0.5,
};

// Minimal stand-in for a Multiverse: the classifier only reads `time` and
// `tally()`. Casting through unknown is intentional and documented.
function fakeMv(time: number, tally: Partial<Tally>): Multiverse {
  return { time, tally: () => ({ ...ZERO, ...tally }) } as unknown as Multiverse;
}

function run(
  c: LoveOutcomeClassifier,
  tally: Partial<Tally>,
  fromTime: number,
  seconds: number,
  dt = 1 / 60,
) {
  let last = c.update(fakeMv(fromTime, tally), dt);
  for (let t = dt; t < seconds; t += dt) last = c.update(fakeMv(fromTime + t, tally), dt);
  return last;
}

describe('LoveOutcomeClassifier', () => {
  it('never resolves during warmup, even with winning numbers', () => {
    const c = new LoveOutcomeClassifier();
    const win = { loveShare: 0.95, bankedLove: 100, lovingCount: 50 };
    expect(run(c, win, 0, 1.0).kind).toBe('playing'); // still inside warmup
  });

  it('declares love_explosion when love dominates and is banked, sustained past the dwell', () => {
    const win = { loveShare: 0.95, bankedLove: 100, lovingCount: 50 };
    const c = new LoveOutcomeClassifier();
    expect(run(c, win, 2.0, 2.5).kind).toBe('playing'); // not yet (dwell is 3s)
    const c2 = new LoveOutcomeClassifier();
    expect(run(c2, win, 2.0, 3.3).kind).toBe('love_explosion');
  });

  it('does not win on a banked-but-not-dominant or dominant-but-unbanked lead', () => {
    const dominantUnbanked = { loveShare: 0.95, bankedLove: 0, lovingCount: 9, lovePower: 9 };
    const c = new LoveOutcomeClassifier();
    expect(run(c, dominantUnbanked, 2.0, 5.0).kind).toBe('playing');
  });

  it('declares entropy_collapse when entropy dominates the field, sustained', () => {
    const lose = { loveShare: 0.1, unlovingCount: 30, entropyPower: 27 };
    const c = new LoveOutcomeClassifier();
    expect(run(c, lose, 2.0, 3.5).kind).toBe('playing'); // dwell is 4s
    const c2 = new LoveOutcomeClassifier();
    expect(run(c2, lose, 2.0, 4.3).kind).toBe('entropy_collapse');
  });

  it('declares entropy_collapse on a wipeout — but only once love has existed', () => {
    // never had love + a balanced field → stays playing (no false wipeout at start)
    const c = new LoveOutcomeClassifier();
    expect(run(c, { loveShare: 0.5, lovingCount: 0, bankedLove: 0 }, 2.0, 3.0).kind).toBe('playing');

    // love existed, then is extinguished with a balanced field → wipeout loss
    const c2 = new LoveOutcomeClassifier();
    c2.update(fakeMv(2.1, { loveShare: 0.6, lovingCount: 5, lovePower: 4 }), 1 / 60);
    expect(run(c2, { loveShare: 0.5, lovingCount: 0, bankedLove: 0 }, 2.2, 2.3).kind).toBe(
      'entropy_collapse',
    );
  });

  it('freezes on resolution and returns to playing after reset', () => {
    const win = { loveShare: 0.95, bankedLove: 100, lovingCount: 50 };
    const c = new LoveOutcomeClassifier();
    expect(run(c, win, 2.0, 3.3).kind).toBe('love_explosion');
    // a catastrophic later frame doesn't un-win it
    expect(c.update(fakeMv(99, { loveShare: 0, lovingCount: 0 }), 1 / 60).kind).toBe(
      'love_explosion',
    );
    c.reset();
    expect(c.update(fakeMv(99, { loveShare: 0, lovingCount: 0 }), 1 / 60).kind).toBe('playing');
  });
});
