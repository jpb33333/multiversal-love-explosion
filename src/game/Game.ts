// The Game owns the requestAnimationFrame loop, the fixed-step accumulator, the
// state machine, and all input wiring (mirrors BW's Game). Each frame: poll the
// passive cursors, advance the Multiverse in fixed SIM.DT ticks (so behavior is
// frame-rate-independent), classify win/lose, and hand the Renderer a read-only
// snapshot. Player nurture + the bond are applied INSIDE the fixed step so a
// given seed + input is deterministic.

import { Renderer, type RenderInput } from '../render/Renderer.ts';
import { Multiverse } from '../sim/Multiverse.ts';
import { SIM } from '../sim/constants.ts';
import { LoveOutcomeClassifier } from './outcomes.ts';
import { BondController } from './bond.ts';
import { LIMITS, type GameStateKind } from './states.ts';
import { Trail } from '../render/trail.ts';
import { PointerCursor } from '../input/PointerCursor.ts';
import { KeyCursor } from '../input/KeyCursor.ts';
import { recordGame, summarize, type StatsSummary, type OutcomeKind } from './stats.ts';
import { palette } from '../theme.ts';

const DT_CAP = 1 / 30; // clamp a long frame (tab unfocus) so the sim never lurches
const ACCUM_CAP = 0.25; // drop backlog beyond this so we never spiral after a pause
const TRAIL_CAP = 220;

export class Game {
  private readonly renderer: Renderer;
  private state: GameStateKind = 'title';
  private mv: Multiverse | null = null;
  private readonly classifier = new LoveOutcomeClassifier();
  private readonly bond = new BondController();
  private readonly pointer = new PointerCursor();
  private readonly keyCursor = new KeyCursor();
  private readonly centroidTrail = new Trail(TRAIL_CAP);
  private cameraOffset: { x: number; y: number } | null = null;
  private p1Target: number | null = null;
  private stats: StatsSummary;

  private running = false;
  private lastFrame = 0;
  private elapsed = 0; // wall seconds since boot
  private simAccum = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.stats = summarize();
    this.attachInput(canvas);
  }

  start(): void {
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.tick);
  }

  // ── input wiring (the Game owns every listener; controls stay passive) ──

  private attachInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointermove', e => {
      this.pointer.setPos(this.renderer.screenToLogical(e));
    });
    canvas.addEventListener(
      'pointerdown',
      e => {
        e.preventDefault();
        const p = this.renderer.screenToLogical(e);
        this.pointer.setPos(p);
        const consumedByButton = this.onClick(p);
        if (!consumedByButton && this.state === 'playing') this.pointer.press();
      },
      { passive: false },
    );
    window.addEventListener('pointerup', () => this.pointer.release());
    canvas.addEventListener('pointerleave', () => {
      this.pointer.setPos(null);
      this.pointer.release();
    });
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => this.keyCursor.onKeyUp(e.code));
    window.addEventListener('resize', () =>
      this.renderer.resize(window.innerWidth, window.innerHeight),
    );
  }

  // Route a click to whatever button is under it. Returns true if consumed.
  private onClick(p: { x: number; y: number }): boolean {
    const btn = this.renderer.hoveredButton(p);
    if (!btn) return false;
    switch (btn) {
      case 'begin':
      case 'again':
        this.toPlaying();
        return true;
      case 'howto':
        this.state = 'howto';
        return true;
      case 'to_title':
        this.toTitle();
        return true;
      default:
        return false;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      if (this.state !== 'title') this.toTitle();
      return;
    }
    if (this.state === 'title' || this.state === 'howto') {
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
    if (this.state === 'playing') {
      if (this.keyCursor.onKeyDown(e.code)) e.preventDefault();
    }
  }

  // ── state transitions ──

  private toTitle(): void {
    this.state = 'title';
    this.mv = null;
    this.cameraOffset = null;
    this.p1Target = null;
    this.centroidTrail.reset();
    this.keyCursor.reset();
    this.pointer.release();
    this.stats = summarize();
  }

  private toPlaying(): void {
    const seed = (SIM.SEED ^ Math.floor(performance.now() * 1000)) >>> 0;
    this.mv = Multiverse.create(seed);
    this.classifier.reset();
    this.bond.reset();
    this.keyCursor.reset();
    this.centroidTrail.reset();
    this.cameraOffset = null;
    this.p1Target = null;
    this.simAccum = 0;
    this.pointer.release();
    this.state = 'playing';
  }

  private resolve(kind: OutcomeKind): void {
    if (!this.mv) return;
    const win = kind === 'love_explosion';
    this.state = win ? 'won' : 'lost';
    recordGame({
      outcome: kind,
      score: Math.round(this.mv.score),
      peakLoveShare: this.classifier.peakLoveShare,
      duration: this.mv.time,
      ts: Date.now(),
    });
    this.stats = summarize();
    if (win) {
      // A cascade from the centre of the screen, where the cluster sits.
      this.renderer.burst(
        this.renderer.layout.width / 2,
        this.renderer.layout.height / 2,
        140,
        palette.loveBright,
        340,
      );
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
    // The sim advances while playing and during the win cascade; a loss freezes.
    if ((this.state === 'playing' || this.state === 'won') && this.mv) {
      const c = this.mv.centroid();
      if (c) {
        this.cameraOffset = {
          x: this.renderer.layout.width / 2 - c.x,
          y: this.renderer.layout.height / 2 - c.y,
        };
      }
      this.p1Target = this.computeP1Target();
      if (this.state === 'playing') this.keyCursor.step(this.mv, dt);

      this.advanceSim(dt);

      if (c) this.centroidTrail.push(c.x, c.y);
      this.drainLockEvents();

      if (this.state === 'playing') {
        const outcome = this.classifier.update(this.mv, dt);
        if (outcome.kind !== 'playing') this.resolve(outcome.kind);
      }
    }
  }

  private advanceSim(dt: number): void {
    if (!this.mv) return;
    this.simAccum += dt;
    if (this.simAccum > ACCUM_CAP) this.simAccum = ACCUM_CAP;
    while (this.simAccum >= SIM.DT) {
      this.applyCursorIntents();
      this.mv.tick(SIM.DT);
      this.simAccum -= SIM.DT;
    }
  }

  // Applied inside the fixed step so input affects the sim deterministically.
  private applyCursorIntents(): void {
    if (!this.mv) return;
    const p1 = this.p1Target;
    const p2 = this.keyCursor.selectedId;
    if (this.pointer.held && p1 !== null) this.mv.nurture(p1);
    if (this.keyCursor.nurturing && p2 !== null) this.mv.nurture(p2);
    const bothHolding = this.pointer.held && this.keyCursor.nurturing;
    this.bond.update(this.mv, SIM.DT, bothHolding, p1, p2);
  }

  // The node under the P1 pointer (in world space), or null if the pointer is
  // off, over a button, or not near any universe.
  private computeP1Target(): number | null {
    if (!this.mv || !this.pointer.pos) return null;
    if (this.renderer.hoveredButton(this.pointer.pos)) return null;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    return this.mv.nearestNode(
      { x: this.pointer.pos.x - off.x, y: this.pointer.pos.y - off.y },
      LIMITS.pointerReach,
    );
  }

  // Turn each lock-in into a love-spark burst at its on-screen position.
  private drainLockEvents(): void {
    if (!this.mv) return;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    for (const ev of this.mv.lockEvents) {
      this.renderer.burst(
        ev.x + off.x,
        ev.y + off.y,
        Math.min(8 + ev.size * 3, 60),
        palette.loveBright,
        200,
      );
    }
    this.mv.lockEvents.length = 0;
  }

  private render(dt: number): void {
    const tally = this.mv ? this.mv.tally() : null;
    const input: RenderInput = {
      state: this.state,
      time: this.elapsed,
      simTime: this.mv ? this.mv.time : 0,
      dt,
      hover: this.pointer.pos,
      mv: this.mv,
      tally,
      cameraOffset: this.cameraOffset,
      centroidTrail: this.centroidTrail,
      pointer: { pos: this.pointer.pos, targetId: this.p1Target, held: this.pointer.held },
      keyCursor: { selectedId: this.keyCursor.selectedId },
      bondCharge: this.bond.chargeProgress,
      bothHolding: this.pointer.held && this.keyCursor.nurturing,
      peakLoveShare: this.classifier.peakLoveShare,
      stats: this.stats,
    };
    this.renderer.render(input);
  }
}
