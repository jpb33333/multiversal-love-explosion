# Multiversal Love Explosion

A 1–2 player co-op game about holding back entropy across a network of universes
— and tipping it into joy. The core is borrowed from Pandemic's outbreak
cascades.

The multiverse is a web of universes. Each one slowly cools toward **entropy**;
when one bottoms out it **overflows**, bursting darkness onto its neighbors,
which can chain into an outbreak. You and your partner pour **love** into
universes to hold the line — and when you fill one all the way, it overflows the
other way: a **burst of joy** that splashes love to its neighbors.

Two race tracks sit at the top of the screen. Rack up enough **love-bursts** and
the multiverse goes off in a **Love Explosion** (you win). Let too many
**entropy-outbreaks** stack up and it ends in **Entropy Collapse** (you lose).
The pressure rises over time — entropy cools faster the longer you play.

## Play

- **Player 1 — mouse:** hover over a universe and **hold** to pour in love.
- **Player 2 — keyboard:** **arrows / WASD** move your cursor, **Space** pours love.
- **M** mutes the sound.

Watch a universe's color (cold = entropy, warm = love) and the pulsing rings: a
cold pulse means it's about to outbreak; a warm pulse means it's about to burst
with joy.

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
