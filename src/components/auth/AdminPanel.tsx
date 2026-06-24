import { useState } from "react";
import { useAuth } from "../../auth/context";
import type { Role } from "../../auth/context";

interface Credential {
  email: string;
  tempPassword: string;
  note: string;
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { users, currentUser, provisionUser, resetUserPassword, removeUser } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState<Credential | null>(null);

  const provision = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await provisionUser({ email, displayName, role });
      setCredential({ ...result, note: "Share these one-time credentials with the new user." });
      setEmail("");
      setDisplayName("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const resetOne = async (userId: string) => {
    setError("");
    try {
      const result = await resetUserPassword(userId);
      setCredential({ ...result, note: "New temporary password — share it with the user." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    }
  };

  return (
    <div className="help-backdrop" onPointerDown={onClose}>
      <div className="help admin" onPointerDown={(e) => e.stopPropagation()}>
        <div className="help__head">
          <h2>Admin · user management</h2>
          <button type="button" className="inspector__close" title="Close" onClick={onClose}>×</button>
        </div>

        <div className="help__body">
          <p className="help__lead">
            Provision accounts and share credentials. Each user only ever sees their own org charts —
            including you: this panel manages access, not other people's maps.
          </p>

          <section className="admin__section">
            <h3>Provision a new user</h3>
            <form className="admin__form" onSubmit={provision}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </form>
            {error && <div className="auth__error">{error}</div>}
            {credential && (
              <div className="admin__cred">
                <div className="admin__cred-row"><span>Email</span><code>{credential.email}</code></div>
                <div className="admin__cred-row"><span>Temp password</span><code>{credential.tempPassword}</code></div>
                <p className="admin__cred-note">{credential.note} They'll be asked to set their own password on first sign-in.</p>
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => navigator.clipboard?.writeText(`Email: ${credential.email}\nTemporary password: ${credential.tempPassword}`)}
                >
                  Copy credentials
                </button>
              </div>
            )}
          </section>

          <section className="admin__section">
            <h3>Accounts ({users.length})</h3>
            <ul className="admin__list">
              {users.map((u) => (
                <li key={u.id} className="admin__user">
                  <div className="admin__user-main">
                    <span className="admin__user-name">{u.displayName}</span>
                    <span className="admin__user-email">{u.email}</span>
                  </div>
                  <span className={`admin__role admin__role--${u.role}`}>{u.role}</span>
                  <div className="admin__user-actions">
                    <button type="button" className="btn btn--small" onClick={() => resetOne(u.id)}>Reset password</button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      disabled={u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "You can't remove yourself" : "Remove account"}
                      onClick={() => removeUser(u.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
