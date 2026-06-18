import { palette, rgba, fonts, cpx } from '../theme.ts';

// The two players' cursors + the bond beam. P1 is a rose ring that tracks the
// pointer; P2 is a gold dashed ring that rotates around its selected universe.
// All procedural; the caller sets the coordinate space (P1 in design space, the
// node rings in world/camera space).

const TAU = Math.PI * 2;

export function drawPointerCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  held: boolean,
  time: number,
): void {
  ctx.save();
  const r = held ? 15 + 2 * Math.sin(time * 12) : 13;
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(palette.player1, held ? 0.95 : 0.65);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = rgba(palette.player1, 0.9);
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A rotating dashed ring marking the P2 keyboard selection.
export function drawSelectionRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 1.4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(palette.player2, 0.9);
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// A soft ring around the node a player is currently pouring love into.
export function drawTargetRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// A rose beam from the P1 cursor to the universe it's filling — makes "I'm
// loving THIS one" unmistakable.
export function drawLoveBeam(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  time: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.6 + 0.4 * Math.sin(time * 10);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(palette.love, 0.5 * pulse);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.fillStyle = rgba(palette.loveBright, 0.5 * pulse);
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// A big friendly pulsing ring the onboarding uses to say "start here".
export function drawCoachHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.strokeStyle = rgba(palette.pearl, 0.4 + 0.4 * pulse);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 22 + 6 * pulse, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// A small label under a cursor (used for the P2 ring so a second player knows
// which one is theirs).
export function drawCursorLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = rgba(color, 0.85);
  ctx.font = `600 ${cpx(12)}px ${fonts.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y + 18);
  ctx.restore();
}
