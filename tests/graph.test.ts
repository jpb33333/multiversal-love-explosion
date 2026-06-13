import { describe, it, expect } from 'vitest';
import { GraphStore, makeNode } from '../src/sim/graph.ts';

describe('GraphStore', () => {
  it('adds undirected edges symmetrically, dedupes, and ignores self-loops', () => {
    const g = new GraphStore();
    g.add(makeNode(1, 0, 0, 0.5));
    g.add(makeNode(2, 10, 0, 0.5));
    g.addEdge(1, 2);
    g.addEdge(1, 2); // duplicate — ignored
    g.addEdge(1, 1); // self-loop — ignored
    expect(g.get(1)!.neighbors).toEqual([2]);
    expect(g.get(2)!.neighbors).toEqual([1]);
  });

  it('removes a node and scrubs it from neighbors — no dangling edges', () => {
    const g = new GraphStore();
    g.add(makeNode(1, 0, 0, 0.5));
    g.add(makeNode(2, 10, 0, 0.5));
    g.add(makeNode(3, 20, 0, 0.5));
    g.addEdge(1, 2);
    g.addEdge(2, 3);
    g.remove(2);
    expect(g.has(2)).toBe(false);
    expect(g.get(1)!.neighbors).not.toContain(2);
    expect(g.get(3)!.neighbors).not.toContain(2);
    // every remaining neighbor id must resolve to a live node
    for (const n of g.values()) {
      for (const nid of n.neighbors) expect(g.has(nid)).toBe(true);
    }
  });
});
