import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

// Name of the deployed admin Edge Function (defaults to the one in this project).
export const ADMIN_FUNCTION =
  (import.meta.env.VITE_SUPABASE_ADMIN_FN as string | undefined)?.trim() || "smooth-api";

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

// Null when no keys are present, so the app falls back to the local demo.
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
