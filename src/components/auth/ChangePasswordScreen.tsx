import { useState } from "react";
import { useAuth } from "../../auth/context";

/** Shown when a provisioned user must replace their temporary password, or after
 *  arriving from a reset-password email. */
export function ChangePasswordScreen() {
  const { currentUser, changeOwnPassword, logout, emailResetFlow } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The cloud backend authenticates via the session/recovery link, so it doesn't
  // need the old password; the local backend verifies the current (temp) one.
  const needsCurrent = !emailResetFlow;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) return setError("Use a password of at least 8 characters.");
    if (newPassword !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">Account Power Map</div>
        <form className="auth__form" onSubmit={submit}>
          <h1>Choose a new password</h1>
          <p className="auth__sub">
            Welcome{currentUser ? `, ${currentUser.displayName}` : ""}. Replace your temporary password to continue.
          </p>
          {needsCurrent && (
            <label className="auth__field">
              <span>Temporary password</span>
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
          )}
          <label className="auth__field">
            <span>New password</span>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          </label>
          <label className="auth__field">
            <span>Confirm new password</span>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <div className="auth__error">{error}</div>}
          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
            {busy ? "Saving…" : "Save & continue"}
          </button>
          <button type="button" className="auth__link" onClick={logout}>Sign out</button>
        </form>
      </div>
    </div>
  );
}
