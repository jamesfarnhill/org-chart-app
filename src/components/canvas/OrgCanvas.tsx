import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import type { AccountMap, Person, RelationshipType } from "../../types";
import type { Action } from "../../store/accountStore";
import type { CoverageReport } from "../../lib/coverage";
import { CARD_HEIGHT, CARD_WIDTH, EDGE_META } from "../../lib/constants";
import { canvasSize, computeLayout, hitCard, orthogonalConnector } from "../../lib/layout";
import { descendantIds, wouldCreateCycle } from "../../lib/graph";
import { PersonCardView } from "./PersonCard";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.2;
const DRAG_THRESHOLD = 4;

interface PanState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

interface CardDrag {
  personId: string;
  offsetScreenX: number;
  offsetScreenY: number;
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  startX: number;
  startY: number;
  active: boolean;
}

interface Props {
  account: AccountMap;
  selectedId: string | null;
  filteredIds: Set<string>;
  filterActive: boolean;
  showEdges: boolean;
  edgeTypes: Set<RelationshipType>;
  highlightIds: Set<string>;
  coverage: CoverageReport | null;
  focusRequest: { id: string; nonce: number } | null;
  dispatch: Dispatch<Action>;
}

export function OrgCanvas({
  account,
  selectedId,
  filteredIds,
  filterActive,
  showEdges,
  edgeTypes,
  highlightIds,
  coverage,
  focusRequest,
  dispatch,
}: Props) {
  const { people, relationships } = account;
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef({ x: 60, y: 40, zoom: 1 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [panDrag, setPanDrag] = useState<PanState | null>(null);
  const [cardDrag, setCardDrag] = useState<CardDrag | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const cardDragRef = useRef<CardDrag | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dragDescendantsRef = useRef<Set<string>>(new Set());
  const didDragRef = useRef(false);
  const didFitRef = useRef(false);
  const lastFocusNonceRef = useRef(-1);

  cardDragRef.current = cardDrag;
  panZoomRef.current = { x: pan.x, y: pan.y, zoom };
  const cardDragSession = cardDrag !== null;

  // Auto-layout: the tidy tree is derived from structure, so the board always
  // stays centred, evenly spaced, and free of overlaps.
  const positions = useMemo(() => computeLayout(people, false), [people]);
  const size = useMemo(() => canvasSize(positions), [positions]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const ownerInitials = useCallback(
    (person: Person) => {
      if (!person.relationshipOwnerId) return null;
      const owner = account.team.find((t) => t.id === person.relationshipOwnerId);
      if (!owner) return null;
      return owner.name
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    },
    [account.team],
  );

  const hierarchyPaths = useMemo(() => {
    return people
      .filter((p) => p.reportsToId && byId.has(p.reportsToId))
      .map((p) => {
        const from = positions.get(p.reportsToId!);
        const to = positions.get(p.id);
        if (!from || !to) return null;
        const inPath = highlightIds.has(p.id) && highlightIds.has(p.reportsToId!);
        return { id: `${p.reportsToId}-${p.id}`, d: orthogonalConnector(from, to), inPath };
      })
      .filter((v): v is { id: string; d: string; inPath: boolean } => v !== null);
  }, [people, byId, positions, highlightIds]);

  const edgePaths = useMemo(() => {
    if (!showEdges) return [];
    return relationships
      .filter((rel) => edgeTypes.size === 0 || edgeTypes.has(rel.type))
      .map((rel) => {
        const from = positions.get(rel.fromId);
        const to = positions.get(rel.toId);
        if (!from || !to) return null;
        const meta = EDGE_META[rel.type];
        const x1 = from.x + CARD_WIDTH / 2;
        const y1 = from.y + CARD_HEIGHT / 2;
        const x2 = to.x + CARD_WIDTH / 2;
        const y2 = to.y + CARD_HEIGHT / 2;
        return { id: rel.id, x1, y1, x2, y2, meta };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [relationships, positions, showEdges, edgeTypes]);

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { x, y, zoom: scale } = panZoomRef.current;
    return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale };
  }, []);

  const cardScreenPosition = useCallback((person: Person) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const pos = positions.get(person.id);
    if (!rect || !pos) return { x: 0, y: 0 };
    const { x, y, zoom: scale } = panZoomRef.current;
    return { x: rect.left + x + scale * pos.x, y: rect.top + y + scale * pos.y };
  }, [positions]);

  const applyOverlay = useCallback((screenX: number, screenY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${panZoomRef.current.zoom})`;
  }, []);

  // Pan handling.
  useEffect(() => {
    if (!panDrag) return;
    const move = (e: PointerEvent) =>
      setPan({ x: panDrag.originX + (e.clientX - panDrag.startX), y: panDrag.originY + (e.clientY - panDrag.startY) });
    const up = () => setPanDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [panDrag]);

  // Card drag handling.
  useEffect(() => {
    if (!cardDragSession) return;

    const move = (e: PointerEvent) => {
      const current = cardDragRef.current;
      if (!current) return;
      const moved =
        current.active ||
        Math.abs(e.clientX - current.startX) > DRAG_THRESHOLD ||
        Math.abs(e.clientY - current.startY) > DRAG_THRESHOLD;
      if (!moved) return;

      didDragRef.current = true;
      const screenX = e.clientX - current.offsetScreenX;
      const screenY = e.clientY - current.offsetScreenY;
      const canvas = screenToCanvas(screenX, screenY);
      const next: CardDrag = { ...current, active: true, screenX, screenY, canvasX: canvas.x, canvasY: canvas.y };
      cardDragRef.current = next;
      applyOverlay(screenX, screenY);
      if (!current.active) setCardDrag(next);

      // Is the card hovering over a valid drop target (another card)?
      const center = { x: canvas.x + CARD_WIDTH / 2, y: canvas.y + CARD_HEIGHT / 2 };
      const hit = hitCard(people, positions, center, current.personId);
      const valid =
        hit &&
        !dragDescendantsRef.current.has(hit.id) &&
        !wouldCreateCycle(people, current.personId, hit.id)
          ? hit.id
          : null;
      dropTargetRef.current = valid;
      setDropTargetId((prev) => (prev === valid ? prev : valid));
    };

    const up = () => {
      const current = cardDragRef.current;
      // Drop onto another card → become its report (the tree re-lays-out). Drop on
      // open space → snap back (layout is automatic, so there's no free placement).
      if (current?.active && dropTargetRef.current) {
        dispatch({ type: "REPARENT", personId: current.personId, managerId: dropTargetRef.current });
      }
      cardDragRef.current = null;
      dropTargetRef.current = null;
      setCardDrag(null);
      setDropTargetId(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [cardDragSession, applyOverlay, dispatch, people, positions, screenToCanvas]);

  const draggingPerson = cardDrag?.active ? byId.get(cardDrag.personId) ?? null : null;

  useLayoutEffect(() => {
    if (cardDrag?.active) applyOverlay(cardDrag.screenX, cardDrag.screenY);
  }, [applyOverlay, cardDrag?.active, cardDrag?.screenX, cardDrag?.screenY]);

  const startCardDrag = (e: React.PointerEvent<HTMLDivElement>, person: Person) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    e.preventDefault();
    didDragRef.current = false;
    dragDescendantsRef.current = descendantIds(people, person.id);
    const screen = cardScreenPosition(person);
    const pos = positions.get(person.id);
    dispatch({ type: "SELECT", id: person.id });
    setCardDrag({
      personId: person.id,
      offsetScreenX: e.clientX - screen.x,
      offsetScreenY: e.clientY - screen.y,
      screenX: screen.x,
      screenY: screen.y,
      canvasX: pos?.x ?? 0,
      canvasY: pos?.y ?? 0,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const delta = e.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const scale = nextZoom / zoom;
    setPan((p) => ({ x: cursorX - (cursorX - p.x) * scale, y: cursorY - (cursorY - p.y) * scale }));
    setZoom(nextZoom);
  };

  const fitToScreen = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || positions.size === 0) {
      setPan({ x: 60, y: 40 });
      setZoom(1);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    positions.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + CARD_WIDTH);
      maxY = Math.max(maxY, y + CARD_HEIGHT);
    });
    const pad = 80;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(rect.width / w, rect.height / h)));
    setZoom(nextZoom);
    setPan({
      x: (rect.width - (maxX + minX) * nextZoom) / 2,
      y: (rect.height - (maxY + minY) * nextZoom) / 2,
    });
  }, [positions]);

  const centerOn = useCallback(
    (id: string) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      const pos = positions.get(id);
      if (!rect || !pos) return;
      const scale = panZoomRef.current.zoom;
      setPan({
        x: rect.width / 2 - (pos.x + CARD_WIDTH / 2) * scale,
        y: rect.height / 2 - (pos.y + CARD_HEIGHT / 2) * scale,
      });
    },
    [positions],
  );

  // Fit the whole account into view once, after the first layout is available.
  // If we're mounting because of a jump request, let centerOn place the view
  // instead of racing the fit (which would change zoom out from under it).
  useEffect(() => {
    if (didFitRef.current || positions.size === 0) return;
    didFitRef.current = true;
    if (focusRequest && focusRequest.nonce !== lastFocusNonceRef.current) return;
    fitToScreen();
  }, [positions, fitToScreen, focusRequest]);

  // Recenter when something external (command palette, coverage list) asks to focus a person.
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === lastFocusNonceRef.current) return;
    lastFocusNonceRef.current = focusRequest.nonce;
    centerOn(focusRequest.id);
  }, [focusRequest, centerOn]);

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <button type="button" className="tool-btn" title="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.15))}>+</button>
        <button type="button" className="tool-btn" title="Zoom out" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.15))}>−</button>
        <button type="button" className="tool-btn tool-btn--wide" title="Fit to screen" onClick={fitToScreen}>Fit</button>
      </div>

      {people.length === 0 && (
        <button type="button" className="canvas-empty" onClick={() => dispatch({ type: "ADD_PERSON", managerId: null })}>
          + Add first contact
        </button>
      )}

      <div
        ref={viewportRef}
        className={`canvas-viewport${panDrag ? " is-panning" : ""}${cardDrag ? " is-dragging" : ""}`}
        onWheel={onWheel}
      >
        <div
          className="canvas-stage"
          style={{ width: size.width, height: size.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onPointerDown={(e) => {
            if (e.button !== 0 || cardDrag) return;
            if ((e.target as HTMLElement).closest(".card")) return;
            dispatch({ type: "SELECT", id: null });
            setPanDrag({ startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y });
          }}
        >
          <svg
            className={`canvas-svg${filterActive ? " canvas-svg--dimmed" : ""}`}
            width={size.width}
            height={size.height}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {hierarchyPaths.map((p) => (
              <path key={p.id} d={p.d} className={`link${p.inPath ? " link--path" : ""}`} />
            ))}
            {edgePaths.map((e) => (
              <line
                key={e.id}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={e.meta.color}
                strokeWidth={2}
                strokeDasharray={e.meta.dashed ? "6 5" : undefined}
                markerEnd={e.meta.directional ? "url(#arrow)" : undefined}
                opacity={0.8}
              />
            ))}
          </svg>

          {people.map((person) => {
            const isDragging = cardDrag?.personId === person.id && cardDrag.active;
            const dimmed = filterActive && !filteredIds.has(person.id);
            return (
              <div
                key={person.id}
                className="card-anchor"
                style={{ left: positions.get(person.id)?.x ?? 0, top: positions.get(person.id)?.y ?? 0, visibility: isDragging ? "hidden" : "visible" }}
                onPointerDown={(e) => startCardDrag(e, person)}
                onPointerUp={() => {
                  if (!didDragRef.current) dispatch({ type: "SELECT", id: person.id });
                }}
              >
                <PersonCardView
                  person={person}
                  selected={selectedId === person.id}
                  dimmed={dimmed}
                  dropTarget={dropTargetId === person.id}
                  highlighted={highlightIds.has(person.id)}
                  uncovered={coverage?.uncoveredPowerIds.has(person.id)}
                  ownerInitials={ownerInitials(person)}
                  onChangeName={(value) => dispatch({ type: "UPDATE_PERSON", id: person.id, patch: { name: value } })}
                  onChangeTitle={(value) => dispatch({ type: "UPDATE_PERSON", id: person.id, patch: { jobTitle: value } })}
                  onRemove={() => dispatch({ type: "REMOVE_PERSON", id: person.id })}
                  onAddReport={() => dispatch({ type: "ADD_PERSON", managerId: person.id })}
                  onAddManager={() => dispatch({ type: "ADD_MANAGER_ABOVE", personId: person.id })}
                />
              </div>
            );
          })}
        </div>
      </div>

      {draggingPerson && (
        <div ref={overlayRef} className="card-overlay" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <PersonCardView person={draggingPerson} interactive={false} highlighted />
        </div>
      )}
    </div>
  );
}
