import type {
  AccountMap,
  BuyingRole,
  Influence,
  Person,
  PersistedStateV3,
  Relationship,
  RelationshipStrength,
  Sentiment,
  TeamMember,
} from "../types";
import { ROLE_ORDER, SENTIMENT_ORDER } from "./constants";
import { seedPositions } from "./layout";

const STORAGE_PREFIX = "account-map:v3";
const LEGACY_GLOBAL_KEY = "account-map:v3";
const LEGACY_V2_KEY = "org-chart-sheets:v2";

// Each user's charts live under their own key so one user can never read another's.
function keyFor(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function newId(prefix = "p"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function loadState(userId: string): PersistedStateV3 | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? migrate(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Parse/migrate an arbitrary persisted value (used by the cloud loader too). */
export function parsePersisted(value: unknown): PersistedStateV3 | null {
  return migrate(value);
}

export function saveState(state: PersistedStateV3, userId: string): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch (error) {
    console.warn("[account-map] could not persist state", error);
  }
}

/**
 * One-off: move any charts that were saved before login (the old global key, or
 * the legacy v2 format) into a specific user's namespace. Used for the first
 * admin so existing work isn't lost. No-op if the user already has data.
 */
export function migrateGlobalToUser(userId: string): void {
  try {
    if (localStorage.getItem(keyFor(userId))) return;

    const global = localStorage.getItem(LEGACY_GLOBAL_KEY);
    if (global) {
      const migrated = migrate(JSON.parse(global) as unknown);
      if (migrated && migrated.accounts.length > 0) {
        localStorage.setItem(keyFor(userId), JSON.stringify(migrated));
        return;
      }
    }

    const legacy = localStorage.getItem(LEGACY_V2_KEY);
    if (legacy) {
      const fromLegacy = migrateLegacyV2(JSON.parse(legacy) as unknown);
      if (fromLegacy && fromLegacy.accounts.length > 0) {
        localStorage.setItem(keyFor(userId), JSON.stringify(fromLegacy));
      }
    }
  } catch {
    /* ignore migration errors */
  }
}

function migrate(value: unknown): PersistedStateV3 | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (obj.version === 3 && Array.isArray(obj.accounts)) {
    const accounts = (obj.accounts as unknown[]).map(normalizeAccount);
    const requested = typeof obj.activeAccountId === "string" ? obj.activeAccountId : null;
    const valid = requested && accounts.some((a) => a.id === requested);
    return { version: 3, accounts, activeAccountId: valid ? requested : accounts[0]?.id ?? null };
  }
  return null;
}

function migrateLegacyV2(value: unknown): PersistedStateV3 | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.people)) return null;

  const people = (obj.people as unknown[]).map((p) => {
    const legacy = (p ?? {}) as Record<string, unknown>;
    return normalizePerson({
      id: typeof legacy.id === "string" ? legacy.id : undefined,
      name: asString(legacy.name),
      // legacy "title" was overloaded; keep both into jobTitle/notes safely
      jobTitle: asString(legacy.jobTitle) || asString(legacy.title),
      reportsToId: typeof legacy.reportsToId === "string" ? legacy.reportsToId : null,
      x: asNullableNumber(legacy.x),
      y: asNullableNumber(legacy.y),
      updatedAt: asString(legacy.updatedAt) || now(),
    });
  });

  const account = normalizeAccount({
    id: newId("acct"),
    accountName: "Imported account",
    people,
    relationships: [],
    team: [],
    updatedAt: now(),
  });
  return { version: 3, accounts: [account], activeAccountId: account.id };
}

export function normalizeAccount(value: unknown): AccountMap {
  const obj = (value ?? {}) as Record<string, unknown>;
  const people = seedPositions(Array.isArray(obj.people) ? obj.people.map(normalizePerson) : []);
  const peopleIds = new Set(people.map((p) => p.id));
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId("acct"),
    accountName: asString(obj.accountName) || "Untitled account",
    opportunity: obj.opportunity as AccountMap["opportunity"],
    meddpicc: obj.meddpicc as AccountMap["meddpicc"],
    people,
    relationships: Array.isArray(obj.relationships)
      ? (obj.relationships as unknown[])
          .map(normalizeRelationship)
          .filter((r) => peopleIds.has(r.fromId) && peopleIds.has(r.toId))
      : [],
    team: Array.isArray(obj.team) ? (obj.team as unknown[]).map(normalizeTeamMember) : [],
    updatedAt: asString(obj.updatedAt) || now(),
  };
}

export function normalizePerson(value: unknown): Person {
  const obj = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId(),
    name: asString(obj.name),
    jobTitle: asString(obj.jobTitle),
    department: asOptionalString(obj.department),
    seniority: isSeniority(obj.seniority) ? obj.seniority : undefined,
    reportsToId: typeof obj.reportsToId === "string" && obj.reportsToId ? obj.reportsToId : null,
    buyingRoles: asRoleArray(obj.buyingRoles),
    sentiment: mapSentiment(obj.sentiment),
    influence: asInfluence(obj.influence),
    relationshipOwnerId:
      typeof obj.relationshipOwnerId === "string" ? obj.relationshipOwnerId : null,
    relationshipStrength: asStrength(obj.relationshipStrength),
    nextStep: asOptionalString(obj.nextStep),
    priorities: asOptionalString(obj.priorities),
    notes: asOptionalString(obj.notes),
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
    contact: normalizeContact(obj.contact),
    x: asNullableNumber(obj.x),
    y: asNullableNumber(obj.y),
    pinned: obj.pinned === true,
    updatedAt: asString(obj.updatedAt) || now(),
  };
}

function normalizeContact(value: unknown): Person["contact"] {
  if (!value || typeof value !== "object") return undefined;
  const c = value as Record<string, unknown>;
  const contact = {
    email: asOptionalString(c.email),
    phone: asOptionalString(c.phone),
    linkedinUrl: asOptionalString(c.linkedinUrl),
  };
  return contact.email || contact.phone || contact.linkedinUrl ? contact : undefined;
}

function normalizeRelationship(value: unknown): Relationship {
  const obj = (value ?? {}) as Record<string, unknown>;
  const type = obj.type;
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId("rel"),
    fromId: asString(obj.fromId),
    toId: asString(obj.toId),
    type:
      type === "dotted_line" || type === "influences" || type === "allies_with" || type === "tension_with"
        ? type
        : "influences",
    strength: obj.strength === 1 || obj.strength === 2 || obj.strength === 3 ? obj.strength : 2,
    note: asOptionalString(obj.note),
  };
}

function normalizeTeamMember(value: unknown): TeamMember {
  const obj = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId("team"),
    name: asString(obj.name),
    role: asString(obj.role),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asInfluence(value: unknown): Influence {
  const n = typeof value === "number" ? Math.round(value) : 3;
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as Influence;
}

function asStrength(value: unknown): RelationshipStrength | undefined {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return undefined;
}

// Map retired role keys onto the current set; drop anything unknown.
const LEGACY_ROLE_MAP: Record<string, BuyingRole> = {
  technical_buyer: "technical_champion",
};

function asRoleArray(value: unknown): BuyingRole[] {
  if (!Array.isArray(value)) return [];
  const mapped = value
    .map((r) => (typeof r === "string" ? (LEGACY_ROLE_MAP[r] ?? r) : r))
    .filter((r): r is BuyingRole => ROLE_ORDER.includes(r as BuyingRole));
  return Array.from(new Set(mapped));
}

// Map retired/legacy disposition values onto the current set.
const LEGACY_SENTIMENT_MAP: Record<string, Sentiment> = {
  supporter: "coach",
  blocker: "detractor",
  unknown: "neutral",
};

function mapSentiment(value: unknown): Sentiment {
  if (typeof value !== "string") return "neutral";
  if (SENTIMENT_ORDER.includes(value as Sentiment)) return value as Sentiment;
  return LEGACY_SENTIMENT_MAP[value] ?? "neutral";
}

function isSeniority(value: unknown): value is Person["seniority"] {
  return (
    value === "c_level" ||
    value === "evp_svp" ||
    value === "vp" ||
    value === "director" ||
    value === "manager" ||
    value === "ic"
  );
}
