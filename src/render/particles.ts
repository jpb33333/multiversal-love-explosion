import { palette, rgba } from '../theme.ts';
import { mulberry32 } from '../sim/rng.ts';

// Stardust: a slow ambient drift so the void feels alive, plus on-demand bursts
// (a love-spark on nurture, the cascade on a Love Explosion). Global cap defends
// against unbounded growth; over the cap, burst() silently drops the excess.
// (Copied from BW, with the RNG promoted to the shared module.)

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 400;

export class Particles {
  private particles: Particle[] = [];
  private rng: () => number;

  constructor(seed = 0xfeed) {
    this.rng = mulberry32(seed);
  }

  ambient(width: number, height: number, dt: number, target = 36): void {
    const cap = Math.min(target, MAX_PARTICLES);
    while (this.particles.length < cap) this.spawnDrift(width, height);
    this.update(dt, width, height);
  }

  burst(x: number, y: number, count: number, color: string, speed = 220): void {
    const room = MAX_PARTICLES - this.particles.length;
    const n = Math.min(count, Math.max(0, room));
    for (let i = 0; i < n; i++) {
      const angle = this.rng() * Math.PI * 2;
      const s = speed * (0.3 + this.rng() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        age: 0,
        life: 0.8 + this.rng() * 1.0,
        size: 1.5 + this.rng() * 2.5,
        color,
      });
    }
  }

  private spawnDrift(width: number, height: number): void {
    const warm = this.rng();
    this.particles.push({
      x: this.rng() * width,
      y: this.rng() * height,
      vx: (this.rng() - 0.5) * 6,
      vy: (this.rng() - 0.5) * 6,
      age: 0,
      life: 4 + this.rng() * 6,
      size: 0.8 + this.rng() * 1.2,
      color: warm < 0.5 ? palette.loveBright : palette.love,
    });
  }

  private update(dt: number, width: number, height: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
      if (p.age >= p.life || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const fade = 1 - p.age / p.life;
      const a = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = rgba(p.color, a * 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
