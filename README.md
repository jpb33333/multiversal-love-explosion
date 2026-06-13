# Multiversal Love Explosion

A two-player, same-screen co-op game about helping **love** outshine **entropy**
across an ever-expanding network of universes.

The multiverse is a living graph: each node is a universe, each edge a
connection to a neighbor. Two forces spread across the edges every moment —
love (from loving neighbors and your touch) and entropy (a constant, growing
drag). You and your partner nurture undecided universes toward love; when a
cluster of loving universes settles, you **lock it in** — it crystallizes,
banks toward victory, relieves the pressure, and fades into the background
constellation. New universes bloom faster and faster. Tip the balance
decisively and the multiverse goes off in a **Love Explosion** (you win). Let
entropy take over and it ends in **Entropy Collapse** (you lose).

Because locked and dead universes are continually culled from the live
simulation, only a few hundred are ever active at once — so the multiverse can
expand effectively **forever**, the escalation is what forces a resolution.

## Play

- **Player 1 — pointer/touch.** Move over a universe and hold to pour love into it.
- **Player 2 — keyboard.** Arrow keys / WASD hop your selector between universes; Space (or Enter) pours love.
- **The love bond.** When *both* of you hold a caress on two nearby-connected
  universes at once, you forge a bond: it floods a whole neighborhood with love
  and can lock it in instantly. Late game, you can only win by bonding together.

## Develop

```sh
npm install
npm run dev      # local dev server (usually http://localhost:5173)
npm test         # Vitest — the simulation + outcome invariants
npm run build    # type-check + production bundle in dist/
```

Vanilla TypeScript + Vite + Vitest, Canvas 2D, **zero runtime dependencies**.
See `CLAUDE.md` for house rules and `docs/` for the design.

## License

Personal project. All rights reserved (for now).
