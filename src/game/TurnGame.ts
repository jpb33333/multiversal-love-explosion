// TurnGame owns the rAF render loop, the state machine, and all input wiring for
// the turn-based game. Unlike the real-time Game, the simulation does NOT advance
// per frame — the Cosmos mutates only on two player verbs: a CLICK places one
// love on a suppliable universe, and END TURN unleashes the onslaught. The loop
// runs every frame purely for ambient motion and the brief onslaught flash.

import { TurnRenderer, type TurnRenderInput } from '../render/TurnRenderer.ts';
import { AudioEngine } from '../render/audio.ts';
import { Cosmos } from '../sim/turn/Cosmos.ts';
import { TURN_SIM, GOAL } from '../sim/turn/constants.ts';
import type { EntropyResult } from '../sim/turn/entropy.ts';
import { LIMITS, type GameStateKind } from './states.ts';
import { PointerCursor } from '../input/PointerCursor.ts';
import { recordGame, summarize, type StatsSummary } from './stats.ts';
import { palette } from '../theme.ts';

const DT_CAP = 1 / 30;
const ONSLAUGHT_TIME = 0.7; // seconds the cold-strike flash lingers after End Turn

export class TurnGame {
  private readonly renderer: TurnRenderer;
  private state: GameStateKind = 'title';
  private cosmos: Cosmos | null = null;
  private readonly pointer = new PointerCursor();
  private readonly audio = new AudioEngine();
  private stats: StatsSummary;

  private running = false;
  private lastFrame = 0;
  private elapsed = 0;
  private targetId: number | null = null;
  private onslaughtIds: number[] = [];
  private onslaughtT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new TurnRenderer(canvas);
    this.stats = summarize();
    this.attachInput(canvas);
  }

  start(): void {
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.tick);
  }

  // ── input ──

  private attachInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointermove', e => {
      this.pointer.setPos(this.renderer.screenToLogical(e));
    });
    canvas.addEventListener(
      'pointerdown',
      e => {
        e.preventDefault();
        this.audio.resume();
        const p = this.renderer.screenToLogical(e);
        this.pointer.setPos(p);
        if (this.onClick(p)) return; // a button took it
        if (this.state === 'playing' && this.cosmos && this.onslaughtT <= 0) {
          const id = this.pickUniverse(p);
          if (id !== null) this.placeAt(id);
        }
      },
      { passive: false },
    );
    canvas.addEventListener('pointerleave', () => this.pointer.setPos(null));
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('resize', () =>
      this.renderer.resize(window.innerWidth, window.innerHeight),
    );
  }

  private onClick(p: { x: number; y: number }): boolean {
    const btn = this.renderer.hoveredButton(p);
    if (!btn) return false;
    switch (btn) {
      case 'begin':
      case 'again':
        this.toPlaying();
        return true;
      case 'end_turn':
        this.endTurn();
        return true;
      case 'to_title':
        this.toTitle();
        return true;
      default:
        return false;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.audio.resume();
    if (e.code === 'KeyM') {
      this.audio.toggleMute();
      return;
    }
    if (e.code === 'Escape') {
      if (this.state !== 'title') this.toTitle();
      return;
    }
    if (this.state === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.toPlaying();
      }
      return;
    }
    if (this.state === 'won' || this.state === 'lost') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.toPlaying();
      }
      return;
    }
    if (this.state === 'playing' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this.endTurn();
    }
  }

  // The placeable universe nearest the pointer, within a forgiving reach. Reach
  // is measured in design space (universes projected to the screen) so it's a
  // consistent on-screen radius no matter the world zoom.
  private pickUniverse(p: { x: number; y: number } | null): number | null {
    if (!p || !this.cosmos) return null;
    if (this.renderer.hoveredButton(p)) return null;
    let best: number | null = null;
    let bestD = LIMITS.pointerReach * LIMITS.pointerReach;
    for (const id of this.cosmos.placeable()) {
      const u = this.cosmos.get(id);
      if (!u) continue;
      const d = this.renderer.worldToDesign(u.x, u.y);
      const dx = d.x - p.x;
      const dy = d.y - p.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = id;
      }
    }
    return best;
  }

  private placeAt(id: number): void {
    if (!this.cosmos) return;
    if (!this.cosmos.place(id)) return;
    this.audio.spark();
    const u = this.cosmos.get(id);
    if (u) {
      const d = this.renderer.worldToDesign(u.x, u.y);
      this.renderer.burst(d.x, d.y, 8, palette.loveBright, 140);
    }
    if (this.cosmos.outcome() === 'love_reaches_shore') this.resolve(true);
  }

  private endTurn(): void {
    if (!this.cosmos || this.state !== 'playing' || this.onslaughtT > 0) return;
    const res = this.cosmos.endTurn();
    this.playOnslaught(res);
    const outcome = this.cosmos.outcome();
    if (outcome === 'heat_death') this.resolve(false);
    else if (outcome === 'love_reaches_shore') this.resolve(true);
  }

  private playOnslaught(res: EntropyResult): void {
    this.onslaughtIds = [...res.drawn, ...res.outbreaks];
    this.onslaughtT = ONSLAUGHT_TIME;
    this.audio.tick();
    if (!this.cosmos) return;
    for (const id of res.outbreaks) {
      const u = this.cosmos.get(id);
      if (!u) continue;
      const d = this.renderer.worldToDesign(u.x, u.y);
      this.renderer.burst(d.x, d.y, 6, palette.entropy, 90);
    }
  }

  // ── transitions ──

  private toTitle(): void {
    this.state = 'title';
    this.cosmos = null;
    this.targetId = null;
    this.onslaughtT = 0;
    this.onslaughtIds = [];
    this.stats = summarize();
  }

  private toPlaying(): void {
    const seed = (TURN_SIM.SEED ^ Math.floor(performance.now() * 1000)) >>> 0;
    this.cosmos = Cosmos.create(seed);
    this.targetId = null;
    this.onslaughtT = 0;
    this.onslaughtIds = [];
    this.state = 'playing';
  }

  private resolve(win: boolean): void {
    if (!this.cosmos) return;
    this.state = win ? 'won' : 'lost';
    recordGame({
      outcome: win ? 'love_explosion' : 'entropy_collapse',
      score: this.cosmos.peakRing,
      peakLoveShare: Math.min(1, this.cosmos.peakRing / GOAL.RING),
      duration: this.cosmos.round,
      ts: Date.now(),
    });
    this.stats = summarize();
    if (win) {
      this.audio.win();
      this.renderer.burst(
        this.renderer.layout.width / 2,
        this.renderer.layout.height / 2,
        120,
        palette.loveBright,
        340,
      );
    } else {
      this.audio.lose();
    }
  }

  // ── loop ──

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastFrame) / 1000, DT_CAP);
    this.lastFrame = now;
    this.elapsed += dt;
    this.update(dt);
    this.render(dt);
    requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    if (this.onslaughtT > 0) this.onslaughtT = Math.max(0, this.onslaughtT - dt);
    this.targetId =
      this.state === 'playing' && this.onslaughtT <= 0 ? this.pickUniverse(this.pointer.pos) : null;
  }

  private render(dt: number): void {
    const onslaught =
      this.onslaughtT > 0
        ? { ids: this.onslaughtIds, alpha: this.onslaughtT / ONSLAUGHT_TIME }
        : null;
    const input: TurnRenderInput = {
      state: this.state,
      time: this.elapsed,
      dt,
      hover: this.pointer.pos,
      cosmos: this.cosmos,
      targetId: this.targetId,
      onslaught,
      stats: this.stats,
    };
    this.renderer.render(input);
  }
}
