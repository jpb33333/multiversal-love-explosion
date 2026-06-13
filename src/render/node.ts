import { palette, rgba, blendHex } from '../theme.ts';
import { clamp } from '../utils/clamp.ts';
import { LOCK } from '../sim/constants.ts';
import type { MvNode } from '../sim/graph.ts';

// A universe node, drawn as a layered radial glow (the painterly star technique
// from BW's star.ts). Hue rides the love↔entropy axis via blendHex, so contagion
// reads as a shift from cold violet-grey toward warm rose — not just brightness.

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
  const tint = blendHex(palette.entropy, palette.love, node.love);
  switch (node.state) {
    case 'potential': {
      const tw = 0.65 + 0.35 * Math.sin(time * 2 + node.id);
      const core = blendHex(palette.entropy, palette.loveBright, node.love);
      glow(ctx, node.x, node.y, 5.5, tint, core, 0.45, 1.9, 0.7 * tw);
      break;
    }
    case 'loving': {
      const tw = 0.85 + 0.15 * Math.sin(time * 3 + node.id);
      glow(ctx, node.x, node.y, 8, palette.love, palette.loveBright, 0.85, 2.9, tw);
      break;
    }
    case 'unloving': {
      glow(ctx, node.x, node.y, 4.5, palette.entropy, palette.entropyDeep, 0.3, 1.5, 0.85);
      break;
    }
    case 'locked': {
      // Crystallize: bloom outward, then fade to the background constellation.
      const fade = clamp((time - node.lockedAt) / LOCK.FADE_SECONDS, 0, 1);
      const bloom = 1 + 0.7 * Math.sin(fade * Math.PI);
      glow(ctx, node.x, node.y, 9 * bloom, palette.locked, palette.pearl, 0.9, 3.4, 1 - fade);
      break;
    }
  }
}
