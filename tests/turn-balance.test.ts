import { describe, it, expect } from 'vitest';
import { Cosmos } from '../src/sim/turn/Cosmos.ts';
import { havenConnectedLoved } from '../src/sim/turn/supply.ts';
import { GOAL, COLLAPSE } from '../src/sim/turn/constants.ts';

// An auto-player that, each round, spends its love budget by a simple score:
// push toward the Far Shore, but reinforce at-risk couples (love 1) so the line
// doesn't get severed behind it. Different weights = different play styles.
interface Weights {
  risk: number; // bonus for topping up an at-risk (love-1) couple
  extend: number; // bonus for lighting fresh ground toward the goal
}

function autoPlay(seed: number, w: Weights, maxRounds = 80) {
  const c = Cosmos.create(seed);
  const goal = c.get(c.goalId)!;
  while (c.outcome() === 'playing' && c.round <= maxRounds) {
    let guard = 0;
    while (c.budget > 0 && guard++ < 300) {
      const set = c.placeable();
      if (set.size === 0) break;
      let best = -1;
      let bestScore = -Infinity;
      for (const id of set) {
        const u = c.get(id)!;
        let score = -Math.hypot(u.x - goal.x, u.y - goal.y);
        if (id === c.goalId) score += 1e7;
        else if (u.love >= 1) score += u.love === 1 ? w.risk : w.risk * 0.3;
        else score += w.extend;
        if (score > bestScore) {
          bestScore = score;
          best = id;
        }
      }
      if (best < 0 || !c.place(best)) break;
      if (c.outcome() !== 'playing') break;
    }
    if (c.outcome() !== 'playing') break;
    c.endTurn();
  }
  return {
    outcome: c.outcome(),
    round: c.round,
    collapse: c.collapse,
    living: c.livingCount(),
    peakRing: c.peakRing,
    nodes: c.universes.size,
  };
}

// The turtle: each round, fully reinforce the living line (top at-risk couples to
// a 2-buffer, trunk first) BEFORE pushing. It over-defends and barely advances —
// a deliberately cautious style, to confirm that hoarding doesn't win (the
// frontier always grows; you must push out, not just hold).
function turtlePlay(seed: number, maxRounds = 80) {
  const c = Cosmos.create(seed);
  const goal = c.get(c.goalId)!;
  const distToGoal = (id: number): number => {
    const u = c.get(id)!;
    return Math.hypot(u.x - goal.x, u.y - goal.y);
  };
  while (c.outcome() === 'playing' && c.round <= maxRounds) {
    // reinforce: at-risk couples on the line, nearest the core (trunk) first
    const atRisk = [...havenConnectedLoved(c)]
      .map(id => c.get(id)!)
      .filter(u => u.kind !== 'haven' && u.love === 1)
      .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    for (const u of atRisk) {
      if (c.budget <= 0) break;
      if (c.placeable().has(u.id)) c.place(u.id);
    }
    // push: extend toward the goal (taking the win if the goal is reachable)
    let guard = 0;
    while (c.budget > 0 && guard++ < 300) {
      const set = c.placeable();
      if (set.has(c.goalId)) {
        c.place(c.goalId);
        break;
      }
      let best = -1;
      let bd = Infinity;
      for (const id of set) {
        if (c.get(id)!.love > 0) continue; // fresh ground only, this pass
        const d = distToGoal(id);
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
      if (best < 0) {
        for (const id of set) {
          const d = distToGoal(id);
          if (d < bd) {
            bd = d;
            best = id;
          }
        }
      }
      if (best < 0 || !c.place(best)) break;
      if (c.outcome() !== 'playing') break;
    }
    if (c.outcome() !== 'playing') break;
    c.endTurn();
  }
  return { outcome: c.outcome(), round: c.round, collapse: c.collapse, peakRing: c.peakRing };
}

describe('turn balance probe', () => {
  it('difficulty curve across play styles and seeds', () => {
    const styles: Array<[string, Weights]> = [
      ['rush    ', { risk: 0, extend: 0 }],
      ['balanced', { risk: 320, extend: 90 }],
      ['defensive', { risk: 640, extend: 40 }],
    ];
    console.log(`\n  goal ring=${GOAL.RING}  collapse cap=${COLLAPSE.MAX}`);
    for (const [name, w] of styles) {
      const rows = [1, 2, 3, 4].map(s => autoPlay(s, w));
      const wins = rows.filter(r => r.outcome === 'love_reaches_shore').length;
      const summary = rows
        .map(r => `${r.outcome === 'love_reaches_shore' ? 'WIN' : r.outcome === 'heat_death' ? 'die' : 'run'}@r${r.round}(pk${r.peakRing},cl${r.collapse})`)
        .join('  ');
      console.log(`  ${name}: ${wins}/4 win  | ${summary}`);
    }
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const turtle = seeds.map(s => turtlePlay(s));
    const turtleWins = turtle.filter(r => r.outcome === 'love_reaches_shore').length;
    console.log(
      `  turtle  : ${turtleWins}/${seeds.length} win  | ${turtle.map(r => (r.outcome === 'love_reaches_shore' ? `W${r.round}` : `d${r.round}`)).join(' ')}`,
    );
    expect(true).toBe(true);
  });
});
