import { useState } from "react";
import { useAuth } from "../../auth/context";

type Mode = "login" | "forgot" | "reset";

export function AuthScreen() {
  const { hasUsers, canCreateAdmin, emailResetFlow } = useAuth();
  const showCreateAdmin = !hasUsers && canCreateAdmin;
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">Account Power Map</div>
        {showCreateAdmin ? <CreateAdmin /> : <SignIn />}
      </div>
      <p className="auth__note">
        {emailResetFlow
          ? "Accounts are managed by your administrator."
          : "Local demo accounts: credentials and data are stored in this browser only."}
      </p>
    </div>
  );
}

function CreateAdmin() {
  const { createAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await createAdmin({ email, displayName, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the admin account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth__form" onSubmit={submit}>
      <h1>Create the admin account</h1>
      <p className="auth__sub">This first account is the administrator who can provision other users.</p>
      <label className="auth__field">
        <span>Name</span>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
      </label>
      <label className="auth__field">
        <span>Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </label>
      <label className="auth__field">
        <span>Password</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
      </label>
      <label className="auth__field">
        <span>Confirm password</span>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <div className="auth__error">{error}</div>}
      <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
        {busy ? "Creating…" : "Create admin & sign in"}
      </button>
    </form>
  );
}

function SignIn() {
  const { login, requestPasswordReset, completePasswordReset, emailResetFlow } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setNewPassword("");
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await requestPasswordReset(email);
      if (emailResetFlow) {
        // Real backend: a reset link is emailed; user returns via that link.
        setInfo("If an account exists for that email, a reset link has been sent. Check your inbox.");
      } else if (token) {
        setCode(token);
        setInfo(
          `Demo: your reset code is ${token} — in production this is emailed to ${email.trim().toLowerCase()}.`,
        );
        setMode("reset");
      } else {
        setInfo("If an account exists for that email, a reset code has been generated.");
      }
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      await completePasswordReset(email, code, newPassword);
      reset("login");
      setInfo("Password updated. You can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "forgot") {
    return (
      <form className="auth__form" onSubmit={doForgot}>
        <h1>Reset your password</h1>
        <p className="auth__sub">Enter the email on your account and we'll generate a reset code.</p>
        <label className="auth__field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </label>
        {info && <div className="auth__info">{info}</div>}
        <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
          {busy ? "Sending…" : "Send reset code"}
        </button>
        <button type="button" className="auth__link" onClick={() => reset("login")}>Back to sign in</button>
      </form>
    );
  }

  if (mode === "reset") {
    return (
      <form className="auth__form" onSubmit={doReset}>
        <h1>Set a new password</h1>
        {info && <div className="auth__info">{info}</div>}
        <label className="auth__field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="auth__field">
          <span>Reset code</span>
          <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code from your email" />
        </label>
        <label className="auth__field">
          <span>New password</span>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
        </label>
        {error && <div className="auth__error">{error}</div>}
        <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
        <button type="button" className="auth__link" onClick={() => reset("login")}>Back to sign in</button>
      </form>
    );
  }

  return (
    <form className="auth__form" onSubmit={doLogin}>
      <h1>Sign in</h1>
      <label className="auth__field">
        <span>Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </label>
      <label className="auth__field">
        <span>Password</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="auth__error">{error}</div>}
      {info && <div className="auth__info">{info}</div>}
      <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <button type="button" className="auth__link" onClick={() => reset("forgot")}>Forgot password?</button>
    </form>
  );
}
