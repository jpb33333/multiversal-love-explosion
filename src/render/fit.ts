// Uniform "contain" fit. The game's HUD/overlay and the camera window are sized
// in a fixed design space (1280×800 / 800×1280) so layout and legibility never
// change with screen size. This maps that design space into an arbitrary
// viewport without distortion: the smaller of the two axis ratios wins so the
// whole window is always visible, and the leftover becomes symmetric letterbox
// margins. (Copied verbatim from BW.)
export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeFit(
  cssW: number,
  cssH: number,
  designW: number,
  designH: number,
): Fit {
  const scale = Math.min(cssW / designW, cssH / designH);
  return {
    scale,
    offsetX: (cssW - designW * scale) / 2,
    offsetY: (cssH - designH * scale) / 2,
  };
}
