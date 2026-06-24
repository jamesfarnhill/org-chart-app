import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { Action, StoreState } from "./accountStore";
import { initialState, reducer } from "./accountStore";
import { createSampleAccount } from "../lib/sampleData";
import { loadState, saveState } from "../lib/persistence";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { loadCloudState, saveCloudState } from "../lib/cloudPersistence";

const StateContext = createContext<StoreState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const cloud = isSupabaseConfigured();

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = cloud ? await loadCloudState() : loadState(userId);
      if (!active) return;
      if (saved && saved.accounts.length > 0) {
        dispatch({ type: "HYDRATE", accounts: saved.accounts, activeAccountId: saved.activeAccountId });
      } else {
        const sample = createSampleAccount();
        dispatch({ type: "HYDRATE", accounts: [sample], activeAccountId: sample.id });
      }
      hydratedRef.current = true;
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [userId, cloud]);

  // Debounced persistence so typing doesn't thrash storage.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot = { version: 3 as const, accounts: state.accounts, activeAccountId: state.activeAccountId };
    const handle = window.setTimeout(() => {
      if (cloud) void saveCloudState(snapshot);
      else saveState(snapshot, userId);
    }, 600);
    return () => window.clearTimeout(handle);
  }, [state.accounts, state.activeAccountId, userId, cloud]);

  // Global undo/redo shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      dispatch({ type: event.shiftKey ? "REDO" : "UNDO" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {hydrated ? children : <div className="boot" />}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useStore(): StoreState {
  const value = useContext(StateContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

export function useDispatch(): Dispatch<Action> {
  const value = useContext(DispatchContext);
  if (!value) throw new Error("useDispatch must be used within StoreProvider");
  return value;
}
