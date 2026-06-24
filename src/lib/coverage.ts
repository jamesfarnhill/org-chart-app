import type { AccountMap, Person } from "../types";

export type RiskSeverity = "critical" | "warning" | "info";

export interface CoverageFinding {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  personIds: string[];
}

export interface CoverageReport {
  score: number; // 0-100, higher = better covered
  findings: CoverageFinding[];
  uncoveredPowerIds: Set<string>;
}

/** We have a working relationship if there's any real strength — independent of who owns it. */
function isCovered(person: Person): boolean {
  return (person.relationshipStrength ?? 0) >= 1;
}

export function analyseCoverage(account: AccountMap): CoverageReport {
  const { people, meddpicc } = account;
  const findings: CoverageFinding[] = [];
  const uncoveredPowerIds = new Set<string>();

  const keyPeople = people.filter((p) => p.influence >= 4 || p.buyingRoles.length > 0);

  // Uncovered power: high influence, no real relationship.
  const uncoveredPower = people.filter((p) => p.influence >= 4 && !isCovered(p));
  uncoveredPower.forEach((p) => uncoveredPowerIds.add(p.id));
  if (uncoveredPower.length) {
    findings.push({
      id: "uncovered-power",
      severity: "critical",
      title: `${uncoveredPower.length} power ${plural(uncoveredPower.length, "blindspot")}`,
      detail: "High-influence contacts with no relationship yet. Assign a Cursor owner and open a thread.",
      personIds: uncoveredPower.map((p) => p.id),
    });
  }

  // Detractors / blockers with power.
  const powerfulBlockers = people.filter(
    (p) => p.influence >= 4 && (p.sentiment === "detractor" || p.buyingRoles.includes("blocker")),
  );
  if (powerfulBlockers.length) {
    findings.push({
      id: "powerful-blockers",
      severity: "critical",
      title: `${powerfulBlockers.length} powerful ${plural(powerfulBlockers.length, "detractor")}`,
      detail: "High-influence people working against us. Plan to neutralise or convert.",
      personIds: powerfulBlockers.map((p) => p.id),
    });
  }

  // No economic buyer identified. Verify the referenced person still exists.
  const peopleIds = new Set(people.map((p) => p.id));
  const ebRefValid = Boolean(meddpicc?.economicBuyerId && peopleIds.has(meddpicc.economicBuyerId));
  const ebIdentified = ebRefValid || people.some((p) => p.buyingRoles.includes("economic_buyer"));
  if (!ebIdentified) {
    findings.push({
      id: "no-eb",
      severity: "critical",
      title: "No Economic Buyer identified",
      detail: "You can't close what you can't fund. Identify who controls the budget.",
      personIds: [],
    });
  }

  // No champion.
  const champions = people.filter(
    (p) => p.buyingRoles.includes("champion") || p.sentiment === "champion",
  );
  if (!champions.length) {
    findings.push({
      id: "no-champion",
      severity: "critical",
      title: "No Champion in the account",
      detail: "Find and develop someone with power and influence who will sell for you internally.",
      personIds: [],
    });
  }

  // Single-threaded risk: how narrow our conversations are. With two or more
  // champions we're inherently multi-threaded. With a single champion, the deal
  // is at risk unless we're also speaking to three or more other key contacts.
  const championIds = new Set(champions.map((p) => p.id));
  const otherEngaged = keyPeople.filter((p) => isCovered(p) && !championIds.has(p.id));
  if (champions.length === 1 && otherEngaged.length < 3) {
    findings.push({
      id: "single-threaded",
      severity: "warning",
      title: "Single-threaded risk",
      detail:
        "One champion and fewer than three other engaged contacts. Multi-thread so the deal doesn't rest on one relationship.",
      personIds: [...champions, ...otherEngaged].map((p) => p.id),
    });
  }

  // Power with a relationship but no named Cursor owner.
  const unowned = people.filter((p) => p.influence >= 4 && isCovered(p) && !p.relationshipOwnerId);
  if (unowned.length) {
    findings.push({
      id: "unowned-power",
      severity: "warning",
      title: `${unowned.length} key ${plural(unowned.length, "relationship")} with no Cursor owner`,
      detail: "We have a relationship but nobody at Cursor owns it. Assign a Cursor owner.",
      personIds: unowned.map((p) => p.id),
    });
  }

  const score = coverageScore(keyPeople);
  return { score, findings, uncoveredPowerIds };
}

function coverageScore(keyPeople: Person[]): number {
  if (!keyPeople.length) return 0;
  const totalWeight = keyPeople.reduce((sum, p) => sum + p.influence, 0);
  const covered = keyPeople.reduce(
    (sum, p) => sum + (isCovered(p) ? p.influence * (1 + (p.relationshipStrength ?? 0)) / 4 : 0),
    0,
  );
  return Math.max(0, Math.min(100, Math.round((covered / totalWeight) * 100)));
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
