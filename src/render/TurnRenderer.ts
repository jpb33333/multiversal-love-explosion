import { palette, rgba, fonts, cpx, lineHeightFor, setViewScale } from '../theme.ts';
import type { GameStateKind, WorldLayout } from '../game/states.ts';
import { layoutForViewport } from '../game/states.ts';
import { computeFit, type Fit } from './fit.ts';
import { Particles } from './particles.ts';
import {
  generateStarfield,
  drawStarfield,
  starCountForViewport,
  type StarSpec,
} from './starfield.ts';
import { drawEdge } from './edge.ts';
import { drawUniverse } from './turnNode.ts';
import { drawPointerCursor, drawTargetRing } from './cursors.ts';
import { type CanvasButton, drawButton } from './overlay.ts';
import type { Cosmos } from '../sim/turn/Cosmos.ts';
import { LOVE, MAP, GOAL, COLLAPSE } from '../sim/turn/constants.ts';
import type { StatsSummary } from '../game/stats.ts';

// What TurnGame hands the renderer each frame. The renderer is a pure painter:
// it reads the Cosmos and draws, but never mutates it.
export interface TurnRenderInput {
  state: GameStateKind;
  time: number; // wall-clock seconds since boot
  dt: number;
  hover: { x: number; y: number } | null; // design-space pointer (button hover + cursor)
  cosmos: Cosmos | null;
  targetId: number | null; // placeable universe under the pointer, to ring
  onslaught: { ids: number[]; alpha: number } | null; // fading flash on couples entropy just hit
  stats: StatsSummary;
}

const TOUCH_TARGET_MIN_CSS = 44;
const WORLD_FIT_MARGIN = 0.88; // leave a little breathing room around the Far Shore

function roundRect(
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

export class TurnRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private currentLayout: WorldLayout;
  private starfield: StarSpec[] = [];
  private ambientLayer = new Particles();
  private burstLayer = new Particles(0xb10b);

  private buttons: Map<string, CanvasButton> = new Map();
  private nextButtons: Map<string, CanvasButton> = new Map();

  private dpr = 1;
  private fit: Fit = { scale: 1, offsetX: 0, offsetY: 0 };
  private viewW = 1;
  private viewH = 1;
  private worldZoom = 1; // design-px per world-unit, so the whole oval fits the window
  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D context');
    this.ctx = ctx;
    this.currentLayout = layoutForViewport(window.innerWidth, window.innerHeight);

    if (typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = mql.matches;
      mql.addEventListener('change', e => {
        this.reducedMotion = e.matches;
      });
    }

    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(cssW: number, cssH: number): void {
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.viewW = cssW;
    this.viewH = cssH;
    this.currentLayout = layoutForViewport(cssW, cssH);
    this.fit = computeFit(cssW, cssH, this.currentLayout.width, this.currentLayout.height);
    this.worldZoom = this.computeWorldZoom();
    this.starfield = generateStarfield(starCountForViewport(cssW, cssH));
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  // Fit the world from the warm core out to the Far Shore into the design window.
  private computeWorldZoom(): number {
    const reachR = MAP.CORE_RADIUS + GOAL.RING * MAP.RING_GAP;
    const halfX = reachR * MAP.ASPECT;
    const halfY = reachR;
    return Math.min(
      ((this.currentLayout.width / 2) * WORLD_FIT_MARGIN) / halfX,
      ((this.currentLayout.height / 2) * WORLD_FIT_MARGIN) / halfY,
    );
  }

  get layout(): WorldLayout {
    return this.currentLayout;
  }

  screenToLogical(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.fit.offsetX) / this.fit.scale,
      y: (event.clientY - rect.top - this.fit.offsetY) / this.fit.scale,
    };
  }

  // Design space ↔ world space. The world is drawn centered in the design window
  // and scaled by worldZoom; these invert that so the Game can hit-test clicks
  // and place bursts. Hit-testing happens in design space so the pointer reach
  // stays a consistent on-screen radius regardless of zoom.
  designToWorld(p: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (p.x - this.currentLayout.width / 2) / this.worldZoom,
      y: (p.y - this.currentLayout.height / 2) / this.worldZoom,
    };
  }

  worldToDesign(x: number, y: number): { x: number; y: number } {
    return {
      x: this.currentLayout.width / 2 + x * this.worldZoom,
      y: this.currentLayout.height / 2 + y * this.worldZoom,
    };
  }

  burst(x: number, y: number, count: number, color: string, speed?: number): void {
    this.burstLayer.burst(x, y, count, color, speed);
  }

  hoveredButton(p: { x: number; y: number } | null): string | null {
    if (!p) return null;
    const minSide = TOUCH_TARGET_MIN_CSS / this.fit.scale;
    for (const [name, b] of this.buttons) {
      const padX = Math.max(0, (minSide - b.width) / 2);
      const padY = Math.max(0, (minSide - b.height) / 2);
      if (
        p.x >= b.x - padX &&
        p.x <= b.x + b.width + padX &&
        p.y >= b.y - padY &&
        p.y <= b.y + b.height + padY
      ) {
        return name;
      }
    }
    return null;
  }

  private register(name: string, btn: CanvasButton): void {
    this.nextButtons.set(name, btn);
  }

  render(input: TurnRenderInput): void {
    const { ctx } = this;
    setViewScale(this.fit.scale);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = palette.voidDeep;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawStarfield(ctx, this.starfield, this.reducedMotion ? 0 : input.time, this.viewW, this.viewH);
    if (!this.reducedMotion) this.ambientLayer.ambient(this.viewW, this.viewH, input.dt);

    const m = this.dpr * this.fit.scale;
    ctx.setTransform(m, 0, 0, m, this.dpr * this.fit.offsetX, this.dpr * this.fit.offsetY);
    this.nextButtons.clear();

    switch (input.state) {
      case 'title':
      case 'howto':
        this.renderTitle(input);
        break;
      case 'playing':
        this.renderPlaying(input);
        break;
      case 'won':
      case 'lost':
        this.renderResolved(input);
        break;
    }

    this.burstLayer.draw(ctx);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.reducedMotion) this.ambientLayer.draw(ctx);

    const front = this.buttons;
    this.buttons = this.nextButtons;
    this.nextButtons = front;
  }

  private renderTitle(input: TurnRenderInput): void {
    const { ctx } = this;
    const w = this.currentLayout.width;
    const h = this.currentLayout.height;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = palette.pearl;
    ctx.font = `400 ${cpx(56)}px ${fonts.serif}`;
    ctx.fillText('Multiversal', w / 2, h * 0.26);
    ctx.fillStyle = palette.love;
    ctx.font = `400 ${cpx(62)}px ${fonts.serif}`;
    ctx.fillText('Love Explosion', w / 2, h * 0.26 + cpx(64));
    ctx.fillStyle = rgba(palette.mist, 0.8);
    ctx.font = `italic 400 ${cpx(18)}px ${fonts.serif}`;
    ctx.fillText('carry love across the dark to the Far Shore', w / 2, h * 0.26 + cpx(64) + cpx(40));
    ctx.restore();

    const begin: CanvasButton = { label: 'Begin', x: w / 2 - 100, y: h * 0.6, width: 200, height: 50 };
    drawButton(ctx, begin, {
      primary: palette.love,
      hovered: this.hoveredButton(input.hover) === 'begin',
    });
    this.register('begin', begin);

    const s = input.stats;
    if (s.total > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(palette.mist, 0.6);
      ctx.font = `400 ${cpx(13)}px ${fonts.sans}`;
      const best = s.bestScore !== null ? `  ·  best ring ${Math.round(s.bestScore)}` : '';
      ctx.fillText(`${s.wins} reached the shore · ${s.total} played${best}`, w / 2, h * 0.86);
      ctx.restore();
    }
  }

  private renderPlaying(input: TurnRenderInput): void {
    this.renderWorld(input);
    this.drawHud(input);
    if (input.hover) drawPointerCursor(this.ctx, input.hover.x, input.hover.y, input.time);
  }

  private renderResolved(input: TurnRenderInput): void {
    const { ctx } = this;
    const w = this.currentLayout.width;
    const h = this.currentLayout.height;
    const win = input.state === 'won';

    this.renderWorld(input);

    if (!win) {
      ctx.save();
      ctx.fillStyle = rgba(palette.voidDeep, 0.5);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const cw = Math.min(580, w * 0.74);
    const ch = 260;
    const x = (w - cw) / 2;
    const y = (h - ch) / 2;
    const titleColor = win ? palette.love : palette.entropy;
    const c = input.cosmos;

    ctx.save();
    roundRect(ctx, x, y, cw, ch, 18);
    ctx.fillStyle = rgba(palette.voidDeep, 0.9);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(titleColor, 0.85);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = titleColor;
    ctx.font = `400 ${cpx(40)}px ${fonts.serif}`;
    ctx.fillText(win ? 'Love Reached the Shore' : 'Heat Death', w / 2, y + cpx(74));

    ctx.fillStyle = rgba(palette.pearl, 0.82);
    ctx.font = `400 ${cpx(16)}px ${fonts.sans}`;
    const lh = lineHeightFor(16);
    const msg = win
      ? 'An unbroken line of love spans the dark. Together.'
      : 'Entropy won the race — the cold swallowed the line.';
    ctx.fillText(msg, w / 2, y + cpx(74) + lh);

    ctx.fillStyle = palette.pearl;
    ctx.font = `600 ${cpx(19)}px ${fonts.sans}`;
    ctx.fillText(
      `reached ring ${c ? c.peakRing : 0} / ${GOAL.RING}    ·    round ${c ? c.round : 0}`,
      w / 2,
      y + cpx(74) + lh + cpx(42),
    );
    ctx.restore();

    const btn: CanvasButton = {
      label: win ? 'Again' : 'Try Again',
      x: w / 2 - 90,
      y: y + ch - 64,
      width: 180,
      height: 46,
    };
    drawButton(ctx, btn, {
      primary: titleColor,
      hovered: this.hoveredButton(input.hover) === 'again',
    });
    this.register('again', btn);
  }

  // The constellation, in world space: edges (additive), universes, the
  // onslaught flash, and a target ring on the hovered placeable universe.
  private renderWorld(input: TurnRenderInput): void {
    const c = input.cosmos;
    if (!c) return;
    const { ctx } = this;

    ctx.save();
    ctx.translate(this.currentLayout.width / 2, this.currentLayout.height / 2);
    ctx.scale(this.worldZoom, this.worldZoom);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const u of c.universes.values()) {
      for (const nid of u.neighbors) {
        if (nid <= u.id) continue;
        const nb = c.universes.get(nid);
        if (!nb) continue;
        const avgLove = (u.love + nb.love) / (2 * LOVE.CAP);
        drawEdge(ctx, u.x, u.y, nb.x, nb.y, avgLove, input.time);
      }
    }
    ctx.restore();

    const placeable = c.placeable();
    for (const u of c.universes.values()) {
      drawUniverse(ctx, u, input.time, placeable.has(u.id));
    }

    if (input.onslaught) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(palette.entropy, 0.65 * input.onslaught.alpha);
      ctx.lineWidth = 2;
      for (const id of input.onslaught.ids) {
        const u = c.universes.get(id);
        if (!u) continue;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (input.targetId !== null) {
      const u = c.universes.get(input.targetId);
      if (u) drawTargetRing(ctx, u.x, u.y, palette.player1);
    }

    ctx.restore();
  }

  private drawHud(input: TurnRenderInput): void {
    const c = input.cosmos;
    if (!c) return;
    const { ctx } = this;
    const w = this.currentLayout.width;
    const h = this.currentLayout.height;

    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // Round + remaining love (top-left).
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.pearl;
    ctx.font = `600 ${cpx(18)}px ${fonts.sans}`;
    ctx.fillText(`Round ${c.round}`, 20, 34);
    ctx.fillStyle = rgba(palette.love, 0.95);
    ctx.font = `400 ${cpx(14)}px ${fonts.sans}`;
    ctx.fillText(`${c.budget} love to place`, 20, 34 + cpx(22));

    // Progress toward the Far Shore + a one-line how-to (top-center).
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(palette.mist, 0.9);
    ctx.font = `600 ${cpx(14)}px ${fonts.sans}`;
    ctx.fillText(`Far Shore — ring ${c.peakRing} / ${GOAL.RING}`, w / 2, 30);
    ctx.fillStyle = rgba(palette.mist, 0.5);
    ctx.font = `400 ${cpx(12)}px ${fonts.sans}`;
    ctx.fillText('click glowing universes to place love · End Turn to advance', w / 2, 30 + cpx(20));

    ctx.restore();

    this.drawCollapseBar(c.collapse, COLLAPSE.MAX);

    const endTurn: CanvasButton = {
      label: 'End Turn',
      x: w - 16 - 150,
      y: h - 16 - 48,
      width: 150,
      height: 48,
    };
    drawButton(ctx, endTurn, {
      primary: palette.loveBright,
      hovered: this.hoveredButton(input.hover) === 'end_turn',
    });
    this.register('end_turn', endTurn);

    const exit: CanvasButton = { label: 'Exit', x: 16, y: h - 16 - 40, width: 84, height: 40 };
    drawButton(ctx, exit, {
      primary: palette.mist,
      hovered: this.hoveredButton(input.hover) === 'to_title',
    });
    this.register('to_title', exit);
  }

  // The heat-death track (top-right): how close entropy is to winning.
  private drawCollapseBar(value: number, max: number): void {
    const { ctx } = this;
    const w = this.currentLayout.width;
    const bw = Math.min(200, w * 0.24);
    const bh = 12;
    const x = w - 20 - bw;
    const y = 24;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(palette.entropy, 0.95);
    ctx.font = `600 ${cpx(13)}px ${fonts.sans}`;
    ctx.fillText(`Collapse ${value} / ${max}`, x + bw, y - 6);

    roundRect(ctx, x, y, bw, bh, bh / 2);
    ctx.fillStyle = rgba(palette.entropy, 0.16);
    ctx.fill();

    const frac = Math.max(0, Math.min(1, value / max));
    if (frac > 0) {
      ctx.save();
      roundRect(ctx, x, y, bw, bh, bh / 2);
      ctx.clip();
      ctx.fillStyle = rgba(palette.entropy, 0.55 + 0.4 * frac);
      ctx.fillRect(x, y, bw * frac, bh);
      ctx.restore();
    }
    ctx.restore();
  }
}
