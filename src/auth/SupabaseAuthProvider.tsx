import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ADMIN_FUNCTION, supabase } from "../lib/supabaseClient";
import { AuthContext } from "./context";
import type { AuthContextValue, Provisioned, Role, SessionUser } from "./context";

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const client = supabase!; // only mounted when configured
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const recoveryRef = useRef(false);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await client
        .from("profiles")
        .select("id, email, display_name, role")
        .eq("id", userId)
        .maybeSingle();
      setProfile((data as ProfileRow) ?? null);
      return (data as ProfileRow) ?? null;
    },
    [client],
  );

  const loadUsers = useCallback(
    async (role: Role | undefined) => {
      if (role !== "admin") {
        setUsers([]);
        return;
      }
      const { data } = await client
        .from("profiles")
        .select("id, email, display_name, role")
        .order("created_at", { ascending: true });
      setUsers(
        ((data as ProfileRow[]) ?? []).map((p) => ({
          id: p.id,
          email: p.email ?? "",
          displayName: p.display_name ?? p.email ?? "",
          role: p.role,
          mustChangePassword: false,
        })),
      );
    },
    [client],
  );

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        setRecovery(true);
      }
      setSession(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  // Whenever the session changes, refresh the profile + (for admins) the user list.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setUsers([]);
      return;
    }
    let active = true;
    (async () => {
      const p = await loadProfile(userId);
      if (active) await loadUsers(p?.role);
    })();
    return () => {
      active = false;
    };
  }, [session, loadProfile, loadUsers]);

  const currentUser: SessionUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? profile?.email ?? "",
        displayName: profile?.display_name ?? session.user.email ?? "",
        role: profile?.role ?? "user",
        mustChangePassword: session.user.user_metadata?.must_change_password === true,
      }
    : null;

  const invokeAdmin = useCallback(
    async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const { data, error } = await client.functions.invoke(ADMIN_FUNCTION, { body });
      if (error) {
        // Try to surface the function's own message if present.
        const message = (data as { error?: string } | null)?.error ?? error.message;
        throw new Error(message);
      }
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error?: string }).error as string);
      }
      return (data as Record<string, unknown>) ?? {};
    },
    [client],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error("Incorrect email or password.");
    },
    [client],
  );

  const logout = useCallback(async () => {
    await client.auth.signOut();
  }, [client]);

  const provisionUser = useCallback(
    async ({ email, displayName, role }: { email: string; displayName: string; role: Role }) => {
      const result = await invokeAdmin({ action: "provision", email, displayName, role });
      await loadUsers(profile?.role);
      return result as unknown as Provisioned;
    },
    [invokeAdmin, loadUsers, profile?.role],
  );

  const resetUserPassword = useCallback(
    async (userId: string) => {
      const result = await invokeAdmin({ action: "reset", userId });
      return result as unknown as Provisioned;
    },
    [invokeAdmin],
  );

  const removeUser = useCallback(
    async (userId: string) => {
      await invokeAdmin({ action: "remove", userId });
      await loadUsers(profile?.role);
    },
    [invokeAdmin, loadUsers, profile?.role],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin,
      });
      return ""; // emailed, nothing to show
    },
    [client],
  );

  const changeOwnPassword = useCallback(
    async (_current: string, newPassword: string) => {
      const { error } = await client.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });
      if (error) throw new Error(error.message);
      recoveryRef.current = false;
      setRecovery(false);
      // Refresh session so currentUser reflects cleared flag.
      const { data } = await client.auth.getSession();
      setSession(data.session);
    },
    [client],
  );

  const notSupported = useCallback(async () => {
    throw new Error("Not available with the cloud backend.");
  }, []);

  const value: AuthContextValue = {
    ready,
    hasUsers: true,
    canCreateAdmin: false,
    emailResetFlow: true,
    passwordRecovery: recovery,
    currentUser,
    users,
    createAdmin: notSupported,
    login,
    logout,
    provisionUser,
    resetUserPassword,
    removeUser,
    requestPasswordReset,
    completePasswordReset: notSupported,
    changeOwnPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
