# CLAUDE.md

Project rules for working on this codebase with Claude Code.

**Think. Plan. Ask. Then build.**

## Rules

1. **Plan mode first.** Any task beyond a single obvious step starts with a written plan: goal, approach, risks, open questions. No code until approved.
2. **Ask, don't guess.** If intent is ambiguous, stop and clarify.
3. **Verify before you speak.** Don't fabricate library behavior; say "I'm not sure" when you aren't.
4. **Simplest correct solution.** Minimize moving parts. If you can't say what a function does in one sentence, split it.
5. **Test before you fix.** Write a failing test that reproduces the bug, then fix.
6. **Read your own diff.** Before calling work done: it builds, tests pass, it matches the plan, edge cases handled.
7. **No unwired functions. No stubs. No placeholders.** Every function is called; every UI element is connected to working logic; no `// TODO`s left behind.
8. **The simulation is the floor, not the ceiling.** The contagion/lock-in/outcome math is not a place for vibes. Tests assert the invariants (love bounded to [0,1], determinism, bounded live-node count, classifier thresholds). Run `npm test` before every commit.
9. **Game feel beats math purity.** Once the rules are correct, the constants (spawn rate, entropy ramp, lock thresholds, win/lose shares) get tuned by *playing the game*, not by deriving them. `npm run dev`, play through, adjust, repeat.

## Don'ts

- Don't skip plan mode to save time.
- Don't introduce dependencies. There are **zero runtime dependencies** — keep it that way (audit any new devDependency).
- Don't write lazy code: no placeholder stubs, no unwired functions, no UI that does nothing.
- Don't commit directly to the default branch. Every change goes via a feature branch and PR.
- **Per-session API cost cap: $5.** Stop and check in if a task is heading past it.

## Architecture (one-paragraph mental model)

`src/main.ts` boots a `Game` (`src/game/Game.ts`) which owns the state machine (`src/game/states.ts`), a `Renderer` (`src/render/Renderer.ts`), and a `Multiverse` (`src/sim/Multiverse.ts`). The Game drives `requestAnimationFrame`; each frame it advances the `Multiverse` from a fixed-step accumulator (spawn → contagion → cull, one `SIM.DT` tick at a time so behavior is frame-rate-independent and deterministic), asks `src/game/outcomes.ts` to classify the frame (playing / love_explosion / entropy_collapse), and asks the `Renderer` to paint. The game renders into a fixed design space (1280×800 landscape or 800×1280 portrait, picked by `layoutForViewport`) mapped to the viewport by a uniform contain-fit (`computeFit`), letterboxed and DPR-sharp; `Renderer.screenToLogical` inverts that fit so pointer hit-tests line up, and a camera offset keeps the live cluster centered as the multiverse scrolls. The two input controls (`src/input/PointerCursor.ts` for P1, `src/input/KeyCursor.ts` for P2) are **passive mutators** — the Game owns all pointer/keyboard wiring and polls their getters; the controls emit no events.

### The pure/render boundary

Everything under `src/sim/` is pure logic with **zero imports from `render/` or `game/`** (mirrors BW's `physics/`). The Renderer reads sim state; it never drives it. This is what makes the simulation unit-testable without a canvas.

### Rendering: three transform regimes (mirrors BW)

`Renderer.render()` paints in a strict layered order across three coordinate regimes: (1) **identity** — the deep-void fill; (2) **DPR-only screen space** — the full-bleed starfield backdrop (covers letterbox margins too); (3) **scene transform** (`dpr × fit.scale` + centering, then the camera offset) — the constellation history, edges, nodes, particles, and cursors in design-space px. The HUD/overlay (wordmark, love-vs-entropy meter, result cards) draws back in screen space so it ignores the camera.

## House style

- TypeScript with the strictness flags in `tsconfig.json` (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`). No `any` unless explained in a one-line comment. `erasableSyntaxOnly` means **no `enum`s, no namespaces, no parameter properties** — use string-literal unions and `as const` tables. Imports use `.ts` extensions; type-only imports use `import type`.
- Module per concept, named for what it does (`contagion.ts`, not `sim-utils.ts`).
- No frameworks, no UI libraries — vanilla DOM events on a single `<canvas id="stage">`.
- **All colors come from `src/theme.ts`.** Never hard-code a hex elsewhere. (The one exception is `style.css`, which duplicates `voidDeep`/`pearl` because CSS can't read the TS tokens — keep them in sync by hand.)
- **No scattered magic numbers — add to the right table:** simulation constants in `src/sim/constants.ts` (`SIM`, `CONTAGION`, `ENTROPY`, `SPAWN`, `LOCK`, `BOND`); win/lose thresholds in `src/game/outcomes.ts` (`DEFAULT_OUTCOME_CONFIG`); UI limits in `src/game/states.ts` (`LIMITS`).

## Workflow

- `npm install` — once.
- `npm run dev` — local dev server with HMR (usually http://localhost:5173). The dev server strips the CSP `<meta>` tag; production keeps it.
- `npm test` — run all Vitest tests once.
- `npm run test:watch` — Vitest watch mode (useful while tuning).
- `npm run build` — type-check (`tsc`) then produce the production bundle in `dist/`.
- `npm run preview` — serve the built bundle locally.

Before every commit: `npm test && npm run build` must both pass.
Before declaring a gameplay change done: `npm run dev` and actually play it — to a win and a loss, both cursors, in landscape and portrait. The tests cover the pure simulation + outcome invariants; they do **not** exercise the canvas, controls, or `screenToLogical` — only a real browser does.

## Credits

Built in the family of *Infinite Binary Wobble* — same stack, same house style, much of the math/RNG/fit/theme scaffolding adapted from it.
