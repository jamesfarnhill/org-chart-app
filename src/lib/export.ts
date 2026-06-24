import type { AccountMap } from "../types";
import { normalizeAccount } from "./persistence";

export function downloadAccountJson(account: AccountMap): void {
  const blob = new Blob([JSON.stringify(account, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = account.accountName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "account";
  link.href = url;
  link.download = `${safeName}-power-map.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseAccountJson(json: string): AccountMap | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const account = normalizeAccount(parsed);
    return account.people.length > 0 || account.accountName ? account : null;
  } catch {
    return null;
  }
}

export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

/** Print the current view; the print stylesheet hides chrome so it lands clean in a PDF. */
export function printCurrentView(): void {
  window.print();
}
