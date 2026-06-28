// Palette for Multiversal Love Explosion — tuned to the warm, soft, intimate look
// of the film *Her*: blue is removed entirely. Love blooms as luminous coral →
// peach-cream; entropy is its warm counterpoint — desaturated ash/taupe, never a
// cold violet. A node's colour blends along the love↔entropy axis (see blendHex
// below), so contagion stays legible by saturation + brightness, not a warm/cool
// split. Same warmth-forward family as Infinite Binary Wobble.

export const palette = {
  voidDeep: '#160A0E', // background — deep warm wine-plum near-black (no blue)
  love: '#FF8C7A', // a fully-loving node (luminous coral)
  loveBright: '#FFE0B0', // love core / highlight / the bloom (warm peach-cream)
  entropy: '#8C7A70', // a fully-unloving node (warm desaturated ash/taupe)
  entropyDeep: '#36231F', // entropy shadow / dead embers (dark warm ash)
  potential: '#C2A091', // an undecided node (dusty warm rose-taupe)
  player1: '#FF6F5E', // P1 cursor — living coral
  player2: '#F4B458', // P2 cursor — warm gold
  locked: '#F6D7BE', // a crystallized, locked-in loving cluster (pale peach-cream)
  pearl: '#F4EAE0', // UI headings, wordmark (warm cream)
  mist: '#C9B7AC', // secondary UI text, faint constellation (warm taupe)
} as const;

export const fonts = {
  // Humanist serif for wordmark, headings, result cards (falls back gracefully —
  // no font files shipped, so this resolves to Georgia / Times).
  serif: '"Cardo", Georgia, "Times New Roman", serif',
  // Humanist sans for UI labels and HUD readouts.
  sans: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

// ─── Legibility floor for contain-fit canvas text ──────────────────────────
//
// The game draws in a fixed design space that the Renderer maps into the
// viewport with a uniform contain-fit. A phone in portrait renders that space
// at ~0.5×, so a 12px design font lands at ~6 CSS px — far below the ~11px
// readability floor. `cpx` pulls any design size that would render below the
// floor up toward it, compressing the sub-floor range (slope) so the size
// hierarchy is preserved, never inverted. Text already at/above the floor is
// returned unchanged. The Renderer calls `setViewScale(fit.scale)` once per
// frame before any drawing or measuring. (Copied verbatim from BW.)
let viewScale = 1;
const FLOOR_PX = 11; // on-screen CSS px (Apple HIG-ish minimum)
const SLOPE = 0.2; // fraction of the sub-floor deficit that survives

export function setViewScale(scale: number): void {
  viewScale = scale > 0 ? scale : 1;
}

export function cpx(designSize: number): number {
  const onScreen = designSize * viewScale;
  if (onScreen >= FLOOR_PX) return designSize;
  return (FLOOR_PX - (FLOOR_PX - onScreen) * SLOPE) / viewScale;
}

export function lineHeightFor(designSize: number): number {
  return cpx(designSize) * 1.35;
}

export type Palette = typeof palette;
export type PaletteKey = keyof Palette;

// Convert a hex color to an rgba string with the given alpha. Used everywhere
// we need a translucent version of a palette color (glows, trails, overlays).
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Linear-blend two hex colors in sRGB. t=0 returns a, t=1 returns b. The node
// renderer uses this to tint a universe by its love value:
// blendHex(palette.entropy, palette.love, node.love).
export function blendHex(a: string, b: string, t: number): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
  const k = clamp01(t);
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  const hex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`.toUpperCase();
}
