// The Game owns the rAF loop, the fixed-step accumulator, the state machine, and
// all input wiring. The only verb is a CLICK that ignites (sparks love into) the
// universe under the cursor — P1 with the mouse, P2 with Space on the keyboard
// cursor. Love spreads and decays in the sim; the player keeps clicking the
// fading ones to push it toward going viral before it burns out.

import { Renderer, type RenderInput } from '../render/Renderer.ts';
import { AudioEngine } from '../render/audio.ts';
import { Multiverse } from '../sim/Multiverse.ts';
import { SIM, TAKEOFF } from '../sim/constants.ts';
import { LoveOutcomeClassifier, type OutcomeKind } from './outcomes.ts';
import { LIMITS, type GameStateKind } from './states.ts';
import { Trail } from '../render/trail.ts';
import { PointerCursor } from '../input/PointerCursor.ts';
import { KeyCursor } from '../input/KeyCursor.ts';
import { recordGame, summarize, type StatsSummary } from './stats.ts';
import { palette } from '../theme.ts';

const DT_CAP = 1 / 30;
const ACCUM_CAP = 0.25;
const TRAIL_CAP = 200;

export class Game {
  private readonly renderer: Renderer;
  private state: GameStateKind = 'title';
  private mv: Multiverse | null = null;
  private readonly classifier = new LoveOutcomeClassifier();
  private readonly pointer = new PointerCursor();
  private readonly keyCursor = new KeyCursor();
  private readonly centroidTrail = new Trail(TRAIL_CAP);
  private readonly audio = new AudioEngine();
  private cameraOffset: { x: number; y: number } | null = null;
  private p1Target: number | null = null;
  private stats: StatsSummary;

  private running = false;
  private lastFrame = 0;
  private elapsed = 0;
  private simAccum = 0;
  private spreadTickT = 0;
  private winCascadeT = 0;
  private winCascadeAcc = 0;
  private coaching = false;
  private coachStep = 0;
  private coachFadeT = 0;
  private hasSparked = false;

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
        if (this.state === 'playing' && this.mv) {
          const off = this.cameraOffset ?? { x: 0, y: 0 };
          const t = this.mv.nearestNode({ x: p.x - off.x, y: p.y - off.y }, LIMITS.pointerReach);
          if (t !== null) this.igniteAt(t);
        }
      },
      { passive: false },
    );
    canvas.addEventListener('pointerleave', () => this.pointer.setPos(null));
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => this.keyCursor.onKeyUp(e.code));
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
    this.audio.resume();
    if (e.code === 'KeyM') {
      this.audio.toggleMute();
      return;
    }
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
    if (this.state === 'playing' && this.keyCursor.onKeyDown(e.code)) e.preventDefault();
  }

  // Spark (or refresh) love at a universe, with a pop + sound.
  private igniteAt(id: number): void {
    if (!this.mv) return;
    const node = this.mv.graph.get(id);
    if (!node) return;
    this.mv.ignite(id);
    this.hasSparked = true;
    this.audio.spark();
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    this.renderer.burst(node.x + off.x, node.y + off.y, 10, palette.loveBright, 160);
  }

  // ── transitions ──

  private toTitle(): void {
    this.state = 'title';
    this.mv = null;
    this.cameraOffset = null;
    this.p1Target = null;
    this.centroidTrail.reset();
    this.keyCursor.reset();
    this.stats = summarize();
  }

  private toPlaying(): void {
    const seed = (SIM.SEED ^ Math.floor(performance.now() * 1000)) >>> 0;
    this.mv = Multiverse.create(seed);
    this.classifier.reset();
    this.keyCursor.reset();
    this.centroidTrail.reset();
    this.cameraOffset = null;
    this.p1Target = null;
    this.simAccum = 0;
    this.coaching = this.stats.wins === 0;
    this.coachStep = 0;
    this.coachFadeT = 0;
    this.hasSparked = false;
    this.state = 'playing';
  }

  private resolve(kind: OutcomeKind): void {
    if (!this.mv) return;
    const win = kind === 'love_explosion';
    this.state = win ? 'won' : 'lost';
    recordGame({
      outcome: kind,
      score: this.mv.peakLit,
      peakLoveShare: this.classifier.peakLoveShare,
      duration: this.mv.time,
      ts: Date.now(),
    });
    this.stats = summarize();
    if (win) {
      this.audio.win();
      this.winCascadeT = 1.8;
      this.winCascadeAcc = 0;
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
    if ((this.state === 'playing' || this.state === 'won') && this.mv) {
      const c = this.mv.centroid();
      if (c) {
        const tx = this.renderer.layout.width / 2 - c.x;
        const ty = this.renderer.layout.height / 2 - c.y;
        if (this.cameraOffset === null) {
          this.cameraOffset = { x: tx, y: ty };
        } else {
          const k = 1 - Math.exp(-dt / 0.5);
          this.cameraOffset.x += (tx - this.cameraOffset.x) * k;
          this.cameraOffset.y += (ty - this.cameraOffset.y) * k;
        }
      }
      this.p1Target = this.computeP1Target();

      if (this.state === 'playing') {
        this.keyCursor.step(this.mv, dt);
        if (this.keyCursor.consumeIgnite() && this.keyCursor.selectedId !== null) {
          this.igniteAt(this.keyCursor.selectedId);
        }
      }

      this.advanceSim(dt);

      if (c) this.centroidTrail.push(c.x, c.y);
      this.drainSpreadEvents(dt);
      this.audio.setLove(Math.min(1, this.mv.litCount / TAKEOFF.TARGET));

      if (this.state === 'playing') {
        this.updateCoach(dt);
        const outcome = this.classifier.update(this.mv, dt);
        if (outcome.kind !== 'playing') this.resolve(outcome.kind);
      } else if (this.state === 'won') {
        this.winCascade(dt);
      }
    } else {
      this.audio.setLove(0);
    }
  }

  private advanceSim(dt: number): void {
    if (!this.mv) return;
    this.simAccum += dt;
    if (this.simAccum > ACCUM_CAP) this.simAccum = ACCUM_CAP;
    while (this.simAccum >= SIM.DT) {
      this.mv.tick(SIM.DT);
      this.simAccum -= SIM.DT;
    }
  }

  private computeP1Target(): number | null {
    if (!this.mv || !this.pointer.pos) return null;
    if (this.renderer.hoveredButton(this.pointer.pos)) return null;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    return this.mv.nearestNode(
      { x: this.pointer.pos.x - off.x, y: this.pointer.pos.y - off.y },
      LIMITS.pointerReach,
    );
  }

  // Each new infection from spreading gets a tiny spark + a throttled tick.
  private drainSpreadEvents(dt: number): void {
    if (!this.mv) return;
    this.spreadTickT -= dt;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    let playedTick = false;
    for (const ev of this.mv.spreadEvents) {
      this.renderer.burst(ev.x + off.x, ev.y + off.y, 3, palette.love, 80);
      if (!playedTick && this.spreadTickT <= 0) {
        this.audio.tick();
        playedTick = true;
      }
    }
    if (playedTick) this.spreadTickT = 0.12;
    this.mv.spreadEvents.length = 0;
  }

  private winCascade(dt: number): void {
    if (this.winCascadeT <= 0) return;
    this.winCascadeT -= dt;
    this.winCascadeAcc -= dt;
    if (this.winCascadeAcc > 0) return;
    const w = this.renderer.layout.width;
    const h = this.renderer.layout.height;
    const x = w * 0.5 + (Math.random() - 0.5) * w * 0.72;
    const y = h * 0.5 + (Math.random() - 0.5) * h * 0.6;
    this.renderer.burst(x, y, 24, Math.random() < 0.5 ? palette.love : palette.loveBright, 300);
    this.winCascadeAcc = 0.08;
  }

  private updateCoach(dt: number): void {
    if (!this.coaching || !this.mv) return;
    if (!this.hasSparked) {
      this.coachStep = 0;
    } else if (this.mv.peakLit < 12) {
      this.coachStep = 1;
    } else {
      if (this.coachStep < 2) {
        this.coachStep = 2;
        this.coachFadeT = 5;
      }
      this.coachFadeT -= dt;
    }
  }

  private coachInfo(): { text: string; targetId: number | null } | null {
    if (!this.coaching || !this.mv) return null;
    if (this.coachStep === 0) {
      const c = this.mv.centroid();
      return {
        text: 'Click a universe to spark love — it spreads on its own',
        targetId: c ? this.mv.nearestNode(c, 1e9) : null,
      };
    }
    if (this.coachStep === 1) {
      return { text: 'Keep clicking the fading ones — keep the chain alive and growing', targetId: null };
    }
    if (this.coachStep === 2 && this.coachFadeT > 0) {
      return { text: 'Get enough lit at once and it goes VIRAL — that wins', targetId: null };
    }
    return null;
  }

  private render(dt: number): void {
    const tally = this.mv ? this.mv.tally() : null;
    const input: RenderInput = {
      state: this.state,
      time: this.elapsed,
      dt,
      hover: this.pointer.pos,
      mv: this.mv,
      tally,
      cameraOffset: this.cameraOffset,
      centroidTrail: this.centroidTrail,
      pointer: { pos: this.pointer.pos, targetId: this.p1Target },
      keyCursor: { selectedId: this.keyCursor.selectedId },
      p2Active: this.keyCursor.active,
      coach: this.coachInfo(),
      peakLoveShare: this.classifier.peakLoveShare,
      stats: this.stats,
    };
    this.renderer.render(input);
  }
}
