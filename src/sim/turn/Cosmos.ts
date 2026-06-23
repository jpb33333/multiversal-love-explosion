// The Cosmos owns the network, the RNG, the clock, and the entropy deck. It runs
// the turn: the player drops love along supply routes (place), then the onslaught
// chills couples and the oval grows (endTurn). Exposes the read-only queries the
// renderer, the classifier, and the auto-player need. Imports no rendering.

import type { Universe } from './types.ts';
import { mulberry32 } from '../rng.ts';
import { HAVEN, LOVE, MAP, GOAL, ENTROPY, TURN_SIM } from './constants.ts';
import { buildWorld, expandFrontier } from './map.ts';
import { placeableFrom, havenConnectedLoved } from './supply.ts';
import { runEntropyPhase, type EntropyResult } from './entropy.ts';
import { classify, type TurnOutcomeKind } from './outcome.ts';

export class Cosmos {
  readonly universes = new Map<number, Universe>();
  havenIds: number[] = [];
  goalId = -1;
  rng: () => number;

  round = 1;
  budget: number = HAVEN.OUTPUT_PER_ROUND; // love cubes left to place this round
  collapse = 0; // outbreaks suffered — fills the heat-death track
  frontierRing: number = MAP.INITIAL_RINGS; // outermost ring spawned so far
  peakRing = 0; // furthest ring love has reached (progress / score)
  entropyDeck: number[] = []; // ids of couples the onslaught can draw
  lastEntropy: EntropyResult | null = null; // for the render to animate the onslaught

  private nextId = 1;
  private turnConnected: Set<number> = new Set(); // supply network frozen at turn start
  private candidateCache: Set<number> | null = null;

  constructor(seed: number = TURN_SIM.SEED) {
    this.rng = mulberry32(seed);
  }

  static create(seed: number = TURN_SIM.SEED): Cosmos {
    const c = new Cosmos(seed);
    buildWorld(c);
    c.refreshTurn();
    return c;
  }

  // Snapshot the living supply network for the new turn — the line you may build
  // from this round. Re-taken after each onslaught (so a severed line forces a
  // repair from whatever is still connected).
  private refreshTurn(): void {
    this.turnConnected = havenConnectedLoved(this);
    this.candidateCache = null;
  }

  allocId(): number {
    return this.nextId++;
  }

  get(id: number): Universe | undefined {
    return this.universes.get(id);
  }

  outcome(): TurnOutcomeKind {
    return classify(this);
  }

  // Universes you may drop love on this turn — extends only from the supply
  // network as it stood at the start of the turn (one layer per round).
  placeable(): Set<number> {
    if (!this.candidateCache) this.candidateCache = placeableFrom(this, this.turnConnected);
    return this.candidateCache;
  }

  livingCount(): number {
    let n = 0;
    for (const u of this.universes.values()) if (u.love >= 1) n++;
    return n;
  }

  // ── player action: drop one love on a suppliable universe ──
  place(id: number): boolean {
    if (this.budget <= 0 || this.outcome() !== 'playing') return false;
    if (!this.placeable().has(id)) return false;
    const u = this.universes.get(id);
    if (!u || u.love >= LOVE.CAP) return false;
    u.love += 1;
    this.budget -= 1;
    if (!u.everLoved) {
      u.everLoved = true;
      this.insertIntoDeck(id); // a new couple enters entropy's reach
    }
    if (u.kind !== 'goal' && u.ring > this.peakRing) this.peakRing = u.ring;
    this.candidateCache = null; // a node may have hit the cap; the base frontier holds
    return true;
  }

  private insertIntoDeck(id: number): void {
    const i = Math.floor(this.rng() * (this.entropyDeck.length + 1));
    this.entropyDeck.splice(i, 0, id);
  }

  // ── the game's turn: the onslaught, then the oval expands ──
  endTurn(): EntropyResult {
    const res = runEntropyPhase(this);
    for (let i = 0; i < ENTROPY.EXPAND_RINGS_PER_ROUND; i++) {
      if (this.frontierRing < GOAL.RING + 1) {
        this.frontierRing += 1;
        expandFrontier(this, this.frontierRing);
      }
    }
    this.round += 1;
    this.budget = HAVEN.OUTPUT_PER_ROUND;
    this.lastEntropy = res;
    this.refreshTurn();
    return res;
  }
}
