// The Game owns the requestAnimationFrame loop, the fixed-step accumulator, the
// state machine, and all input wiring (mirrors BW's Game). Each frame: poll the
// passive cursors, advance the Multiverse in fixed SIM.DT ticks (so behavior is
// frame-rate-independent), classify win/lose, and hand the Renderer a read-only
// snapshot. Player nurture + the bond are applied INSIDE the fixed step so a
// given seed + input is deterministic.

import { Renderer, type RenderInput } from '../render/Renderer.ts';
import { AudioEngine } from '../render/audio.ts';
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
  private readonly audio = new AudioEngine();
  private nurtureSfxT = 0; // throttles the nurture tick/spark
  private winCascadeT = 0; // remaining seconds of the win cascade
  private winCascadeAcc = 0; // spacing between cascade bursts
  private coaching = false; // show onboarding hints (only until the first win)
  private coachStep = 0; // 0 love-a-node · 1 grow · 2 done/fading
  private coachFadeT = 0;
  private hasPouredLove = false;
  private firstLockSeen = false;
  private hasConnected = false;
  private dragFromId: number | null = null; // current node of the P1 love-stroke

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
        this.audio.resume(); // first user gesture unlocks Web Audio
        const p = this.renderer.screenToLogical(e);
        this.pointer.setPos(p);
        const consumedByButton = this.onClick(p);
        if (!consumedByButton && this.state === 'playing') {
          this.pointer.press();
          this.dragFromId = this.computeP1Target(); // the universe a drag would start from
        }
      },
      { passive: false },
    );
    window.addEventListener('pointerup', () => this.onPointerUp());
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
    this.audio.resume(); // first user gesture unlocks Web Audio
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
    this.coaching = this.stats.wins === 0; // teach newcomers, leave veterans alone
    this.coachStep = 0;
    this.coachFadeT = 0;
    this.hasPouredLove = false;
    this.firstLockSeen = false;
    this.hasConnected = false;
    this.dragFromId = null;
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
    // The sim advances while playing and during the win cascade; a loss freezes.
    if ((this.state === 'playing' || this.state === 'won') && this.mv) {
      const c = this.mv.centroid();
      if (c) {
        const tx = this.renderer.layout.width / 2 - c.x;
        const ty = this.renderer.layout.height / 2 - c.y;
        if (this.cameraOffset === null) {
          this.cameraOffset = { x: tx, y: ty };
        } else {
          // Ease toward the target (~0.4s) so the view glides, never lurches.
          const k = 1 - Math.exp(-dt / 0.4);
          this.cameraOffset.x += (tx - this.cameraOffset.x) * k;
          this.cameraOffset.y += (ty - this.cameraOffset.y) * k;
        }
      }
      this.p1Target = this.computeP1Target();
      if (this.state === 'playing') {
        this.keyCursor.step(this.mv, dt);
        const link = this.keyCursor.consumeLink(); // P2 finished a keyboard connect
        if (link && this.mv.connect(link.from, link.to)) this.hasConnected = true;
      }

      this.advanceSim(dt);

      if (c) this.centroidTrail.push(c.x, c.y);
      this.drainLockEvents();
      this.drainConnectEvents();
      this.audio.setLove(this.mv.tally().loveShare);

      if (this.state === 'playing') {
        this.nurtureFeedback(dt);
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

  // A throttled tick + spark at the universe a player is actively loving.
  private nurtureFeedback(dt: number): void {
    if (!this.mv) return;
    this.nurtureSfxT -= dt;
    if (this.nurtureSfxT > 0) return;
    const id =
      this.pointer.held && this.p1Target !== null
        ? this.p1Target
        : this.keyCursor.nurturing && this.keyCursor.selectedId !== null
          ? this.keyCursor.selectedId
          : null;
    if (id === null) return;
    const node = this.mv.graph.get(id);
    if (!node) return;
    this.audio.nurture(node.love);
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    this.renderer.burst(node.x + off.x, node.y + off.y, 2, palette.love, 70);
    this.nurtureSfxT = 0.13;
  }

  // Staggered bursts rippling out from the centre after a Love Explosion.
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

  // Onboarding progress: advance from "love a node" → "grow it" → fade out, all
  // driven by what the player has actually done.
  private updateCoach(dt: number): void {
    if (!this.coaching) return;
    if (!this.hasPouredLove) {
      this.coachStep = 0;
    } else if (!this.hasConnected) {
      this.coachStep = 1;
    } else if (!this.firstLockSeen) {
      this.coachStep = 2;
    } else {
      if (this.coachStep < 3) {
        this.coachStep = 3;
        this.coachFadeT = 4;
      }
      this.coachFadeT -= dt;
    }
  }

  // The current coach hint + the universe to spotlight (null when none).
  private coachInfo(): { text: string; targetId: number | null } | null {
    if (!this.coaching || !this.mv) return null;
    if (this.coachStep === 0) {
      const c = this.mv.centroid();
      return {
        text: 'Move your mouse over a universe and HOLD to fill it with love',
        targetId: c ? this.mv.nearestNode(c, 1e9) : null,
      };
    }
    if (this.coachStep === 1) {
      return { text: 'Keep holding and SWEEP to a neighbour — they link as you go', targetId: null };
    }
    if (this.coachStep === 2) {
      return { text: 'Sweep across universes to grow a glowing web of love', targetId: null };
    }
    if (this.coachStep === 3 && this.coachFadeT > 0) {
      return { text: 'A cluster locked in! Win when LOVE passes the ↑ mark', targetId: null };
    }
    return null;
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
    // P1 love-stroke: love the universe under the cursor and chain it to the
    // previous one as you sweep — connecting is one fluid motion, no aiming.
    if (this.pointer.held && p1 !== null) {
      this.mv.nurture(p1);
      this.hasPouredLove = true;
      if (this.dragFromId === null) {
        this.dragFromId = p1;
      } else if (p1 !== this.dragFromId) {
        if (this.mv.connect(this.dragFromId, p1)) this.hasConnected = true;
        this.dragFromId = p1;
      }
    }
    if (this.keyCursor.nurturing && p2 !== null) {
      this.mv.nurture(p2);
      this.hasPouredLove = true;
    }
    const bothHolding = this.pointer.held && this.keyCursor.nurturing;
    const bondResult = this.bond.update(this.mv, SIM.DT, bothHolding, p1, p2);
    if (bondResult === 'fired') {
      this.audio.bond();
      const off = this.cameraOffset ?? { x: 0, y: 0 };
      this.renderer.burst(
        this.bond.lastFireX + off.x,
        this.bond.lastFireY + off.y,
        Math.min(20 + this.bond.lastFireSize * 4, 80),
        palette.loveBright,
        280,
      );
    }
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
    if (this.mv.lockEvents.length > 0) this.firstLockSeen = true;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    for (const ev of this.mv.lockEvents) {
      this.audio.lock(ev.size);
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

  // Turn each player-drawn link into a spark + sound at its midpoint.
  private drainConnectEvents(): void {
    if (!this.mv) return;
    const off = this.cameraOffset ?? { x: 0, y: 0 };
    for (const ev of this.mv.connectEvents) {
      this.audio.connect();
      this.renderer.burst(
        (ev.ax + ev.bx) / 2 + off.x,
        (ev.ay + ev.by) / 2 + off.y,
        10,
        palette.loveBright,
        160,
      );
    }
    this.mv.connectEvents.length = 0;
  }

  // On release: if the drag ended on a different nearby universe, wire them.
  private onPointerUp(): void {
    this.dragFromId = null; // end the love-stroke
    this.pointer.release();
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
      p2Active: this.keyCursor.active,
      coach: this.coachInfo(),
      peakLoveShare: this.classifier.peakLoveShare,
      stats: this.stats,
    };
    this.renderer.render(input);
  }
}
