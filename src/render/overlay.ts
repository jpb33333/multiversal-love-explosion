import { palette, rgba, fonts, cpx, lineHeightFor } from '../theme.ts';
import { clamp } from '../utils/clamp.ts';

// HUD + screen furniture, all in design space: buttons, the wordmark, the
// love-vs-entropy meter, the score, the result cards, and the how-to panel. The
// CanvasButton/drawButton pattern follows BW (the Game owns hit-testing).

export interface CanvasButton {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// roundRect by hand — no dependency on the (sometimes-missing) ctx.roundRect.
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
  ctx.fillText('for 1 or 2 players  ·  help love outshine entropy', w / 2, h * 0.28 + cpx(66) + cpx(40));
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
  const scoreTxt = best.bestScore !== null ? `best ${Math.round(best.bestScore)}` : 'no wins yet';
  ctx.fillText(`${best.wins}/${best.total} won  ·  ${scoreTxt}`, w / 2, h * 0.86);
  ctx.restore();
}

// Top love-vs-entropy meter. The fill is love's share; a tick marks the win
// threshold so players can see how close the explosion is.
export function drawMeter(
  ctx: CanvasRenderingContext2D,
  w: number,
  loveShare: number,
  winThreshold: number,
): void {
  const bw = Math.min(560, w * 0.62);
  const x = (w - bw) / 2;
  const y = 24;
  const bh = 14;

  ctx.save();
  roundRectPath(ctx, x, y, bw, bh, 7);
  ctx.fillStyle = rgba(palette.entropy, 0.32);
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, y, bw, bh, 7);
  ctx.clip();
  ctx.fillStyle = rgba(palette.love, 0.85);
  ctx.fillRect(x, y, bw * clamp(loveShare, 0, 1), bh);
  ctx.restore();

  // win-threshold tick
  const tx = x + bw * clamp(winThreshold, 0, 1);
  ctx.strokeStyle = rgba(palette.loveBright, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, y - 3);
  ctx.lineTo(tx, y + bh + 3);
  ctx.stroke();

  ctx.font = `600 ${cpx(12)}px ${fonts.sans}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(palette.love, 0.9);
  ctx.fillText('LOVE', x, y + bh + cpx(13));
  ctx.textAlign = 'right';
  ctx.fillStyle = rgba(palette.mist, 0.9);
  ctx.fillText('ENTROPY', x + bw, y + bh + cpx(13));
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.pearl;
  ctx.fillText(`${Math.round(loveShare * 100)}%`, x + bw / 2, y + bh / 2);
  ctx.restore();
}

export function drawScore(ctx: CanvasRenderingContext2D, w: number, score: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = rgba(palette.pearl, 0.85);
  ctx.font = `600 ${cpx(15)}px ${fonts.sans}`;
  ctx.fillText(`${Math.round(score)}`, w / 2, 60);
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
  ctx.fillText(win ? 'Love Explosion' : 'Entropy Collapse', w / 2, y + cpx(78));

  ctx.fillStyle = rgba(palette.pearl, 0.82);
  ctx.font = `400 ${cpx(16)}px ${fonts.sans}`;
  const lh = lineHeightFor(16);
  const msg = win
    ? 'The multiverse blooms. You did it — together.'
    : 'Entropy took this multiverse. Begin a new one.';
  ctx.fillText(msg, w / 2, y + cpx(78) + lh);

  ctx.fillStyle = palette.pearl;
  ctx.font = `600 ${cpx(20)}px ${fonts.sans}`;
  ctx.fillText(
    `score ${Math.round(score)}    ·    peak love ${Math.round(peakShare * 100)}%`,
    w / 2,
    y + cpx(78) + lh + cpx(44),
  );
  ctx.restore();

  return { x, y, width: cw, height: ch, buttonY: y + ch - 66, titleColor };
}

export function drawHowtoCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cw = Math.min(680, w * 0.82);
  const ch = 320;
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
    'YOU (mouse): move over a universe and HOLD the button to fill it with love.',
    'Love spreads to connected universes. Grow a glowing cluster and it LOCKS IN —',
    'banking love and easing the pressure. Win when the LOVE meter passes the mark.',
    'PLAYER 2 (optional, keyboard): arrow keys / WASD move a second cursor, SPACE loves.',
    'THE BOND: P1 holds + P2 loves two connected universes at once to flood and lock',
    'a whole region instantly — the late-game power move.',
    'Playable solo, unstoppable as two. It speeds up — keep love ahead of entropy.',
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

// A faint one-line control reminder at the bottom of the playing screen.
export function drawPlayingHelp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = rgba(palette.mist, 0.4);
  ctx.font = `400 ${cpx(12)}px ${fonts.sans}`;
  ctx.fillText(
    'Mouse: hold a universe to love it   ·   Player 2 (optional): arrows + space   ·   M mutes',
    w / 2,
    h - 16,
  );
  ctx.restore();
}

// A pill banner just under the meter carrying the current onboarding hint.
export function drawCoachBanner(ctx: CanvasRenderingContext2D, w: number, text: string): void {
  ctx.save();
  ctx.font = `600 ${cpx(17)}px ${fonts.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bw = ctx.measureText(text).width + 36;
  const bh = cpx(17) + 18;
  const x = (w - bw) / 2;
  const y = 80;
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
