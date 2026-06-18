import { palette, rgba, blendHex } from '../theme.ts';
import { clamp } from '../utils/clamp.ts';
import type { MvNode } from '../sim/graph.ts';

// A universe, drawn as a layered radial glow. Hue + size + brightness all ride
// the love value (cold/small/dim entropy → warm/big/bright love), so the state
// of every universe reads at a glance. Near either extreme it gets a pulsing
// ring — a warning it's about to OVERFLOW. A bursting (dying) universe flares
// and fades in its burst colour.

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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawNode(ctx: CanvasRenderingContext2D, node: MvNode, time: number): void {
  // Bursting: a flash that expands and fades, in the burst's colour.
  if (node.dying) {
    const t = clamp(node.dieT, 0, 1);
    const primary = node.burstLove ? palette.loveBright : palette.entropy;
    const core = node.burstLove ? palette.pearl : palette.entropyDeep;
    glow(ctx, node.x, node.y, 9 * (1 + 1.6 * t), primary, core, 0.9, 3.2, 1 - t);
    return;
  }

  const tint = blendHex(palette.entropy, palette.love, node.love);
  const core = blendHex(palette.entropyDeep, palette.loveBright, node.love);
  const tw = 0.8 + 0.2 * Math.sin(time * 2 + node.id);
  const radius = 4.5 + node.love * 4.5;
  const haloAlpha = 0.28 + 0.6 * node.love;
  const haloFactor = 1.7 + 1.5 * node.love;
  glow(ctx, node.x, node.y, radius, tint, core, haloAlpha, haloFactor, 0.85 * tw);

  // Warning rings: about to overflow into darkness (cold) or joy (warm).
  if (node.love <= 0.22) {
    const danger = 1 - node.love / 0.22;
    const pulse = 0.5 + 0.5 * Math.sin(time * 7 + node.id);
    ring(ctx, node.x, node.y, radius + 5, palette.entropy, (0.15 + 0.5 * danger) * pulse);
  } else if (node.love >= 0.8) {
    const ready = (node.love - 0.8) / 0.2;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5 + node.id);
    ring(ctx, node.x, node.y, radius + 6, palette.loveBright, (0.2 + 0.55 * ready) * pulse);
  }
}
