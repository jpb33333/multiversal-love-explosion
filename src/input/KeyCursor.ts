// Player 2 — keyboard. A passive control: it tracks which movement keys are
// held and whether the nurture key is down, and resolves a "hop" to a
// neighboring universe on an interval (so a held arrow steps node-to-node
// instead of blurring). The Game owns the listeners and calls step() each frame.

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
const NURTURE_KEYS = new Set(['Space']); // ENTER is now P2's connect key

export class KeyCursor {
  selectedId: number | null = null;
  linkFromId: number | null = null; // universe P2 grabbed as a link source
  private held = new Set<string>();
  private nurtureHeld = false;
  private hopCd = 0;
  private everPressed = false; // P2 only "exists" once they press a key
  private pendingLink: { from: number; to: number } | null = null;

  // Returns true if the key is one we handle (so the Game can preventDefault and
  // stop the page from scrolling on arrows/space).
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
    if (code === 'Enter') {
      this.everPressed = true;
      this.handleConnectKey();
      return true;
    }
    return false;
  }

  // Player 2's connect: ENTER on a universe grabs it as a link source; ENTER on
  // another links them; ENTER on the same one cancels.
  private handleConnectKey(): void {
    if (this.selectedId === null) return;
    if (this.linkFromId === null) {
      this.linkFromId = this.selectedId;
    } else if (this.linkFromId !== this.selectedId) {
      this.pendingLink = { from: this.linkFromId, to: this.selectedId };
      this.linkFromId = null;
    } else {
      this.linkFromId = null;
    }
  }

  // The Game polls this and performs the actual connection.
  consumeLink(): { from: number; to: number } | null {
    const l = this.pendingLink;
    this.pendingLink = null;
    return l;
  }

  onKeyUp(code: string): void {
    if (code in MOVE_KEYS) this.held.delete(code);
    else if (NURTURE_KEYS.has(code)) this.nurtureHeld = false;
  }

  get nurturing(): boolean {
    return this.nurtureHeld;
  }

  // True once Player 2 has touched the keyboard — gates their cursor + the bond.
  get active(): boolean {
    return this.everPressed;
  }

  // Resolve hop intent on an interval, and keep a valid selection.
  step(mv: Multiverse, dt: number): void {
    if (!this.everPressed) return; // P2 hasn't joined — no cursor, no auto-grab
    if (this.selectedId !== null && !mv.graph.has(this.selectedId)) this.selectedId = null;
    if (this.linkFromId !== null && !mv.graph.has(this.linkFromId)) this.linkFromId = null;

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

    // Grab the nearest universe to the cluster centre if nothing is selected.
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
    this.linkFromId = null;
    this.pendingLink = null;
    this.everPressed = false;
  }
}
