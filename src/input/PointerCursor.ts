// Player 1 — pointer. A passive holder of the cursor position; the Game decides
// what a click ignites. (Clicks are discrete events the Game handles directly.)

export class PointerCursor {
  pos: { x: number; y: number } | null = null;

  setPos(p: { x: number; y: number } | null): void {
    this.pos = p;
  }
}
