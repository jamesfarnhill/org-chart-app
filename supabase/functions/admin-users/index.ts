// Supabase Edge Function: admin-only user management.
// Deploy as the function named "admin-users".
//
// It runs with the SERVICE ROLE key (never exposed to the browser) and only acts
// if the caller is an admin. This is what lets an admin create/reset/remove users
// and assign roles, while users can never promote themselves.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const READABLE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function tempPassword(length = 10): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => READABLE[b % READABLE.length]).join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth token" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Identify the caller and confirm they are an admin.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const action = body.action;

  try {
    if (action === "provision") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const displayName = String(body.displayName ?? "").trim() || email;
      const role = body.role === "admin" ? "admin" : "user"; // default user
      if (!email) return json({ error: "Email is required" }, 400);

      const password = tempPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, must_change_password: true },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Create failed" }, 400);

      await admin
        .from("profiles")
        .update({ role, display_name: displayName })
        .eq("id", created.user.id);

      return json({ email, tempPassword: password });
    }

    if (action === "reset") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "userId is required" }, 400);
      const password = tempPassword();
      const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { must_change_password: true },
      });
      if (updErr || !updated.user) return json({ error: updErr?.message ?? "Reset failed" }, 400);
      return json({ email: updated.user.email, tempPassword: password });
    }

    if (action === "remove") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "userId is required" }, 400);
      if (userId === userData.user.id) return json({ error: "You can't remove yourself" }, 400);
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});
