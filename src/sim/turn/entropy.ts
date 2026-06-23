// The onslaught — the game's turn. Draw E couples from the entropy deck; each
// loses a love. A couple drawn while already cold (0) OUTBREAKS: the cold spills
// one step into its LIVING neighbours (each loses a love) and the collapse track
// rises one toward heat death. Already-cold neighbours are inert — the cold
// advances a ring at a time rather than detonating a whole dead stretch at once,
// so collapse climbs steadily and a fraying line can still be repaired. Each
// universe outbreaks at most once per phase. Then the drawn couples are
// reshuffled back on top ("intensify") so recently-hit love stays in danger.
// Havens are immune. Pure and deterministic (rng from the cosmos). No rendering.

import type { Cosmos } from './Cosmos.ts';
import { ENTROPY } from './constants.ts';
import { shuffle } from '../rng.ts';

export interface EntropyResult {
  drawn: number[]; // couples the deck dealt this phase
  outbreaks: number[]; // universes that outbroke (cold spilling out)
  loveLost: number; // total love cubes removed
  deaths: number; // couples that went cold (love 1 -> 0) this phase
}

// Couples hit per round: rises with the round, capped.
export function entropyDraws(round: number): number {
  return Math.min(ENTROPY.MAX_DRAWS, ENTROPY.BASE_DRAWS + Math.floor((round - 1) / ENTROPY.RAMP_EVERY));
}

export function runEntropyPhase(c: Cosmos): EntropyResult {
  const draws = entropyDraws(c.round);
  const drawn: number[] = [];
  for (let i = 0; i < draws && c.entropyDeck.length > 0; i++) {
    const id = c.entropyDeck.shift();
    if (id !== undefined) drawn.push(id);
  }

  const outbroken = new Set<number>();
  const outbreaks: number[] = [];
  let loveLost = 0;
  let deaths = 0;

  const chill = (id: number): void => {
    const u = c.universes.get(id);
    if (!u || u.kind === 'haven') return;
    if (u.love >= 1) {
      u.love -= 1;
      loveLost += 1;
      if (u.love === 0) deaths += 1;
    } else {
      outbreak(id);
    }
  };

  function outbreak(id: number): void {
    const u = c.universes.get(id);
    if (!u || u.kind === 'haven' || outbroken.has(id)) return;
    outbroken.add(id);
    c.collapse += 1;
    outbreaks.push(id);
    // Cold spills ONE step, into living neighbours only — no runaway recursion
    // through already-dead stretches or empty unreached space.
    for (const nb of u.neighbors) {
      const n = c.universes.get(nb);
      if (!n || n.kind === 'haven' || n.love < 1) continue;
      n.love -= 1;
      loveLost += 1;
      if (n.love === 0) deaths += 1;
    }
  }

  for (const id of drawn) chill(id);

  // Intensify: recently-hit couples bubble back to the top of the deck.
  shuffle(drawn, c.rng);
  for (let i = drawn.length - 1; i >= 0; i--) c.entropyDeck.unshift(drawn[i]);

  return { drawn, outbreaks, loveLost, deaths };
}
