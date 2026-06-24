import { useMemo } from "react";
import type { AccountMap, FilterState, Person } from "../types";
import { analyseCoverage } from "../lib/coverage";
import type { CoverageReport } from "../lib/coverage";
import { canvasSize, computeLayout } from "../lib/layout";
import { getActiveAccount } from "./accountStore";
import type { StoreState } from "./accountStore";
import { useStore } from "./StoreContext";

export function useActiveAccount(): AccountMap | null {
  const state = useStore();
  return useMemo(() => getActiveAccount(state), [state]);
}

export function useLayout(people: Person[]) {
  const positions = useMemo(() => computeLayout(people), [people]);
  const size = useMemo(() => canvasSize(positions), [positions]);
  return { positions, size };
}

export function useCoverage(account: AccountMap | null): CoverageReport | null {
  return useMemo(() => (account ? analyseCoverage(account) : null), [account]);
}

export function matchesFilter(
  person: Person,
  filter: FilterState,
  coverage: CoverageReport | null,
): boolean {
  if (filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    const haystack = [
      person.name,
      person.jobTitle,
      person.department,
      person.notes,
      person.priorities,
      person.nextStep,
      ...(person.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filter.sentiments.length && !filter.sentiments.includes(person.sentiment)) return false;
  if (filter.roles.length && !filter.roles.some((r) => person.buyingRoles.includes(r))) return false;
  if (filter.minInfluence && person.influence < filter.minInfluence) return false;
  if (filter.onlyUncovered && !coverage?.uncoveredPowerIds.has(person.id)) return false;
  return true;
}

export function useFilteredIds(
  people: Person[],
  filter: FilterState,
  coverage: CoverageReport | null,
): Set<string> {
  return useMemo(() => {
    const ids = new Set<string>();
    people.forEach((p) => {
      if (matchesFilter(p, filter, coverage)) ids.add(p.id);
    });
    return ids;
  }, [people, filter, coverage]);
}

export function isFilterActive(filter: FilterState): boolean {
  return (
    filter.search.trim() !== "" ||
    filter.sentiments.length > 0 ||
    filter.roles.length > 0 ||
    filter.minInfluence > 0 ||
    filter.onlyUncovered
  );
}

export type { StoreState };
