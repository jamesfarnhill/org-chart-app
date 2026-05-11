import type { Account, PersistedState } from "../types";

const STORAGE_KEY = "pocc:v1";

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedState(parsed)) return null;
    return {
      version: 1,
      accounts: (parsed.accounts as Account[]).map((x) => normalizeAccount(x)),
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isPersistedState(v: unknown): v is PersistedState {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.accounts);
}

export function normalizeAccount(a: Account): Account {
  return {
    ...a,
    touches: Array.isArray(a.touches) ? a.touches : [],
    tierManual: a.tierManual ?? null,
  };
}

export function parseImportedState(json: string): PersistedState | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isPersistedState(parsed)) return null;
    return {
      version: 1,
      accounts: parsed.accounts.map((x) => normalizeAccount(x as Account)),
    };
  } catch {
    return null;
  }
}
