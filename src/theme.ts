// Palette for Multiversal Love Explosion. A deep cosmic void; love blooms warm
// (rose → gold), entropy is cold and desaturated (violet-grey); the couple are
// a rose cursor (P1) and a gold cursor (P2). A node's color is a blend along
// the love↔entropy axis (see blendHex below), so contagion is legible as a
// shift in hue, not just brightness. No harsh neon — same warmth-forward
// sensibility as Infinite Binary Wobble, with a cold counterpoint for entropy.

export const palette = {
  voidDeep: '#0B0A18', // background — deep cosmic indigo-black, never pure black
  love: '#FF8FB1', // a fully-loving node (luminous rose)
  loveBright: '#FFD9A0', // love core / highlight / the explosion (warm gold-cream)
  entropy: '#7D7A93', // a fully-unloving node (cold desaturated violet-grey)
  entropyDeep: '#3A3850', // entropy shadow / dead embers
  potential: '#A99FC0', // an undecided node (between love and entropy)
  player1: '#F76C9C', // P1 cursor — rose
  player2: '#F6B24B', // P2 cursor — gold
  locked: '#DDCBF5', // a crystallized, locked-in loving cluster (pale lilac)
  pearl: '#F3E9DE', // UI headings, wordmark
  mist: '#C9C2D8', // secondary UI text, faint constellation
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
