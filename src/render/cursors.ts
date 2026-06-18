import { palette, rgba, fonts, cpx } from '../theme.ts';

// The two players' cursors + onboarding highlight. P1 is a rose ring tracking
// the pointer; P2 is a gold dashed ring rotating around its selected universe.

const TAU = Math.PI * 2;

export function drawPointerCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  ctx.save();
  const r = 12 + 1.5 * Math.sin(time * 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(palette.player1, 0.8);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = rgba(palette.player1, 0.9);
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

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

// A soft ring around the universe the pointer is about to ignite.
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
  ctx.arc(x, y, 13, 0, TAU);
  ctx.stroke();
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
  ctx.arc(x, y, 20 + 6 * pulse, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// A small label under a cursor (used for the P2 ring).
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
