import type {
  AccountMap,
  BuyingRole,
  FilterState,
  Meddpicc,
  Person,
  Relationship,
  RelationshipType,
  Sentiment,
  ViewMode,
} from "../types";
import { newId, normalizeAccount, normalizePerson, now } from "../lib/persistence";
import { wouldCreateCycle } from "../lib/graph";
import { createSampleAccount } from "../lib/sampleData";

export interface StoreState {
  accounts: AccountMap[];
  activeAccountId: string | null;
  selectedId: string | null;
  view: ViewMode;
  filter: FilterState;
  past: Snapshot[];
  future: Snapshot[];
  /** Groups consecutive text edits into a single undo step. */
  lastCommitKey: string | null;
}

interface Snapshot {
  accounts: AccountMap[];
  activeAccountId: string | null;
}

export const EMPTY_FILTER: FilterState = {
  search: "",
  sentiments: [],
  roles: [],
  minInfluence: 0,
  onlyUncovered: false,
};

export type Action =
  | { type: "HYDRATE"; accounts: AccountMap[]; activeAccountId: string | null }
  | { type: "SET_VIEW"; view: ViewMode }
  | { type: "SELECT"; id: string | null }
  | { type: "SET_FILTER"; patch: Partial<FilterState> }
  | { type: "RESET_FILTER" }
  | { type: "ADD_ACCOUNT" }
  | { type: "SELECT_ACCOUNT"; id: string }
  | { type: "RENAME_ACCOUNT"; id: string; name: string }
  | { type: "DELETE_ACCOUNT"; id: string }
  | { type: "UPDATE_MEDDPICC"; patch: Partial<Meddpicc> }
  | { type: "ADD_PERSON"; managerId: string | null; select?: boolean }
  | { type: "ADD_MANAGER_ABOVE"; personId: string }
  | { type: "UPDATE_PERSON"; id: string; patch: Partial<Person> }
  | { type: "REPARENT"; personId: string; managerId: string | null }
  | { type: "REMOVE_PERSON"; id: string }
  | { type: "ADD_RELATIONSHIP"; fromId: string; toId: string; relType: RelationshipType }
  | { type: "UPDATE_RELATIONSHIP"; id: string; patch: Partial<Relationship> }
  | { type: "REMOVE_RELATIONSHIP"; id: string }
  | { type: "UNDO" }
  | { type: "REDO" };

const HISTORY_LIMIT = 50;

const MUTATING: ReadonlySet<Action["type"]> = new Set([
  "ADD_ACCOUNT",
  "RENAME_ACCOUNT",
  "DELETE_ACCOUNT",
  "UPDATE_MEDDPICC",
  "ADD_PERSON",
  "ADD_MANAGER_ABOVE",
  "UPDATE_PERSON",
  "REPARENT",
  "REMOVE_PERSON",
  "ADD_RELATIONSHIP",
  "UPDATE_RELATIONSHIP",
  "REMOVE_RELATIONSHIP",
]);

export function initialState(): StoreState {
  return {
    accounts: [],
    activeAccountId: null,
    selectedId: null,
    view: "tree",
    filter: EMPTY_FILTER,
    past: [],
    future: [],
    lastCommitKey: null,
  };
}

const TEXT_FIELDS = new Set(["name", "jobTitle", "department", "notes", "priorities", "nextStep"]);

/**
 * For text-style edits, return a stable key so consecutive keystrokes coalesce
 * into one undo step. Discrete edits (sentiment, influence, roles, reparent…)
 * return null and always create their own undo step.
 */
function coalesceKey(action: Action): string | null {
  if (action.type === "UPDATE_PERSON") {
    const keys = Object.keys(action.patch);
    if (keys.length > 0 && keys.every((k) => TEXT_FIELDS.has(k))) {
      return `up:${action.id}:${keys.sort().join(",")}`;
    }
    return null;
  }
  if (action.type === "RENAME_ACCOUNT") return `ra:${action.id}`;
  if (action.type === "UPDATE_MEDDPICC") return "mp";
  if (action.type === "UPDATE_RELATIONSHIP") {
    const keys = Object.keys(action.patch);
    return keys.length === 1 && keys[0] === "note" ? `ur:${action.id}` : null;
  }
  return null;
}

export function getActiveAccount(state: StoreState): AccountMap | null {
  return state.accounts.find((a) => a.id === state.activeAccountId) ?? null;
}

export function reducer(state: StoreState, action: Action): StoreState {
  const next = applyAction(state, action);
  if (next === state) return state;

  if (MUTATING.has(action.type)) {
    const key = coalesceKey(action);
    // Coalesce: a run of edits with the same key shares one undo snapshot.
    if (key && key === state.lastCommitKey) {
      return { ...next, lastCommitKey: key };
    }
    const snapshot: Snapshot = { accounts: state.accounts, activeAccountId: state.activeAccountId };
    return {
      ...next,
      past: [...state.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
      lastCommitKey: key,
    };
  }
  // Non-mutating actions end any text-edit run.
  return { ...next, lastCommitKey: null };
}

function applyAction(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        accounts: action.accounts,
        activeAccountId: action.activeAccountId ?? action.accounts[0]?.id ?? null,
        selectedId: null,
        past: [],
        future: [],
      };

    case "SET_VIEW":
      return state.view === action.view ? state : { ...state, view: action.view };

    case "SELECT":
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };

    case "SET_FILTER":
      return { ...state, filter: { ...state.filter, ...action.patch } };

    case "RESET_FILTER":
      return { ...state, filter: EMPTY_FILTER };

    case "ADD_ACCOUNT": {
      const account = normalizeAccount({
        id: newId("acct"),
        accountName: "New account",
        people: [],
        relationships: [],
        team: [],
        updatedAt: now(),
      });
      return {
        ...state,
        accounts: [...state.accounts, account],
        activeAccountId: account.id,
        selectedId: null,
      };
    }

    case "SELECT_ACCOUNT":
      return { ...state, activeAccountId: action.id, selectedId: null, filter: EMPTY_FILTER };

    case "RENAME_ACCOUNT":
      return updateAccountById(state, action.id, (acct) => ({ ...acct, accountName: action.name }));

    case "DELETE_ACCOUNT": {
      const accounts = state.accounts.filter((a) => a.id !== action.id);
      const activeAccountId =
        state.activeAccountId === action.id ? accounts[0]?.id ?? null : state.activeAccountId;
      return { ...state, accounts, activeAccountId, selectedId: null };
    }

    case "UPDATE_MEDDPICC":
      return updateActive(state, (acct) => ({
        ...acct,
        meddpicc: { ...(acct.meddpicc ?? {}), ...action.patch },
      }));

    case "ADD_PERSON": {
      const acct = getActiveAccount(state);
      if (!acct) return state;
      const person = normalizePerson({
        id: newId(),
        name: "New contact",
        jobTitle: "",
        reportsToId: action.managerId,
        updatedAt: now(),
      });
      const updated = updateActive(state, (a) => ({ ...a, people: [...a.people, person] }));
      return action.select === false ? updated : { ...updated, selectedId: person.id };
    }

    case "ADD_MANAGER_ABOVE": {
      const acct = getActiveAccount(state);
      const target = acct?.people.find((p) => p.id === action.personId);
      if (!acct || !target) return state;
      const manager = normalizePerson({
        id: newId(),
        name: "New manager",
        jobTitle: "",
        reportsToId: target.reportsToId,
        updatedAt: now(),
      });
      const updated = updateActive(state, (a) => ({
        ...a,
        people: [
          ...a.people.map((p) =>
            p.id === target.id ? { ...p, reportsToId: manager.id, updatedAt: now() } : p,
          ),
          manager,
        ],
      }));
      return { ...updated, selectedId: manager.id };
    }

    case "UPDATE_PERSON":
      return updateActive(state, (acct) => ({
        ...acct,
        people: acct.people.map((p) =>
          p.id === action.id ? { ...p, ...action.patch, updatedAt: now() } : p,
        ),
      }));

    case "REPARENT": {
      const acct = getActiveAccount(state);
      if (!acct) return state;
      if (action.managerId === action.personId) return state;
      if (wouldCreateCycle(acct.people, action.personId, action.managerId)) return state;
      // The tree auto-lays-out, so we only change the reporting line here.
      const updated = updateActive(state, (a) => ({
        ...a,
        people: a.people.map((p) =>
          p.id === action.personId
            ? { ...p, reportsToId: action.managerId, updatedAt: now() }
            : p,
        ),
      }));
      return { ...updated, selectedId: action.personId };
    }

    case "REMOVE_PERSON": {
      const acct = getActiveAccount(state);
      const target = acct?.people.find((p) => p.id === action.id);
      if (!acct || !target) return state;
      const updated = updateActive(state, (a) => {
        const meddpicc = a.meddpicc
          ? {
              ...a.meddpicc,
              economicBuyerId: a.meddpicc.economicBuyerId === action.id ? null : a.meddpicc.economicBuyerId,
              championId: a.meddpicc.championId === action.id ? null : a.meddpicc.championId,
            }
          : a.meddpicc;
        return {
          ...a,
          meddpicc,
          people: a.people
            .filter((p) => p.id !== action.id)
            .map((p) =>
              p.reportsToId === action.id
                ? { ...p, reportsToId: target.reportsToId, updatedAt: now() }
                : p,
            ),
          relationships: a.relationships.filter(
            (r) => r.fromId !== action.id && r.toId !== action.id,
          ),
        };
      });
      return { ...updated, selectedId: state.selectedId === action.id ? null : state.selectedId };
    }

    case "ADD_RELATIONSHIP": {
      if (action.fromId === action.toId) return state;
      return updateActive(state, (acct) => {
        const exists = acct.relationships.some(
          (r) => r.fromId === action.fromId && r.toId === action.toId && r.type === action.relType,
        );
        if (exists) return acct;
        const relationship: Relationship = {
          id: newId("rel"),
          fromId: action.fromId,
          toId: action.toId,
          type: action.relType,
          strength: 2,
        };
        return { ...acct, relationships: [...acct.relationships, relationship] };
      });
    }

    case "UPDATE_RELATIONSHIP":
      return updateActive(state, (acct) => ({
        ...acct,
        relationships: acct.relationships.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r,
        ),
      }));

    case "REMOVE_RELATIONSHIP":
      return updateActive(state, (acct) => ({
        ...acct,
        relationships: acct.relationships.filter((r) => r.id !== action.id),
      }));

    case "UNDO": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        accounts: previous.accounts,
        activeAccountId: previous.activeAccountId,
        past: state.past.slice(0, -1),
        future: [{ accounts: state.accounts, activeAccountId: state.activeAccountId }, ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
      };
    }

    case "REDO": {
      const nextSnap = state.future[0];
      if (!nextSnap) return state;
      return {
        ...state,
        accounts: nextSnap.accounts,
        activeAccountId: nextSnap.activeAccountId,
        past: [...state.past, { accounts: state.accounts, activeAccountId: state.activeAccountId }].slice(
          -HISTORY_LIMIT,
        ),
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}

function updateActive(state: StoreState, fn: (acct: AccountMap) => AccountMap): StoreState {
  if (!state.activeAccountId) return state;
  return updateAccountById(state, state.activeAccountId, fn);
}


function updateAccountById(
  state: StoreState,
  id: string,
  fn: (acct: AccountMap) => AccountMap,
): StoreState {
  let changed = false;
  const accounts = state.accounts.map((acct) => {
    if (acct.id !== id) return acct;
    const updated = fn(acct);
    if (updated === acct) return acct;
    changed = true;
    return { ...updated, updatedAt: now() };
  });
  return changed ? { ...state, accounts } : state;
}

export { createSampleAccount };
export type { BuyingRole, Sentiment };
