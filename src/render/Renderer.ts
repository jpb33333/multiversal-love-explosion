import { palette, rgba, setViewScale } from '../theme.ts';
import type { GameStateKind, WorldLayout } from '../game/states.ts';
import { layoutForViewport } from '../game/states.ts';
import { computeFit, type Fit } from './fit.ts';
import { Trail, drawTrail } from './trail.ts';
import { Particles } from './particles.ts';
import {
  generateStarfield,
  drawStarfield,
  starCountForViewport,
  type StarSpec,
} from './starfield.ts';
import { drawNode } from './node.ts';
import { drawEdge } from './edge.ts';
import {
  drawPointerCursor,
  drawSelectionRing,
  drawTargetRing,
  drawLoveBeam,
  drawCoachHighlight,
  drawCursorLabel,
} from './cursors.ts';
import {
  type CanvasButton,
  drawButton,
  drawWordmark,
  drawOverflowTracks,
  drawResultCard,
  drawTitleStats,
  drawHowtoCard,
  drawPlayingHelp,
  drawCoachBanner,
} from './overlay.ts';
import type { Multiverse, Tally } from '../sim/Multiverse.ts';
import { DEFAULT_OUTCOME_CONFIG } from '../game/outcomes.ts';
import type { StatsSummary } from '../game/stats.ts';

// Everything the Renderer needs for a frame. It only READS this — the Renderer
// never mutates the simulation.
export interface RenderInput {
  state: GameStateKind;
  time: number; // wall-clock seconds since boot — starfield / cursor animation
  simTime: number; // multiverse sim time — node burst-fade timing (0 when no sim)
  dt: number;
  hover: { x: number; y: number } | null;
  mv: Multiverse | null;
  tally: Tally | null;
  cameraOffset: { x: number; y: number } | null; // world → design-centre translation
  centroidTrail: Trail;
  pointer: { pos: { x: number; y: number } | null; targetId: number | null; held: boolean };
  keyCursor: { selectedId: number | null };
  p2Active: boolean; // P2 has joined — only then is their cursor shown
  coach: { text: string; targetId: number | null } | null; // onboarding hint
  peakLoveShare: number; // 0..1 progress for the result card
  stats: StatsSummary;
}

const TOUCH_TARGET_MIN_CSS = 44;
const TAU = Math.PI * 2;

export class Renderer {
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
    this.starfield = generateStarfield(starCountForViewport(cssW, cssH));
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
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

  render(input: RenderInput): void {
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
        this.renderTitle(input);
        break;
      case 'howto':
        this.renderHowto(input);
        break;
      case 'playing':
        this.renderPlaying(input);
        break;
      case 'won':
      case 'lost':
        this.renderResolved(input);
        break;
    }

    if (input.state !== 'title' && input.state !== 'howto') this.drawCornerControls(input);

    this.burstLayer.draw(ctx);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.reducedMotion) this.ambientLayer.draw(ctx);

    const front = this.buttons;
    this.buttons = this.nextButtons;
    this.nextButtons = front;
  }

  // ── scenes ──

  private renderTitle(input: RenderInput): void {
    const w = this.layout.width;
    const h = this.layout.height;
    drawWordmark(this.ctx, w, h);
    drawTitleStats(this.ctx, w, h, input.stats);
    const begin: CanvasButton = { label: 'Begin', x: w / 2 - 100, y: h * 0.6, width: 200, height: 50 };
    drawButton(this.ctx, begin, {
      primary: palette.love,
      hovered: this.hoveredButton(input.hover) === 'begin',
    });
    this.register('begin', begin);
    const howto: CanvasButton = { label: 'How to play', x: w / 2 - 90, y: h * 0.6 + 64, width: 180, height: 40 };
    drawButton(this.ctx, howto, {
      primary: palette.mist,
      hovered: this.hoveredButton(input.hover) === 'howto',
    });
    this.register('howto', howto);
  }

  private renderHowto(input: RenderInput): void {
    const w = this.layout.width;
    const h = this.layout.height;
    drawHowtoCard(this.ctx, w, h);
    const begin: CanvasButton = { label: 'Begin', x: w / 2 - 100, y: h * 0.16 + 360, width: 200, height: 50 };
    drawButton(this.ctx, begin, {
      primary: palette.love,
      hovered: this.hoveredButton(input.hover) === 'begin',
    });
    this.register('begin', begin);
  }

  private renderPlaying(input: RenderInput): void {
    this.renderWorld(input);
    if (input.mv) {
      drawOverflowTracks(
        this.ctx,
        this.layout.width,
        input.mv.loveOverflows,
        DEFAULT_OUTCOME_CONFIG.winLoveOverflows,
        input.mv.entropyOverflows,
        DEFAULT_OUTCOME_CONFIG.loseEntropyOverflows,
      );
    }
    if (input.coach) drawCoachBanner(this.ctx, this.layout.width, input.coach.text);
    drawPlayingHelp(this.ctx, this.layout.width, this.layout.height);
  }

  private renderResolved(input: RenderInput): void {
    const w = this.layout.width;
    const h = this.layout.height;
    const win = input.state === 'won';

    this.renderWorld(input);

    if (!win) {
      this.ctx.save();
      this.ctx.fillStyle = rgba(palette.voidDeep, 0.5);
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }

    if (input.mv) {
      drawOverflowTracks(
        this.ctx,
        w,
        input.mv.loveOverflows,
        DEFAULT_OUTCOME_CONFIG.winLoveOverflows,
        input.mv.entropyOverflows,
        DEFAULT_OUTCOME_CONFIG.loseEntropyOverflows,
      );
    }
    const score = input.mv ? input.mv.loveOverflows : 0;
    const card = drawResultCard(this.ctx, w, h, win, score, input.peakLoveShare);
    const btn: CanvasButton = {
      label: win ? 'Again' : 'Try Again',
      x: w / 2 - 90,
      y: card.buttonY,
      width: 180,
      height: 46,
    };
    drawButton(this.ctx, btn, {
      primary: card.titleColor,
      hovered: this.hoveredButton(input.hover) === 'again',
    });
    this.register('again', btn);
  }

  private renderWorld(input: RenderInput): void {
    if (!input.mv) return;
    const { ctx } = this;
    const mv = input.mv;

    ctx.save();
    if (input.cameraOffset) ctx.translate(input.cameraOffset.x, input.cameraOffset.y);

    this.drawConstellation(mv);
    drawTrail(ctx, input.centroidTrail, palette.locked, 0.18, 0, 1.5);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const node of mv.graph.values()) {
      if (node.dying) continue;
      for (const nid of node.neighbors) {
        if (nid <= node.id) continue; // each undirected edge once
        const nb = mv.graph.get(nid);
        if (!nb || nb.dying) continue;
        drawEdge(ctx, node.x, node.y, nb.x, nb.y, (node.love + nb.love) / 2, input.time);
      }
    }
    ctx.restore();

    for (const node of mv.graph.values()) drawNode(ctx, node, input.simTime);

    if (input.coach && input.coach.targetId !== null) {
      const cn = mv.graph.get(input.coach.targetId);
      if (cn) drawCoachHighlight(ctx, cn.x, cn.y, input.time);
    }

    const pTarget = input.pointer.targetId !== null ? mv.graph.get(input.pointer.targetId) : undefined;
    if (pTarget) drawTargetRing(ctx, pTarget.x, pTarget.y, palette.player1);
    const kSel =
      input.p2Active && input.keyCursor.selectedId !== null
        ? mv.graph.get(input.keyCursor.selectedId)
        : undefined;
    if (kSel) {
      drawSelectionRing(ctx, kSel.x, kSel.y, input.time);
      drawCursorLabel(ctx, kSel.x, kSel.y + 4, 'P2', palette.player2);
    }

    ctx.restore();

    if (input.pointer.pos && input.pointer.held && pTarget && input.cameraOffset) {
      drawLoveBeam(
        ctx,
        input.pointer.pos.x,
        input.pointer.pos.y,
        pTarget.x + input.cameraOffset.x,
        pTarget.y + input.cameraOffset.y,
        input.time,
      );
    }
    if (input.pointer.pos) {
      drawPointerCursor(ctx, input.pointer.pos.x, input.pointer.pos.y, input.pointer.held, input.time);
    }
  }

  private drawConstellation(mv: Multiverse): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of mv.constellation) {
      ctx.fillStyle = rgba(c.love ? palette.love : palette.entropy, c.love ? 0.14 : 0.1);
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.love ? 1.7 : 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCornerControls(input: RenderInput): void {
    const w = this.layout.width;
    const exit: CanvasButton = { label: 'Exit', x: w - 16 - 92, y: 14, width: 92, height: 40 };
    drawButton(this.ctx, exit, {
      primary: palette.mist,
      hovered: this.hoveredButton(input.hover) === 'to_title',
    });
    this.register('to_title', exit);
  }
}
