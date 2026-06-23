// A single universe on the expanding oval. It holds LOVE (supply cubes): with
// love >= 1 it's a living couple, at 0 it has gone cold. Havens are the warm
// core that never dies (your supply origin); the goal is the Far Shore we race
// to reach. `everLoved` gates the entropy deck — entropy only hunts couples that
// have actually existed, never the empty cold of unreached space. Pure data.

export type UniverseKind = 'normal' | 'haven' | 'goal';

export interface Universe {
  id: number;
  x: number;
  y: number;
  love: number; // 0..LOVE.CAP supply cubes
  kind: UniverseKind;
  ring: number; // expansion ring: 0 = warm core (havens), higher = colder frontier
  neighbors: number[]; // ids of wired universes
  everLoved: boolean; // has it ever held love? only then can entropy draw it
}

export function makeUniverse(
  id: number,
  x: number,
  y: number,
  ring: number,
  kind: UniverseKind = 'normal',
): Universe {
  return { id, x, y, love: 0, kind, ring, neighbors: [], everLoved: false };
}
