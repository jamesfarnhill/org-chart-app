export type Tier = "A" | "B" | "C";

export type AccountStatus = "active" | "paused" | "won" | "lost";

export type TouchChannel = "email" | "linkedin" | "other";

export interface Touch {
  id: string;
  channel: TouchChannel;
  message: string;
  at: string;
}

export interface Account {
  id: string;
  companyName: string;
  industry: string;
  employeeCount: number;
  /** When null, UI uses suggested tier from rules. */
  tierManual: Tier | null;
  status: AccountStatus;
  /** ISO date (date-only or full ISO). */
  nextStepAt: string;
  lastContactedAt: string | null;
  /** User notes + stub brief lives here; stub appends with separator. */
  researchBrief: string;
  touches: Touch[];
}

export interface PersistedState {
  version: 1;
  accounts: Account[];
}
