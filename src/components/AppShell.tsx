import { useEffect, useMemo, useRef, useState } from "react";
import type { RelationshipType, ViewMode } from "../types";
import { useDispatch, useStore } from "../store/StoreContext";
import { getActiveAccount } from "../store/accountStore";
import { isFilterActive, useCoverage, useFilteredIds } from "../store/selectors";
import { pathToPower } from "../lib/graph";
import { downloadAccountJson, parseAccountJson, pickJsonFile, printCurrentView } from "../lib/export";
import { normalizeAccount } from "../lib/persistence";
import { OrgCanvas } from "./canvas/OrgCanvas";
import { PowerMap } from "./PowerMap";
import { CoveragePanel } from "./CoveragePanel";
import { Inspector } from "./Inspector";
import { Legend } from "./Legend";
import { CommandPalette } from "./CommandPalette";
import { HelpModal } from "./HelpModal";
import { AdminPanel } from "./auth/AdminPanel";
import { useAuth } from "../auth/context";

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Org map" },
  { id: "power", label: "Power map" },
  { id: "coverage", label: "Coverage" },
];

export function AppShell() {
  const state = useStore();
  const dispatch = useDispatch();
  const account = useMemo(() => getActiveAccount(state), [state]);
  const coverage = useCoverage(account);

  const [showEdges, setShowEdges] = useState(true);
  const [edgeTypes, setEdgeTypes] = useState<Set<RelationshipType>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const toggleEdgeType = (type: RelationshipType) => {
    setEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const focusNonce = useRef(0);

  const jumpToPerson = (id: string) => {
    dispatch({ type: "SET_VIEW", view: "tree" });
    dispatch({ type: "SELECT", id });
    focusNonce.current += 1;
    setFocus({ id, nonce: focusNonce.current });
  };

  const filteredIds = useFilteredIds(account?.people ?? [], state.filter, coverage);
  const filterActive = isFilterActive(state.filter);

  const selectedPerson = account?.people.find((p) => p.id === state.selectedId) ?? null;

  // Highlight the path Champion -> Economic Buyer when nothing else is selected-driven.
  const highlightIds = useMemo(() => {
    if (!account) return new Set<string>();
    // Only surface the Champion -> Economic Buyer path when nothing is selected,
    // so it doesn't visually compete with selection/filter highlights.
    if (state.view !== "tree" || state.selectedId) return new Set<string>();
    const champ = account.meddpicc?.championId ?? account.people.find((p) => p.buyingRoles.includes("champion"))?.id;
    const eb = account.meddpicc?.economicBuyerId ?? account.people.find((p) => p.buyingRoles.includes("economic_buyer"))?.id;
    if (!champ || !eb) return new Set<string>();
    const path = pathToPower(account.people, account.relationships, champ, eb);
    return new Set(path ?? []);
  }, [account, state.view, state.selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedId) {
        e.preventDefault();
        dispatch({ type: "REMOVE_PERSON", id: state.selectedId });
      }
      if (e.key === "Escape") dispatch({ type: "SELECT", id: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.selectedId]);

  if (!account) {
    return (
      <div className="shell shell--empty">
        <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "ADD_ACCOUNT" })}>
          Create your first account map
        </button>
      </div>
    );
  }

  const importAccount = async () => {
    const json = await pickJsonFile();
    if (!json) return;
    const parsed = parseAccountJson(json);
    if (!parsed) {
      window.alert("That file didn't look like a valid account map export.");
      return;
    }
    const fresh = normalizeAccount({ ...parsed, id: undefined });
    dispatch({ type: "HYDRATE", accounts: [...state.accounts, fresh], activeAccountId: fresh.id });
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__group topbar__group--account">
          <input
            className="topbar__account-name"
            value={account.accountName}
            onChange={(e) => dispatch({ type: "RENAME_ACCOUNT", id: account.id, name: e.target.value })}
          />
          {state.accounts.length > 1 && (
            <select
              className="topbar__select"
              value={account.id}
              onChange={(e) => dispatch({ type: "SELECT_ACCOUNT", id: e.target.value })}
            >
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accountName}</option>
              ))}
            </select>
          )}
          <button type="button" className="icon-btn" title="New account" onClick={() => dispatch({ type: "ADD_ACCOUNT" })}>＋</button>
        </div>

        <nav className="tabs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab${state.view === tab.id ? " is-active" : ""}`}
              onClick={() => dispatch({ type: "SET_VIEW", view: tab.id })}
            >
              {tab.label}
              {tab.id === "coverage" && coverage && coverage.findings.some((f) => f.severity === "critical") && (
                <span className="tab__alert" />
              )}
            </button>
          ))}
        </nav>

        <div className="topbar__group topbar__group--actions">
          <div className="search">
            <input
              className="search__input"
              value={state.filter.search}
              placeholder="Filter… (⌘K to jump)"
              onChange={(e) => dispatch({ type: "SET_FILTER", patch: { search: e.target.value } })}
            />
          </div>
          {state.view === "tree" && (
            <button
              type="button"
              className={`icon-btn${showEdges ? " is-active" : ""}`}
              title="Toggle relationship links"
              onClick={() => setShowEdges((v) => !v)}
            >
              Links
            </button>
          )}
          <button type="button" className="icon-btn" title="Undo (⌘Z)" disabled={state.past.length === 0} onClick={() => dispatch({ type: "UNDO" })}>↶</button>
          <button type="button" className="icon-btn" title="Redo (⇧⌘Z)" disabled={state.future.length === 0} onClick={() => dispatch({ type: "REDO" })}>↷</button>
          <button type="button" className="icon-btn" title="Export JSON" onClick={() => downloadAccountJson(account)}>Export</button>
          <button type="button" className="icon-btn" title="Import JSON" onClick={importAccount}>Import</button>
          <button type="button" className="icon-btn" title="Print / PDF" onClick={printCurrentView}>Print</button>
          <button type="button" className="icon-btn" title="Help &amp; guide" onClick={() => setHelpOpen(true)}>? Help</button>
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "ADD_PERSON", managerId: null })}>＋ Contact</button>
          <div className="account-menu">
            {currentUser?.role === "admin" && (
              <button type="button" className="icon-btn" title="Admin · manage users" onClick={() => setAdminOpen(true)}>Admin</button>
            )}
            <span className="account-menu__who" title={currentUser?.email}>
              {currentUser?.displayName}
            </span>
            <button type="button" className="icon-btn" title="Sign out" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className={`stage stage--${state.view}${selectedPerson ? " stage--inspecting" : ""}`}>
        <div className="stage__view">
          {state.view === "tree" && (
            <OrgCanvas
              account={account}
              selectedId={state.selectedId}
              filteredIds={filteredIds}
              filterActive={filterActive}
              showEdges={showEdges}
              edgeTypes={edgeTypes}
              highlightIds={highlightIds}
              coverage={coverage}
              focusRequest={focus}
              dispatch={dispatch}
            />
          )}
          {state.view === "power" && (
            <PowerMap
              account={account}
              selectedId={state.selectedId}
              filteredIds={filteredIds}
              filterActive={filterActive}
              dispatch={dispatch}
            />
          )}
          {state.view === "coverage" && coverage && (
            <CoveragePanel account={account} coverage={coverage} dispatch={dispatch} />
          )}

          {state.view !== "coverage" && (
            <div className="overlays">
              <Legend
                filter={state.filter}
                showEdges={showEdges && state.view === "tree"}
                edgeTypes={edgeTypes}
                onToggleEdgeType={toggleEdgeType}
                dispatch={dispatch}
              />
              <div className="quick-filters">
                <button
                  type="button"
                  className={`quick${state.filter.onlyUncovered ? " is-active" : ""}`}
                  onClick={() => dispatch({ type: "SET_FILTER", patch: { onlyUncovered: !state.filter.onlyUncovered } })}
                >
                  Power blindspots
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedPerson && (
          <Inspector
            account={account}
            person={selectedPerson}
            dispatch={dispatch}
            onClose={() => dispatch({ type: "SELECT", id: null })}
          />
        )}
      </main>

      {paletteOpen && (
        <CommandPalette
          account={account}
          onPick={jumpToPerson}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
