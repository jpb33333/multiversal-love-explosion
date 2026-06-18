import { palette, rgba, fonts, cpx, lineHeightFor } from '../theme.ts';
import { clamp } from '../utils/clamp.ts';

// HUD + screen furniture, all in design space: buttons, wordmark, the "going
// viral" progress bar, the how-to + result cards, and the coach banner.

export interface CanvasButton {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  b: CanvasButton,
  opts: { primary: string; hovered: boolean },
): void {
  ctx.save();
  roundRectPath(ctx, b.x, b.y, b.width, b.height, Math.min(12, b.height / 2));
  ctx.fillStyle = rgba(opts.primary, opts.hovered ? 0.22 : 0.1);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(opts.primary, opts.hovered ? 1 : 0.8);
  ctx.stroke();
  ctx.fillStyle = rgba(opts.primary, opts.hovered ? 1 : 0.92);
  ctx.font = `600 ${cpx(17)}px ${fonts.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.width / 2, b.y + b.height / 2);
  ctx.restore();
}

export function drawWordmark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.pearl;
  ctx.font = `400 ${cpx(58)}px ${fonts.serif}`;
  ctx.fillText('Multiversal', w / 2, h * 0.28);
  ctx.fillStyle = palette.love;
  ctx.font = `400 ${cpx(64)}px ${fonts.serif}`;
  ctx.fillText('Love Explosion', w / 2, h * 0.28 + cpx(66));
  ctx.fillStyle = rgba(palette.mist, 0.78);
  ctx.font = `italic 400 ${cpx(18)}px ${fonts.serif}`;
  ctx.fillText('spread love until it goes viral', w / 2, h * 0.28 + cpx(66) + cpx(40));
  ctx.restore();
}

export function drawTitleStats(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  best: { total: number; wins: number; bestScore: number | null },
): void {
  if (best.total === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = rgba(palette.mist, 0.6);
  ctx.font = `400 ${cpx(13)}px ${fonts.sans}`;
  const scoreTxt = best.bestScore !== null ? `best ${Math.round(best.bestScore)} lit` : '';
  const sep = scoreTxt ? '  ·  ' : '';
  ctx.fillText(`${best.wins}/${best.total} gone viral${sep}${scoreTxt}`, w / 2, h * 0.86);
  ctx.restore();
}

// The progress toward going viral: lit universes vs the takeoff target, with a
// faint marker at your peak so you can see how close you got.
export function drawSpreadBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  lit: number,
  target: number,
  peak: number,
): void {
  const bw = Math.min(440, w * 0.52);
  const x = (w - bw) / 2;
  const y = 24;
  const bh = 14;

  ctx.save();
  roundRectPath(ctx, x, y, bw, bh, bh / 2);
  ctx.fillStyle = rgba(palette.mist, 0.16);
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, y, bw, bh, bh / 2);
  ctx.clip();
  ctx.fillStyle = rgba(palette.love, 0.9);
  ctx.fillRect(x, y, bw * clamp(lit / target, 0, 1), bh);
  ctx.restore();

  // peak high-water marker
  const px = x + bw * clamp(peak / target, 0, 1);
  ctx.strokeStyle = rgba(palette.loveBright, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, y - 3);
  ctx.lineTo(px, y + bh + 3);
  ctx.stroke();

  ctx.font = `600 ${cpx(12)}px ${fonts.sans}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(palette.love, 0.95);
  ctx.fillText('GOING VIRAL', x, y + bh + cpx(13));
  ctx.textAlign = 'right';
  ctx.fillStyle = palette.pearl;
  ctx.fillText(`${lit} / ${target} lit`, x + bw, y + bh + cpx(13));
  ctx.restore();
}

export interface ResultCardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  buttonY: number;
  titleColor: string;
}

export function drawResultCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  win: boolean,
  score: number,
  peakShare: number,
): ResultCardLayout {
  const cw = Math.min(580, w * 0.74);
  const ch = 280;
  const x = (w - cw) / 2;
  const y = (h - ch) / 2;
  const titleColor = win ? palette.love : palette.entropy;

  ctx.save();
  roundRectPath(ctx, x, y, cw, ch, 18);
  ctx.fillStyle = rgba(palette.voidDeep, 0.88);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(titleColor, 0.85);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = titleColor;
  ctx.font = `400 ${cpx(42)}px ${fonts.serif}`;
  ctx.fillText(win ? 'It Went Viral!' : 'Burned Out', w / 2, y + cpx(78));

  ctx.fillStyle = rgba(palette.pearl, 0.82);
  ctx.font = `400 ${cpx(16)}px ${fonts.sans}`;
  const lh = lineHeightFor(16);
  const msg = win
    ? 'Love took off across the multiverse — self-sustaining. Together.'
    : 'The spark died before it caught. Spark a new one.';
  ctx.fillText(msg, w / 2, y + cpx(78) + lh);

  ctx.fillStyle = palette.pearl;
  ctx.font = `600 ${cpx(20)}px ${fonts.sans}`;
  ctx.fillText(
    `peak ${Math.round(score)} universes lit    ·    reached ${Math.round(peakShare * 100)}%`,
    w / 2,
    y + cpx(78) + lh + cpx(44),
  );
  ctx.restore();

  return { x, y, width: cw, height: ch, buttonY: y + ch - 66, titleColor };
}

export function drawHowtoCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cw = Math.min(700, w * 0.84);
  const ch = 360;
  const x = (w - cw) / 2;
  const y = h * 0.16;

  ctx.save();
  roundRectPath(ctx, x, y, cw, ch, 18);
  ctx.fillStyle = rgba(palette.voidDeep, 0.9);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(palette.love, 0.6);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = palette.love;
  ctx.font = `400 ${cpx(26)}px ${fonts.serif}`;
  ctx.fillText('How to play', w / 2, y + cpx(46));

  const lines = [
    'CLICK a universe to spark love into it. Love SPREADS to its neighbours —',
    'a chain reaction lighting up the network.',
    'But every lit universe FADES. Spread-born love is weak and dies fast,',
    'so you must keep CLICKING the fading ones to keep the chain alive and growing.',
    '',
    'Get enough lit AT ONCE and it goes VIRAL — self-sustaining. That wins.',
    'Fall behind and it burns out. It speeds up — you will need more hands:',
    'Player 2 on the keyboard (arrows / WASD move, SPACE sparks).',
  ];
  ctx.fillStyle = rgba(palette.pearl, 0.82);
  ctx.font = `400 ${cpx(15)}px ${fonts.sans}`;
  const lh = lineHeightFor(15);
  let ly = y + cpx(46) + lh * 1.4;
  for (const line of lines) {
    ctx.fillText(line, w / 2, ly);
    ly += lh;
  }
  ctx.restore();
}

export function drawPlayingHelp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = rgba(palette.mist, 0.4);
  ctx.font = `400 ${cpx(12)}px ${fonts.sans}`;
  ctx.fillText(
    'Click universes to spark love — keep clicking the fading ones   ·   P2: arrows + space   ·   M mutes',
    w / 2,
    h - 16,
  );
  ctx.restore();
}

export function drawCoachBanner(ctx: CanvasRenderingContext2D, w: number, text: string): void {
  ctx.save();
  ctx.font = `600 ${cpx(17)}px ${fonts.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bw = ctx.measureText(text).width + 36;
  const bh = cpx(17) + 18;
  const x = (w - bw) / 2;
  const y = 76;
  roundRectPath(ctx, x, y, bw, bh, bh / 2);
  ctx.fillStyle = rgba(palette.voidDeep, 0.72);
  ctx.fill();
  ctx.strokeStyle = rgba(palette.love, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = palette.pearl;
  ctx.fillText(text, w / 2, y + bh / 2);
  ctx.restore();
}
