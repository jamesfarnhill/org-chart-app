import type { Tier } from "../types";

/**
 * Stub “policy engine” for tiering. In a real product this would call enrichment + scoring.
 */
export function suggestedTier(employeeCount: number, industry: string): Tier {
  const ind = industry.toLowerCase();
  if (employeeCount >= 800) return "A";
  if (employeeCount >= 200) return "B";
  if (ind.includes("finance") || ind.includes("health")) return "B";
  if (employeeCount >= 50) return "B";
  return "C";
}

export function displayTier(
  account: { employeeCount: number; industry: string; tierManual: Tier | null },
): Tier {
  return account.tierManual ?? suggestedTier(account.employeeCount, account.industry);
}
