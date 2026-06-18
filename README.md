# Multiversal Love Explosion

A 1–2 player co-op game about spreading love like a virus across a network of
universes — and making it go viral before it burns out. A chain-reaction
high-wire act in the spirit of Tetris: it only gets harder.

The field is full of dormant universes. **Click** one to spark love into it; the
love **spreads** to its neighbours, lighting up the network. But every lit
universe **fades** — and spread-born love is weak, so it dies fast unless you
keep clicking the fading ones to keep the chain alive and growing.

Get enough universes lit **at once** and the love goes **viral** —
self-sustaining. That's the win (a Love Explosion). Fall behind and the chain
**burns out**. Decay rises the longer you play, so eventually there's more to
click than two hands can manage… which is exactly when you want a second pair on
the keyboard.

## Play

- **Player 1 — mouse:** click universes to spark love; keep clicking the fading ones.
- **Player 2 — keyboard:** arrows / WASD move a cursor, **Space** sparks.
- **M** mutes.

Watch the **GOING VIRAL** bar up top — lit universes versus the takeoff target,
with a marker at your best.

## Develop

```sh
npm install
npm run dev      # local dev server (usually http://localhost:5173)
npm test         # Vitest — the simulation + outcome invariants
npm run build    # type-check + production bundle in dist/
```

Vanilla TypeScript + Vite + Vitest, Canvas 2D, **zero runtime dependencies**.
See `CLAUDE.md` for house rules and `docs/DESIGN.md` for the design.

## License

Personal project. All rights reserved (for now).
