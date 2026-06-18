// Player 2 — keyboard. A passive control: it tracks which movement keys are
// held and whether the pour key (Space) is down, and hops to a neighbouring
// universe on an interval. The Game owns the listeners and calls step() each
// frame, then pours love into the selected universe while Space is held.

import type { Multiverse } from '../sim/Multiverse.ts';
import { LIMITS } from '../game/states.ts';

const MOVE_KEYS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};
const NURTURE_KEYS = new Set(['Space']);

export class KeyCursor {
  selectedId: number | null = null;
  private held = new Set<string>();
  private nurtureHeld = false;
  private hopCd = 0;
  private everPressed = false; // P2 only "exists" once they press a key

  onKeyDown(code: string): boolean {
    if (code in MOVE_KEYS) {
      this.held.add(code);
      this.everPressed = true;
      return true;
    }
    if (NURTURE_KEYS.has(code)) {
      this.nurtureHeld = true;
      this.everPressed = true;
      return true;
    }
    return false;
  }

  onKeyUp(code: string): void {
    if (code in MOVE_KEYS) this.held.delete(code);
    else if (NURTURE_KEYS.has(code)) this.nurtureHeld = false;
  }

  get nurturing(): boolean {
    return this.nurtureHeld;
  }

  get active(): boolean {
    return this.everPressed;
  }

  step(mv: Multiverse, dt: number): void {
    if (!this.everPressed) return;
    // Drop a selection that has been culled or is bursting.
    if (this.selectedId !== null) {
      const sel = mv.graph.get(this.selectedId);
      if (!sel || sel.dying) this.selectedId = null;
    }

    if (this.hopCd > 0) this.hopCd -= dt;
    let dx = 0;
    let dy = 0;
    for (const k of this.held) {
      const d = MOVE_KEYS[k];
      dx += d.x;
      dy += d.y;
    }
    if ((dx !== 0 || dy !== 0) && this.hopCd <= 0) {
      const next = mv.neighborsByDirection(this.selectedId, { x: dx, y: dy });
      if (next !== null) this.selectedId = next;
      this.hopCd = LIMITS.keyHopCooldown;
    }

    if (this.selectedId === null) {
      const c = mv.centroid();
      if (c) this.selectedId = mv.nearestNode(c, 1e9);
    }
  }

  reset(): void {
    this.held.clear();
    this.nurtureHeld = false;
    this.hopCd = 0;
    this.selectedId = null;
    this.everPressed = false;
  }
}
