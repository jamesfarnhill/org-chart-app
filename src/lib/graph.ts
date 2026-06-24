import type { Person, Relationship } from "../types";

export function buildById(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.id, p]));
}

/** Would setting `personId`'s manager to `managerId` create a cycle? */
export function wouldCreateCycle(
  people: Person[],
  personId: string,
  managerId: string | null,
): boolean {
  if (!managerId) return false;
  if (managerId === personId) return true;
  const byId = buildById(people);
  let current: string | null = managerId;
  const seen = new Set<string>();
  while (current) {
    if (current === personId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.reportsToId ?? null;
  }
  return false;
}

/** All descendant ids (reports, transitively) of a person. */
export function descendantIds(people: Person[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  people.forEach((p) => {
    if (!p.reportsToId) return;
    const list = children.get(p.reportsToId) ?? [];
    list.push(p.id);
    children.set(p.reportsToId, list);
  });
  const out = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/**
 * Shortest path from a source person to a target (e.g. Champion -> Economic Buyer)
 * across both reporting lines and influence/ally relationships. Returns the chain
 * of person ids inclusive of both ends, or null if unreachable.
 */
export function pathToPower(
  people: Person[],
  relationships: Relationship[],
  fromId: string,
  toId: string,
): string[] | null {
  if (fromId === toId) return [fromId];
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };

  people.forEach((p) => {
    if (p.reportsToId) {
      link(p.id, p.reportsToId);
      link(p.reportsToId, p.id);
    }
  });
  relationships.forEach((r) => {
    if (r.type === "tension_with") return;
    link(r.fromId, r.toId);
    if (r.type !== "influences") link(r.toId, r.fromId);
  });

  const queue: string[] = [fromId];
  const cameFrom = new Map<string, string | null>([[fromId, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === toId) {
      const path: string[] = [];
      let node: string | null = current;
      while (node) {
        path.unshift(node);
        node = cameFrom.get(node) ?? null;
      }
      return path;
    }
    for (const next of adjacency.get(current) ?? []) {
      if (!cameFrom.has(next)) {
        cameFrom.set(next, current);
        queue.push(next);
      }
    }
  }
  return null;
}
