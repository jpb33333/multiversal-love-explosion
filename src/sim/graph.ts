// The multiverse graph: universe nodes connected by undirected edges. Pure data
// plus a tiny store; the dynamics live in dynamics.ts / spawn.ts / Multiverse.ts.
// The node type is `MvNode`, not `Node`, to avoid shadowing the DOM global.

export interface MvNode {
  id: number;
  x: number;
  y: number;
  love: number; // 0..1 — 0 = entropy, 1 = love, 0.5 = neutral
  loveNext: number; // double-buffer scratch for the synchronous update
  pour: number; // love/s a player is pouring in THIS tick (consumed by dynamics)
  age: number; // seconds since spawn
  dying: boolean; // overflowed — now bursting and fading out
  dieT: number; // 0..1 fade progress once dying (1 ⇒ cull)
  burstLove: boolean; // true if it overflowed into JOY, false into DARKNESS (fade colour)
  neighbors: number[]; // ids of edge-connected neighbours (undirected, deduped)
}

export function makeNode(id: number, x: number, y: number, love: number): MvNode {
  return {
    id,
    x,
    y,
    love,
    loveNext: love,
    pour: 0,
    age: 0,
    dying: false,
    dieT: 0,
    burstLove: false,
    neighbors: [],
  };
}

export class GraphStore {
  private map = new Map<number, MvNode>();

  add(node: MvNode): void {
    this.map.set(node.id, node);
  }

  get(id: number): MvNode | undefined {
    return this.map.get(id);
  }

  has(id: number): boolean {
    return this.map.has(id);
  }

  get size(): number {
    return this.map.size;
  }

  values(): IterableIterator<MvNode> {
    return this.map.values();
  }

  // Add an undirected edge. No-op for self-loops, missing nodes, or duplicates.
  addEdge(a: number, b: number): void {
    if (a === b) return;
    const na = this.map.get(a);
    const nb = this.map.get(b);
    if (!na || !nb) return;
    if (!na.neighbors.includes(b)) na.neighbors.push(b);
    if (!nb.neighbors.includes(a)) nb.neighbors.push(a);
  }

  // Remove a node and scrub its id from every neighbour's list — no dangling
  // edges after a cull (asserted in tests).
  remove(id: number): void {
    const node = this.map.get(id);
    if (!node) return;
    for (const nid of node.neighbors) {
      const nb = this.map.get(nid);
      if (!nb) continue;
      const idx = nb.neighbors.indexOf(id);
      if (idx >= 0) nb.neighbors.splice(idx, 1);
    }
    this.map.delete(id);
  }
}
