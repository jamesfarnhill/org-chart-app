import type { PersistedStateV3 } from "../types";
import { supabase } from "./supabaseClient";
import { parsePersisted } from "./persistence";

/** Load the signed-in user's charts from Supabase (their own row only, via RLS). */
export async function loadCloudState(): Promise<PersistedStateV3 | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[cloud] load failed:", error.message);
    return null;
  }
  return data?.data ? parsePersisted(data.data) : null;
}

/** Save the signed-in user's charts to Supabase (upsert their own row). */
export async function saveCloudState(state: PersistedStateV3): Promise<void> {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;

  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });

  if (error) console.warn("[cloud] save failed:", error.message);
}
