import './style.css';
import { TurnGame } from './game/TurnGame.ts';

// Clickjacking defence: the strict CSP can't set frame-ancestors via <meta>, so
// if we're loaded inside a cross-origin frame, break out to the top window.
try {
  if (window.top && window.top !== window.self) {
    window.top.location.href = window.self.location.href;
  }
} catch {
  // Cross-origin access threw — we're framed and can't redirect; nothing to do.
}

const canvas = document.getElementById('stage');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('#stage canvas not found');
}

new TurnGame(canvas).start();
