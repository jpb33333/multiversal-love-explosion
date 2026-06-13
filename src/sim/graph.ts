// The multiverse graph: universe nodes connected by undirected edges. Pure data
// + a tiny store; all the dynamics live in contagion.ts / spawn.ts / lockin.ts.
//
// The node type is `MvNode`, not `Node`, on purpose — the DOM lib defines a
// global `Node`, and shadowing it invites confusing bugs.

export type NodeState = 'potential' | 'loving' | 'unloving' | 'locked';

export interface MvNode {
  id: number;
  x: number;
  y: number;
  state: NodeState;
  love: number; // 0..1 order parameter (0 = entropy, 1 = love, 0.5 = undecided)
  loveNext: number; // double-buffer scratch for the synchronous contagion update
  nudge: number; // love/s a player is pouring in THIS tick (consumed by contagion)
  age: number; // seconds since spawn
  commitTimer: number; // seconds a commit threshold has held (while potential)
  lovingTimer: number; // seconds continuously loving (for lock-in stability)
  strandedTimer: number; // seconds unloving with no living neighbor (for culling)
  lockedAt: number; // sim time when locked, else -1 (drives fade → cull)
  neighbors: number[]; // ids of edge-connected neighbors (undirected, deduped)
}

export function makeNode(id: number, x: number, y: number, love: number): MvNode {
  return {
    id,
    x,
    y,
    state: 'potential',
    love,
    loveNext: love,
    nudge: 0,
    age: 0,
    commitTimer: 0,
    lovingTimer: 0,
    strandedTimer: 0,
    lockedAt: -1,
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

  // Add an undirected edge. No-op for self-loops, missing nodes, or duplicates,
  // so the neighbor lists never carry a stale or doubled id.
  addEdge(a: number, b: number): void {
    if (a === b) return;
    const na = this.map.get(a);
    const nb = this.map.get(b);
    if (!na || !nb) return;
    if (!na.neighbors.includes(b)) na.neighbors.push(b);
    if (!nb.neighbors.includes(a)) nb.neighbors.push(a);
  }

  // Remove a node AND scrub its id from every neighbor's list — there are never
  // dangling edges after a cull (asserted in tests).
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
