// The network of universes. Each is either `dormant` (dark, waiting) or `lit`
// (carrying a love `signal` 0..1 that decays and spreads). Pure data + a tiny
// store; the dynamics live in spread.ts / spawn.ts / Multiverse.ts. Named
// `MvNode`, not `Node`, to avoid shadowing the DOM global.

export type NodeState = 'dormant' | 'lit';

export interface MvNode {
  id: number;
  x: number;
  y: number;
  state: NodeState;
  signal: number; // 0..1 love signal (dormant universes sit at 0)
  spreadAcc: number; // accumulates toward igniting a neighbour
  age: number; // seconds since spawn
  flash: number; // 0..1 ignite flash, fades for a render pop
  neighbors: number[]; // ids of edge-connected neighbours (undirected, deduped)
}

export function makeNode(id: number, x: number, y: number): MvNode {
  return {
    id,
    x,
    y,
    state: 'dormant',
    signal: 0,
    spreadAcc: 0,
    age: 0,
    flash: 0,
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

  addEdge(a: number, b: number): void {
    if (a === b) return;
    const na = this.map.get(a);
    const nb = this.map.get(b);
    if (!na || !nb) return;
    if (!na.neighbors.includes(b)) na.neighbors.push(b);
    if (!nb.neighbors.includes(a)) nb.neighbors.push(a);
  }

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
