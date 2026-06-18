// Player 2 — keyboard. A passive control: arrows/WASD hop the cursor between
// universes; Space/Enter requests an ignite (a click) at the selected universe.
// The Game owns the listeners, calls step() each frame, then consumes the
// ignite request.

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
const IGNITE_KEYS = new Set(['Space', 'Enter']);

export class KeyCursor {
  selectedId: number | null = null;
  private held = new Set<string>();
  private hopCd = 0;
  private everPressed = false;
  private wantsIgnite = false;

  onKeyDown(code: string): boolean {
    if (code in MOVE_KEYS) {
      this.held.add(code);
      this.everPressed = true;
      return true;
    }
    if (IGNITE_KEYS.has(code)) {
      this.wantsIgnite = true;
      this.everPressed = true;
      return true;
    }
    return false;
  }

  onKeyUp(code: string): void {
    if (code in MOVE_KEYS) this.held.delete(code);
  }

  get active(): boolean {
    return this.everPressed;
  }

  // True once per Space/Enter press — the Game ignites the selected universe.
  consumeIgnite(): boolean {
    const w = this.wantsIgnite;
    this.wantsIgnite = false;
    return w;
  }

  step(mv: Multiverse, dt: number): void {
    if (!this.everPressed) return;
    if (this.selectedId !== null && !mv.graph.has(this.selectedId)) this.selectedId = null;

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
    this.hopCd = 0;
    this.selectedId = null;
    this.everPressed = false;
    this.wantsIgnite = false;
  }
}
