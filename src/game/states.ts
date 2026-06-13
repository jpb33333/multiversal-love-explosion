// The game's state machine and the design-space layout, kept tiny and explicit
// (mirrors BW's states.ts). The world is camera-driven, so the layout's job is
// just to define the visible window + HUD coordinate system; `layoutForViewport`
// picks landscape or its portrait transpose so a phone fills either way.

export type GameStateKind =
  | 'title' // wordmark + BEGIN + best-of-session line
  | 'howto' // a how-to-play card over the title
  | 'playing' // the live multiverse; both cursors active
  | 'won' // love_explosion — cascade keeps animating under a card
  | 'lost'; // entropy_collapse — the field dims to embers under a card

export type Orientation = 'landscape' | 'portrait';

export interface WorldLayout {
  orientation: Orientation;
  width: number; // design-space dims, also the camera window measured in world units
  height: number;
}

export const LANDSCAPE: WorldLayout = { orientation: 'landscape', width: 1280, height: 800 };
export const PORTRAIT: WorldLayout = { orientation: 'portrait', width: 800, height: 1280 };

// Square viewports get landscape (the original tuning); taller-than-wide gets
// portrait so phones held upright fill the screen.
export function layoutForViewport(cssW: number, cssH: number): WorldLayout {
  return cssW >= cssH ? LANDSCAPE : PORTRAIT;
}

// UI / control feel limits (the LIMITS table — don't scatter these numbers).
export const LIMITS = {
  pointerReach: 46, // design-space px radius for the P1 pointer to grab a node
  keyHopCooldown: 0.12, // s between P2 keyboard hops, so a held key steps cleanly
} as const;
