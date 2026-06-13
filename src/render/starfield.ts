import { palette, rgba } from '../theme.ts';
import { mulberry32 } from '../sim/rng.ts';

// A sparse, slow-twinkling backdrop — the deep void behind the living graph.
// Positions are normalized [0,1] and scaled to the viewport at draw time, so the
// field is full-bleed and reflows on resize without reshuffling. Deterministic
// seed → the void feels like a real place. (Adapted from BW; warm/cool tint.)

export interface StarSpec {
  x: number;
  y: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  warmth: number; // 0 = mist (cool), 1 = love (warm)
}

export const STAR_DENSITY = 130 / (1280 * 800);

export function starCountForViewport(cssW: number, cssH: number): number {
  return Math.min(560, Math.max(60, Math.round(STAR_DENSITY * cssW * cssH)));
}

export function generateStarfield(count = 130, seed = 0xb1bb1e): StarSpec[] {
  const rng = mulberry32(seed);
  const stars: StarSpec[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng(),
      y: rng(),
      baseAlpha: 0.12 + rng() * 0.4,
      twinkleSpeed: 0.4 + rng() * 1.0,
      twinklePhase: rng() * Math.PI * 2,
      warmth: rng(),
    });
  }
  return stars;
}

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  stars: readonly StarSpec[],
  time: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(s.twinklePhase + time * s.twinkleSpeed);
    const a = s.baseAlpha * twinkle;
    const color = s.warmth < 0.5 ? palette.mist : palette.love;
    ctx.fillStyle = rgba(color, a);
    ctx.beginPath();
    ctx.arc(s.x * width, s.y * height, 0.7 + 0.9 * twinkle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
