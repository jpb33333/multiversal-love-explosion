// The game's voice — a tiny Web Audio engine, zero dependencies, all synthesis.
// A faint pad warms as love grows; event sounds mark nurture, lock-in, the bond,
// the win, and the loss. Created lazily and resumed on the first user gesture
// (browser autoplay policy requires a gesture), and silenced with M.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private started = false;
  muted = false;

  // Call on the first user gesture (click / keypress). Safe to call repeatedly.
  resume(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        this.ctx = null;
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.3;
      this.master.connect(this.ctx.destination);
      this.startPad();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private startPad(): void {
    if (!this.ctx || !this.master) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    const pad = this.ctx.createGain();
    pad.gain.value = 0;
    pad.connect(filter).connect(this.master);
    this.padGain = pad;
    // Two slightly detuned low oscillators → a soft, breathing drone.
    for (const detune of [-5, 6]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 110;
      o.detune.value = detune;
      o.connect(pad);
      o.start();
    }
    this.started = true;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.3, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Pad brightness follows love's share of the field (≈0 at the title screen).
  setLove(share: number): void {
    if (!this.padGain || !this.ctx) return;
    const clamped = share < 0 ? 0 : share > 1 ? 1 : share;
    const target = this.started ? clamped * 0.05 : 0;
    this.padGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  private blip(freq: number, dur: number, type: OscillatorType, peak: number, when = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  // A soft tick whose pitch rises with the universe's love.
  nurture(love: number): void {
    this.blip(640 + love * 680, 0.12, 'sine', 0.05);
  }

  // A bright bell when a universe bursts into JOY.
  loveBurst(): void {
    [392, 494, 587, 784].forEach((f, i) => this.blip(f, 0.5, 'triangle', 0.1, i * 0.05));
  }

  // A low thud when a universe bursts into DARKNESS (an outbreak).
  darkBurst(): void {
    this.blip(150, 0.4, 'sawtooth', 0.12);
    this.blip(98, 0.5, 'sine', 0.1, 0.02);
  }

  // The Love Explosion — a rising major run that blooms upward.
  win(): void {
    const base = 261.63;
    [0, 4, 7, 12, 16, 19, 24].forEach((st, i) =>
      this.blip(base * 2 ** (st / 12), 1.6, 'triangle', 0.12, i * 0.12),
    );
  }

  // Entropy collapse — a low, descending sigh.
  lose(): void {
    [220, 196, 165, 130].forEach((f, i) => this.blip(f, 0.9, 'sawtooth', 0.08, i * 0.18));
  }
}
