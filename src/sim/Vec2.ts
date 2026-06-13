// Plain 2D vector — a mutable record `{ x, y }` with standalone functions
// rather than a class. The hot loops (contagion, layout) touch .x / .y
// directly; a class wrapper would force a heap allocation per op or add a
// `this` indirection for no benefit. (Copied verbatim from BW's physics/Vec2.)

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function clone(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function magSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function mag(v: Vec2): number {
  return Math.sqrt(magSq(v));
}

export function normalize(v: Vec2): Vec2 {
  const m = mag(v);
  return m > 0 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function distance(a: Vec2, b: Vec2): number {
  return mag(sub(a, b));
}

export function distanceSq(a: Vec2, b: Vec2): number {
  return magSq(sub(a, b));
}
