// Player 1 — pointer / touch. A passive control in BW's style: it holds only
// position and held-state; the Game owns every event binding and decides what
// node the pointer is over (it needs the camera offset for that). No events.

export class PointerCursor {
  pos: { x: number; y: number } | null = null;
  held = false;

  setPos(p: { x: number; y: number } | null): void {
    this.pos = p;
  }

  press(): void {
    this.held = true;
  }

  release(): void {
    this.held = false;
  }
}
