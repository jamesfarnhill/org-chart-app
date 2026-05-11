import type { Account } from "../types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stub “research” — template text only, simulates async latency.
 * Replace with CRM + news APIs in a future version.
 */
export async function generateResearchBrief(account: Account): Promise<string> {
  await delay(400);
  const year = new Date().getFullYear();
  return [
    `## Stub research brief`,
    ``,
    `**Company:** ${account.companyName}`,
    `**Industry:** ${account.industry}`,
    `**Size band:** ~${account.employeeCount} employees (synthetic)`,
    ``,
    `### Hypothesis (${year})`,
    `- ${account.companyName} likely prioritizes operational efficiency and consolidation of tooling.`,
    `- Opening angle: offer a crisp before/after story with a 2-week evaluation path.`,
    ``,
    `### Questions to validate on the call`,
    `1. Who owns the buying decision for this category today?`,
    `2. What triggered interest now vs. six months ago?`,
    ``,
    `_Generated locally — no external APIs._`,
  ].join("\n");
}
