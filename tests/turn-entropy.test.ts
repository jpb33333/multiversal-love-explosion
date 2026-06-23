import { describe, it, expect } from 'vitest';
import { Cosmos } from '../src/sim/turn/Cosmos.ts';
import { runEntropyPhase, entropyDraws } from '../src/sim/turn/entropy.ts';
import { ENTROPY } from '../src/sim/turn/constants.ts';

function normalNode(c: Cosmos) {
  return [...c.universes.values()].find(u => u.kind === 'normal')!;
}

describe('turn entropy onslaught', () => {
  it('draw count rises with the round, then caps', () => {
    expect(entropyDraws(1)).toBe(ENTROPY.BASE_DRAWS);
    expect(entropyDraws(1 + ENTROPY.RAMP_EVERY)).toBe(ENTROPY.BASE_DRAWS + 1);
    expect(entropyDraws(999)).toBe(ENTROPY.MAX_DRAWS);
  });

  it('a drawn couple loses one love', () => {
    const c = Cosmos.create(1);
    const a = normalNode(c);
    a.love = 2;
    a.everLoved = true;
    c.entropyDeck = [a.id];
    const res = runEntropyPhase(c);
    expect(a.love).toBe(1);
    expect(res.loveLost).toBeGreaterThanOrEqual(1);
    expect(res.outbreaks).toHaveLength(0);
  });

  it('a couple drawn while already cold outbreaks — collapse rises, cold spills', () => {
    const c = Cosmos.create(1);
    const a = normalNode(c);
    const b = c.get(a.neighbors.find(n => c.get(n)!.kind === 'normal')!)!;
    a.love = 0;
    a.everLoved = true;
    b.love = 1;
    b.everLoved = true;
    c.entropyDeck = [a.id];
    const collapse0 = c.collapse;
    const res = runEntropyPhase(c);
    expect(res.outbreaks).toContain(a.id);
    expect(c.collapse).toBe(collapse0 + 1);
    expect(b.love).toBe(0); // the cold spilled to the neighbour
  });

  it('havens are immune to the onslaught', () => {
    const c = Cosmos.create(1);
    const haven = c.get(c.havenIds[0])!;
    const love0 = haven.love;
    const collapse0 = c.collapse;
    c.entropyDeck = [haven.id];
    runEntropyPhase(c);
    expect(haven.love).toBe(love0);
    expect(c.collapse).toBe(collapse0);
  });
});
