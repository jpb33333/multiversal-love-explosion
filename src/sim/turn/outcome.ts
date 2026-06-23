// Win/lose. WIN when love reaches the Far Shore by a LIVING line — the goal must
// hold love AND trace back to a haven through an unbroken chain of couples (not a
// thread entropy has since severed). LOSE when the collapse track fills: too many
// outbreaks, heat death wins. Checked after a placement (win) and after the
// onslaught (loss). Pure.

import type { Cosmos } from './Cosmos.ts';
import { COLLAPSE } from './constants.ts';
import { havenConnectedLoved } from './supply.ts';

export type TurnOutcomeKind = 'playing' | 'love_reaches_shore' | 'heat_death';

export function classify(c: Cosmos): TurnOutcomeKind {
  if (havenConnectedLoved(c).has(c.goalId)) return 'love_reaches_shore';
  if (c.collapse >= COLLAPSE.MAX) return 'heat_death';
  return 'playing';
}
