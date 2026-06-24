import type { Person } from "../types";
import {
  CANVAS_PADDING,
  CARD_HEIGHT,
  CARD_WIDTH,
  LEVEL_GAP,
  MIN_CANVAS_HEIGHT,
  MIN_CANVAS_WIDTH,
  ROW_GAP,
} from "./constants";

interface LayoutNode {
  person: Person;
  children: LayoutNode[];
  width: number;
  x: number;
  y: number;
}

// Cards snap to this lattice so the board stays neat and aligns with auto-arrange.
export const GRID_X = CARD_WIDTH + ROW_GAP;
export const GRID_Y = CARD_HEIGHT + LEVEL_GAP;

export function snapToGrid(x: number, y: number): { x: number; y: number } {
  const snappedX = CANVAS_PADDING + Math.round((x - CANVAS_PADDING) / GRID_X) * GRID_X;
  const snappedY = CANVAS_PADDING + Math.round((y - CANVAS_PADDING) / GRID_Y) * GRID_Y;
  return { x: Math.max(0, snappedX), y: Math.max(0, snappedY) };
}

/**
 * Snap a dropped card relative to the nearest other card so it aligns exactly to
 * that neighbour's row and column (even when the board has drifted off the
 * absolute grid). Falls back to the absolute grid when the board is empty.
 */
export function snapToBoard(
  x: number,
  y: number,
  others: { x: number; y: number }[],
): { x: number; y: number } {
  if (others.length === 0) return snapToGrid(x, y);

  let anchor = others[0];
  let bestDist = Infinity;
  for (const other of others) {
    const dist = Math.hypot(other.x - x, other.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      anchor = other;
    }
  }

  const snappedX = anchor.x + Math.round((x - anchor.x) / GRID_X) * GRID_X;
  const snappedY = anchor.y + Math.round((y - anchor.y) / GRID_Y) * GRID_Y;
  return { x: Math.max(0, snappedX), y: Math.max(0, snappedY) };
}

/**
 * Tidy top-down tree layout. Returns a map of id -> position. When
 * `respectPinned` is true, people with a manual (x, y) keep it; pass false to
 * compute a fresh tidy arrangement for everyone (used by the Arrange action).
 */
export function computeLayout(
  people: Person[],
  respectPinned = true,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (people.length === 0) return positions;

  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenMap = new Map<string, Person[]>();

  people.forEach((person) => {
    const parentId = person.reportsToId;
    if (!parentId || !byId.has(parentId)) return;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(person);
    childrenMap.set(parentId, siblings);
  });

  // Order siblings by influence (desc) then name, so the most important people read first.
  childrenMap.forEach((siblings) =>
    siblings.sort((a, b) => b.influence - a.influence || a.name.localeCompare(b.name)),
  );

  const roots = people
    .filter((person) => !person.reportsToId || !byId.has(person.reportsToId))
    .sort((a, b) => b.influence - a.influence || a.name.localeCompare(b.name));

  let cursorX = CANVAS_PADDING;
  roots.forEach((root) => {
    const tree = buildNode(root, childrenMap);
    assign(tree, cursorX, 0, positions);
    cursorX += tree.width + ROW_GAP * 2;
  });

  // Pinned people override auto positions with their manual coordinates.
  if (respectPinned) {
    people.forEach((person) => {
      if (person.pinned && person.x !== null && person.y !== null) {
        positions.set(person.id, { x: person.x, y: person.y });
      }
    });
  }

  return positions;
}

/**
 * Horizontally centre every parent over its direct children (keeping vertical
 * positions and children's x untouched). Processes deepest parents first so a
 * grandparent centres over already-centred parents. Used after structural
 * changes so the tree stays neat without a full re-layout.
 */
export function centerParents(people: Person[]): Person[] {
  const result = people.map((p) => ({ ...p }));
  const byId = new Map(result.map((p) => [p.id, p]));
  const groups = new Map<string, Person[]>();
  result.forEach((p) => {
    if (p.reportsToId && byId.has(p.reportsToId)) {
      const group = groups.get(p.reportsToId) ?? [];
      group.push(p);
      groups.set(p.reportsToId, group);
    }
  });

  const depthOf = (id: string): number => {
    let depth = 0;
    let current = byId.get(id);
    const seen = new Set<string>();
    while (current?.reportsToId && byId.has(current.reportsToId) && !seen.has(current.id)) {
      seen.add(current.id);
      depth += 1;
      current = byId.get(current.reportsToId);
    }
    return depth;
  };

  [...groups.keys()]
    .sort((a, b) => depthOf(b) - depthOf(a))
    .forEach((parentId) => {
      const kids = groups.get(parentId)!;
      const xs = kids.map((k) => k.x ?? 0);
      const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      const parent = byId.get(parentId);
      if (parent) parent.x = mid;
    });

  return result;
}

/**
 * Manual-layout model: every card carries its own (x, y). This fills in
 * positions only for people who don't yet have one (e.g. legacy data or a fresh
 * import) using a one-off tidy layout, while leaving placed cards untouched.
 */
export function seedPositions(people: Person[]): Person[] {
  const needsSeed = people.some((p) => p.x === null || p.y === null);
  if (!needsSeed) return people;
  const tidy = computeLayout(people, false);
  return people.map((p) => {
    if (p.x !== null && p.y !== null) return p;
    const pos = tidy.get(p.id);
    return { ...p, x: pos?.x ?? CANVAS_PADDING, y: pos?.y ?? CANVAS_PADDING };
  });
}

function buildNode(person: Person, childrenMap: Map<string, Person[]>): LayoutNode {
  const children = (childrenMap.get(person.id) ?? []).map((child) => buildNode(child, childrenMap));
  const childrenWidth = children.reduce(
    (sum, child, index) => sum + child.width + (index > 0 ? ROW_GAP : 0),
    0,
  );
  return { person, children, width: Math.max(CARD_WIDTH, childrenWidth), x: 0, y: 0 };
}

function assign(
  node: LayoutNode,
  left: number,
  depth: number,
  positions: Map<string, { x: number; y: number }>,
): void {
  const y = CANVAS_PADDING + depth * (CARD_HEIGHT + LEVEL_GAP);

  // Leaf: centre in its own (card-width) band.
  if (node.children.length === 0) {
    positions.set(node.person.id, { x: left + node.width / 2 - CARD_WIDTH / 2, y });
    return;
  }

  // Lay children out left-to-right within this node's band (widths prevent overlap).
  const childrenWidth = node.children.reduce(
    (sum, child, index) => sum + child.width + (index > 0 ? ROW_GAP : 0),
    0,
  );
  let childLeft = left + (node.width - childrenWidth) / 2;
  node.children.forEach((child) => {
    assign(child, childLeft, depth + 1, positions);
    childLeft += child.width + ROW_GAP;
  });

  // Centre the parent over the midpoint of its children's actual card centres, so
  // it reads as centred above them regardless of differing subtree widths.
  const centers = node.children.map((child) => positions.get(child.person.id)!.x + CARD_WIDTH / 2);
  const mid = (centers[0] + centers[centers.length - 1]) / 2;
  positions.set(node.person.id, { x: mid - CARD_WIDTH / 2, y });
}

export function canvasSize(
  positions: Map<string, { x: number; y: number }>,
): { width: number; height: number } {
  let maxX = MIN_CANVAS_WIDTH;
  let maxY = MIN_CANVAS_HEIGHT;
  positions.forEach(({ x, y }) => {
    maxX = Math.max(maxX, x + CARD_WIDTH + CANVAS_PADDING);
    maxY = Math.max(maxY, y + CARD_HEIGHT + CANVAS_PADDING);
  });
  return { width: maxX, height: maxY };
}

export function orthogonalConnector(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const startX = from.x + CARD_WIDTH / 2;
  const startY = from.y + CARD_HEIGHT;
  const endX = to.x + CARD_WIDTH / 2;
  const endY = to.y;
  const midY = startY + (endY - startY) / 2;
  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
}

export function hitCard(
  people: Person[],
  positions: Map<string, { x: number; y: number }>,
  point: { x: number; y: number },
  exceptId?: string,
): Person | null {
  for (let i = people.length - 1; i >= 0; i -= 1) {
    const person = people[i];
    if (person.id === exceptId) continue;
    const pos = positions.get(person.id);
    if (!pos) continue;
    if (
      point.x >= pos.x &&
      point.x <= pos.x + CARD_WIDTH &&
      point.y >= pos.y &&
      point.y <= pos.y + CARD_HEIGHT
    ) {
      return person;
    }
  }
  return null;
}
