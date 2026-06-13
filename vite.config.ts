/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

// Vite's dev server spawns blob:-URL workers for client transforms which the
// production CSP (script-src 'self') blocks, polluting the dev console with
// errors that aren't real. Strip the meta CSP in dev only — the same tag is
// emitted untouched in build, so the production bundle keeps the tight policy.
function stripCspMetaInDev(): Plugin {
  return {
    name: 'strip-csp-meta-in-dev',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>\s*/i,
        '',
      );
    },
  };
}

export default defineConfig({
  // Relative base so the built bundle works under any static-host subpath.
  base: './',
  plugins: [stripCspMetaInDev()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: 'default' as const,
  },
});
