import type { Account, Touch } from "../types";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Synthetic companies only — safe for a public repository. */
export const SEED_ACCOUNTS: Account[] = [
  {
    id: "seed-aurora-analytics",
    companyName: "Aurora Analytics (demo)",
    industry: "Technology",
    employeeCount: 420,
    tierManual: null,
    status: "active",
    nextStepAt: daysFromNow(2),
    lastContactedAt: daysAgo(9),
    researchBrief: "",
    touches: [
      {
        id: "t1",
        channel: "email",
        message: "Intro — shared metrics narrative + 15m fit check.",
        at: daysAgo(9),
      },
    ],
  },
  {
    id: "seed-riverline-retail",
    companyName: "Riverline Retail (demo)",
    industry: "Retail",
    employeeCount: 2400,
    tierManual: null,
    status: "active",
    nextStepAt: daysFromNow(0),
    lastContactedAt: daysAgo(21),
    researchBrief: "",
    touches: [],
  },
  {
    id: "seed-harbor-health",
    companyName: "Harbor Health Co (demo)",
    industry: "Healthcare",
    employeeCount: 180,
    tierManual: "A",
    status: "active",
    nextStepAt: daysFromNow(5),
    lastContactedAt: daysAgo(3),
    researchBrief: "Note: manual tier override for strategic partner motion.",
    touches: [
      {
        id: "t2",
        channel: "linkedin",
        message: "Commented on launch post — DM follow-up scheduled.",
        at: daysAgo(3),
      },
    ],
  },
  {
    id: "seed-northfield-finance",
    companyName: "Northfield Finance (demo)",
    industry: "Finance",
    employeeCount: 95,
    tierManual: null,
    status: "paused",
    nextStepAt: daysFromNow(14),
    lastContactedAt: daysAgo(40),
    researchBrief: "",
    touches: [
      {
        id: "t3",
        channel: "email",
        message: "Asked to revisit next quarter — set reminder.",
        at: daysAgo(40),
      },
    ],
  },
  {
    id: "seed-pixel-foundry",
    companyName: "Pixel Foundry (demo)",
    industry: "Technology",
    employeeCount: 38,
    tierManual: null,
    status: "active",
    nextStepAt: daysFromNow(7),
    lastContactedAt: null,
    researchBrief: "",
    touches: [],
  },
  {
    id: "seed-summit-logistics",
    companyName: "Summit Logistics (demo)",
    industry: "Logistics",
    employeeCount: 650,
    tierManual: null,
    status: "active",
    nextStepAt: daysFromNow(1),
    lastContactedAt: daysAgo(2),
    researchBrief: "",
    touches: [
      {
        id: "t4",
        channel: "other",
        message: "Met at industry meetup — send recap + one-pager.",
        at: daysAgo(2),
      },
    ],
  },
];

export function newTouch(partial: Omit<Touch, "id">): Touch {
  return { ...partial, id: crypto.randomUUID() };
}

export function newAccount(partial: Omit<Account, "id" | "touches"> & { touches?: Touch[] }): Account {
  return {
    ...partial,
    id: crypto.randomUUID(),
    touches: partial.touches ?? [],
  };
}
