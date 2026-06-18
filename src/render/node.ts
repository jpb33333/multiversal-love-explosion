import { palette, rgba, blendHex } from '../theme.ts';
import type { MvNode } from '../sim/graph.ts';

// A universe. Dormant ones are faint waiting specks; lit ones glow warm, sized
// and brightened by their love signal (so a fresh spark blazes and a fading one
// dims). A just-ignited universe pops (flash); a fading one wears a pulsing ring
// — click it before it goes dark.

const TAU = Math.PI * 2;

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  primary: string,
  core: string,
  haloAlpha: number,
  haloFactor: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const haloR = radius * haloFactor;
  const halo = ctx.createRadialGradient(x, y, radius * 0.4, x, y, haloR);
  halo.addColorStop(0, rgba(primary, haloAlpha * 0.7 * alpha));
  halo.addColorStop(0.45, rgba(primary, haloAlpha * 0.22 * alpha));
  halo.addColorStop(1, rgba(primary, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, haloR, 0, TAU);
  ctx.fill();
  const body = ctx.createRadialGradient(x, y, 0.5, x, y, radius);
  body.addColorStop(0, rgba(core, 0.95 * alpha));
  body.addColorStop(0.4, rgba(primary, 0.9 * alpha));
  body.addColorStop(1, rgba(primary, 0));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawNode(ctx: CanvasRenderingContext2D, node: MvNode, time: number): void {
  if (node.state === 'dormant') {
    // Faint pearl-mist specks — visible enough to aim a click at.
    glow(ctx, node.x, node.y, 4, palette.mist, palette.pearl, 0.32, 1.7, 0.62);
    return;
  }

  const s = node.signal;
  const f = node.flash;
  const radius = 5 + s * 5 + f * 5;
  const core = blendHex(palette.love, palette.loveBright, s);
  glow(ctx, node.x, node.y, radius, palette.love, core, 0.4 + 0.5 * s + 0.4 * f, 2.0 + 1.6 * s, 0.6 + 0.4 * s);

  // Fading: a pulsing warm ring — click it before the love dies.
  if (s < 0.4) {
    const danger = 1 - s / 0.4;
    const pulse = 0.5 + 0.5 * Math.sin(time * 8 + node.id);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(palette.loveBright, (0.15 + 0.5 * danger) * pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
