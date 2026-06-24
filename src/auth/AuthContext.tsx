import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { hashPassword, randomHex, resetToken, tempPassword, verifyPassword } from "./crypto";
import { migrateGlobalToUser } from "../lib/persistence";
import { AuthContext } from "./context";
import type { AuthContextValue, Role, SessionUser } from "./context";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  salt: string;
  passwordHash: string;
  createdBy: string | null;
  mustChangePassword: boolean;
  resetTokenHash?: string | null;
  resetExpires?: number | null;
  createdAt: string;
}

const USERS_KEY = "account-map:auth:users";
const SESSION_KEY = "account-map:auth:session";
const RESET_TTL_MS = 60 * 60 * 1000;

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as AuthUser[]) : [];
  } catch {
    return [];
  }
}

function toSession(user: AuthUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    setUsers(loadUsers());
    setSessionId(localStorage.getItem(SESSION_KEY));
    hydrated.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  const currentUser = useMemo(() => {
    const found = users.find((u) => u.id === sessionId);
    return found ? toSession(found) : null;
  }, [users, sessionId]);

  const findByEmail = useCallback(
    (email: string) => users.find((u) => u.email === normalizeEmail(email)),
    [users],
  );

  const createAdmin = useCallback(
    async ({ email, displayName, password }: { email: string; displayName: string; password: string }) => {
      if (users.length > 0) throw new Error("An admin already exists.");
      const salt = randomHex();
      const id = `user_${randomHex(8)}`;
      const admin: AuthUser = {
        id,
        email: normalizeEmail(email),
        displayName: displayName.trim() || "Admin",
        role: "admin",
        salt,
        passwordHash: await hashPassword(password, salt),
        createdBy: null,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      // First user inherits any charts that were already in this browser.
      migrateGlobalToUser(id);
      setUsers([admin]);
      setSessionId(id);
    },
    [users.length],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const user = findByEmail(email);
      if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
        throw new Error("Incorrect email or password.");
      }
      setSessionId(user.id);
    },
    [findByEmail],
  );

  const logout = useCallback(() => setSessionId(null), []);

  const provisionUser = useCallback(
    async ({ email, displayName, role }: { email: string; displayName: string; role: Role }) => {
      if (currentUser?.role !== "admin") throw new Error("Only an admin can provision accounts.");
      const normalized = normalizeEmail(email);
      if (!normalized) throw new Error("An email address is required.");
      if (users.some((u) => u.email === normalized)) throw new Error("That email already has an account.");
      const password = tempPassword();
      const salt = randomHex();
      const user: AuthUser = {
        id: `user_${randomHex(8)}`,
        email: normalized,
        displayName: displayName.trim() || normalized,
        role,
        salt,
        passwordHash: await hashPassword(password, salt),
        createdBy: currentUser.id,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, user]);
      return { email: normalized, tempPassword: password };
    },
    [currentUser, users],
  );

  const resetUserPassword = useCallback(
    async (userId: string) => {
      if (currentUser?.role !== "admin") throw new Error("Only an admin can reset passwords.");
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found.");
      const password = tempPassword();
      const salt = randomHex();
      const passwordHash = await hashPassword(password, salt);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, salt, passwordHash, mustChangePassword: true, resetTokenHash: null, resetExpires: null } : u,
        ),
      );
      return { email: user.email, tempPassword: password };
    },
    [currentUser, users],
  );

  const removeUser = useCallback(
    (userId: string) => {
      if (currentUser?.role !== "admin") return;
      if (userId === currentUser.id) return;
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    },
    [currentUser],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      const user = findByEmail(email);
      // Always behave the same to avoid leaking which emails exist.
      if (!user) return "";
      const token = resetToken();
      const salt = user.salt;
      const resetTokenHash = await hashPassword(token, salt);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, resetTokenHash, resetExpires: Date.now() + RESET_TTL_MS } : u,
        ),
      );
      // In a real backend this token is emailed to the user, never returned here.
      return token;
    },
    [findByEmail],
  );

  const completePasswordReset = useCallback(
    async (email: string, token: string, newPassword: string) => {
      const user = findByEmail(email);
      if (!user || !user.resetTokenHash || !user.resetExpires) throw new Error("No reset request found.");
      if (Date.now() > user.resetExpires) throw new Error("This reset link has expired.");
      const tokenHash = await hashPassword(token.trim(), user.salt);
      if (tokenHash !== user.resetTokenHash) throw new Error("Invalid reset code.");
      const salt = randomHex();
      const passwordHash = await hashPassword(newPassword, salt);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, salt, passwordHash, mustChangePassword: false, resetTokenHash: null, resetExpires: null }
            : u,
        ),
      );
    },
    [findByEmail],
  );

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const user = users.find((u) => u.id === sessionId);
      if (!user) throw new Error("Not signed in.");
      if (!(await verifyPassword(currentPassword, user.salt, user.passwordHash))) {
        throw new Error("Current password is incorrect.");
      }
      const salt = randomHex();
      const passwordHash = await hashPassword(newPassword, salt);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, salt, passwordHash, mustChangePassword: false } : u)),
      );
    },
    [sessionId, users],
  );

  const value: AuthContextValue = {
    ready,
    hasUsers: users.length > 0,
    canCreateAdmin: true,
    emailResetFlow: false,
    passwordRecovery: false,
    currentUser,
    users: users.map(toSession),
    createAdmin,
    login,
    logout,
    provisionUser,
    resetUserPassword,
    removeUser,
    requestPasswordReset,
    completePasswordReset,
    changeOwnPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
