// TEMPORARY boot — paints the void + wordmark so the scaffold is verifiable end
// to end (dev server + production build). Replaced by the real Game boot (rAF
// loop + state machine + Renderer) once those land. Kept deliberately tiny.

import { palette, fonts, setViewScale, cpx } from './theme.ts';
import { computeFit } from './render/fit.ts';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context unavailable');

function draw(dpr: number, cssW: number, cssH: number): void {
  ctx!.setTransform(1, 0, 0, 1, 0, 0);
  ctx!.fillStyle = palette.voidDeep;
  ctx!.fillRect(0, 0, canvas.width, canvas.height);

  const designW = cssW >= cssH ? 1280 : 800;
  const designH = cssW >= cssH ? 800 : 1280;
  const fit = computeFit(cssW, cssH, designW, designH);
  setViewScale(fit.scale);

  ctx!.setTransform(
    dpr * fit.scale,
    0,
    0,
    dpr * fit.scale,
    dpr * fit.offsetX,
    dpr * fit.offsetY,
  );
  ctx!.fillStyle = palette.pearl;
  ctx!.font = `${cpx(54)}px ${fonts.serif}`;
  ctx!.textAlign = 'center';
  ctx!.textBaseline = 'middle';
  ctx!.fillText('Multiversal Love Explosion', designW / 2, designH / 2);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  draw(dpr, cssW, cssH);
}

window.addEventListener('resize', resize);
resize();
