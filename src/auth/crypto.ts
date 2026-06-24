// NOTE: This is a local-first/demo auth layer. Hashing happens in the browser and
// data lives in localStorage, so it is NOT a substitute for a real backend with
// server-side auth. It is structured so it can later be swapped for Supabase/etc.

export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const READABLE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A readable temporary password an admin can share with a new user. */
export function tempPassword(length = 10): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => READABLE[b % READABLE.length]).join("");
}

/** A reset token that stands in for an emailed link in this local demo. */
export function resetToken(): string {
  return randomHex(20);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}
