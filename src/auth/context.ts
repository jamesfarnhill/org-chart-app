import { createContext, useContext } from "react";

export type Role = "admin" | "user";

/** What the rest of the app sees about a user (never secrets). */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface Provisioned {
  email: string;
  tempPassword: string;
}

export interface AuthContextValue {
  ready: boolean;
  hasUsers: boolean;
  /** Local backend can bootstrap the first admin; Supabase cannot (closed). */
  canCreateAdmin: boolean;
  /** Supabase resets via emailed link; local shows a code on screen. */
  emailResetFlow: boolean;
  /** Supabase recovery session active (user arrived from a reset email). */
  passwordRecovery: boolean;
  currentUser: SessionUser | null;
  users: SessionUser[];
  createAdmin: (input: { email: string; displayName: string; password: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void | Promise<void>;
  provisionUser: (input: { email: string; displayName: string; role: Role }) => Promise<Provisioned>;
  resetUserPassword: (userId: string) => Promise<Provisioned>;
  removeUser: (userId: string) => void | Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  completePasswordReset: (email: string, token: string, newPassword: string) => Promise<void>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an Auth provider");
  return ctx;
}
