import { palette, rgba, blendHex } from '../theme.ts';
import type { Universe } from '../sim/turn/types.ts';
import { LOVE } from '../sim/turn/constants.ts';

// One universe on the oval. Havens are steady warm cores; a loved couple glows,
// sized and brightened by how much love it stockpiles; a cold couple is dim — a
// dead ember if it once held love, a faint speck if the frontier never reached
// it. The Far Shore is a distinct beacon you race toward. Placeable universes
// wear an inviting ring so the player can see where love can go next. Drawn in
// world space (the renderer sets the camera transform); no text, so no cpx.

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

// The Far Shore — a landmark. A soft bloom plus a slow rotating sparkle; pale
// lilac while distant, warming to gold-cream once love arrives.
function drawBeacon(ctx: CanvasRenderingContext2D, u: Universe, time: number): void {
  const reached = u.love >= 1;
  const primary = reached ? palette.loveBright : palette.locked;
  glow(ctx, u.x, u.y, reached ? 15 : 11, primary, palette.pearl, 0.6, 2.6, reached ? 1 : 0.85);

  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.rotate(time * 0.6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(primary, 0.7);
  ctx.lineWidth = 2;
  const points = 4;
  const rOuter = 24;
  const rInner = 8;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (i / (points * 2)) * TAU;
    const r = i % 2 === 0 ? rOuter : rInner;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawUniverse(
  ctx: CanvasRenderingContext2D,
  u: Universe,
  time: number,
  placeable: boolean,
): void {
  if (u.kind === 'goal') {
    drawBeacon(ctx, u, time);
  } else if (u.kind === 'haven') {
    // The warm core — always full of love, a steady bright bloom.
    glow(ctx, u.x, u.y, 11, palette.love, palette.loveBright, 0.6, 2.4, 1);
  } else if (u.love >= 1) {
    const loveFrac = u.love / LOVE.CAP;
    const radius = 5 + loveFrac * 6;
    const core = blendHex(palette.love, palette.loveBright, loveFrac);
    glow(
      ctx,
      u.x,
      u.y,
      radius,
      palette.love,
      core,
      0.4 + 0.5 * loveFrac,
      2.0 + 1.4 * loveFrac,
      0.7 + 0.3 * loveFrac,
    );
  } else if (u.everLoved) {
    // A couple that went cold — a dead ember.
    glow(ctx, u.x, u.y, 4, palette.entropy, palette.entropyDeep, 0.3, 1.6, 0.55);
  } else {
    // Unreached cold space — a faint speck to aim a placement at.
    glow(ctx, u.x, u.y, 4, palette.potential, palette.mist, 0.26, 1.6, 0.42);
  }

  if (placeable) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4 + u.id);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(palette.loveBright, 0.2 + 0.35 * pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(u.x, u.y, 13, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
