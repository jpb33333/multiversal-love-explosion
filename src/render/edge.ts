import { palette, rgba, blendHex } from '../theme.ts';

// One connection between universes. Loving edges glow warm and bright; entropy
// edges recede to a cold thread — so the network's mood is legible at a glance.
// Drawn under an additive ('lighter') pass set by the caller.

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  avgLove: number,
): void {
  const color = blendHex(palette.entropy, palette.love, avgLove);
  const alpha = 0.04 + 0.4 * avgLove * avgLove; // loving edges pop, entropy fades
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 0.5 + 1.6 * avgLove;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}
