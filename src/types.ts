// Domain model for a strategic-account power map.
// This is deliberately "deal-shaped", not "HR-shaped": hierarchy is one lens,
// but influence, disposition and coverage are first-class citizens.

export type Sentiment = "champion" | "coach" | "neutral" | "detractor";

export type BuyingRole =
  | "economic_buyer"
  | "champion"
  | "technical_champion"
  | "influencer"
  | "end_user"
  | "procurement"
  | "legal"
  | "security"
  | "blocker";

export type Seniority =
  | "c_level"
  | "evp_svp"
  | "vp"
  | "director"
  | "manager"
  | "ic";

/** Real power in THIS account (1 = peripheral, 5 = kingmaker). Never derived from title. */
export type Influence = 1 | 2 | 3 | 4 | 5;

/** How well WE know them: 0 none, 1 weak, 2 working, 3 strong. */
export type RelationshipStrength = 0 | 1 | 2 | 3;

export interface Contact {
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

export interface Person {
  id: string;
  name: string;
  jobTitle: string;
  department?: string;
  seniority?: Seniority;

  /** Solid-line manager. The hierarchy tree reads from this. */
  reportsToId: string | null;

  /** Political layer. */
  buyingRoles: BuyingRole[];
  sentiment: Sentiment;
  influence: Influence;

  /** Coverage layer. */
  relationshipOwnerId?: string | null;
  relationshipStrength?: RelationshipStrength;
  nextStep?: string;

  /** Context. */
  priorities?: string;
  notes?: string;
  tags: string[];
  contact?: Contact;

  /** Layout / meta. */
  x: number | null;
  y: number | null;
  pinned?: boolean;
  updatedAt: string;
}

export type RelationshipType =
  | "dotted_line"
  | "influences"
  | "allies_with"
  | "tension_with";

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  strength?: 1 | 2 | 3;
  note?: string;
}

/** Someone on our side who owns a relationship (rep, SE, exec sponsor, CS). */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface Opportunity {
  name: string;
  stage?: string;
  value?: number;
  closeDate?: string;
}

export interface Meddpicc {
  metrics?: string;
  economicBuyerId?: string | null;
  decisionCriteria?: string;
  decisionProcess?: string;
  paperProcess?: string;
  identifiedPain?: string;
  championId?: string | null;
  competition?: string;
}

export interface AccountMap {
  id: string;
  accountName: string;
  opportunity?: Opportunity;
  meddpicc?: Meddpicc;
  people: Person[];
  relationships: Relationship[];
  team: TeamMember[];
  updatedAt: string;
}

export type ViewMode = "tree" | "power" | "coverage";

export interface FilterState {
  search: string;
  sentiments: Sentiment[];
  roles: BuyingRole[];
  minInfluence: Influence | 0;
  onlyUncovered: boolean;
}

export interface PersistedStateV3 {
  version: 3;
  accounts: AccountMap[];
  activeAccountId: string | null;
}
