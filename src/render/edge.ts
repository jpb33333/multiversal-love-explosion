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
  time: number,
): void {
  const color = blendHex(palette.entropy, palette.love, avgLove);
  const alpha = 0.04 + 0.4 * avgLove * avgLove; // loving edges pop, entropy fades
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 0.5 + 1.6 * avgLove;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  // A bright pulse flows along loving edges — love spreading, made visible.
  if (avgLove > 0.55) {
    ctx.save();
    ctx.strokeStyle = rgba(palette.loveBright, (0.3 * (avgLove - 0.55)) / 0.45);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 15]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
  }
}
