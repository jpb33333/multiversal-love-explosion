// Supply routes — the heart of the player's turn. Love can only be placed where
// it can be *supplied*: on the haven-connected network (a chain of living
// couples tracing back to a haven), or one hop past its edge to extend the line.
// A cluster severed from every haven by the cold can no longer be resupplied —
// it's stranded behind the frontier — which is exactly the pressure to never let
// the line break. Pure: no rendering.

import type { Cosmos } from './Cosmos.ts';
import { LOVE } from './constants.ts';

// Every universe reachable from a haven through universes that currently hold
// love (havens included — they're always loved).
export function havenConnectedLoved(c: Cosmos): Set<number> {
  const set = new Set<number>(c.havenIds);
  const stack = [...c.havenIds];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    const u = c.universes.get(id);
    if (!u) continue;
    for (const nb of u.neighbors) {
      if (set.has(nb)) continue;
      const n = c.universes.get(nb);
      if (n && n.love >= 1) {
        set.add(nb);
        stack.push(nb);
      }
    }
  }
  return set;
}

// The universes you may drop love on, given a supply network `connected`: any
// non-haven on it with room to stockpile (top-up), or any neighbour of it
// (extend the line one hop). The Cosmos passes a snapshot taken at the start of
// the turn, so the line grows by one layer per round — you can't sprint a thread
// across the map in a single turn.
export function placeableFrom(c: Cosmos, connected: Set<number>): Set<number> {
  const out = new Set<number>();
  const consider = (id: number): void => {
    const u = c.universes.get(id);
    if (u && u.kind !== 'haven' && u.love < LOVE.CAP) out.add(id);
  };
  for (const id of connected) consider(id); // top-ups
  for (const id of connected) {
    const u = c.universes.get(id);
    if (!u) continue;
    for (const nb of u.neighbors) if (!connected.has(nb)) consider(nb); // extensions
  }
  return out;
}

// Convenience: placeable against the live network right now (used in tests and
// for render previews).
export function placeableSet(c: Cosmos): Set<number> {
  return placeableFrom(c, havenConnectedLoved(c));
}
