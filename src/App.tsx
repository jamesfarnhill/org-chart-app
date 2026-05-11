import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler } from "react";
import type { Account, AccountStatus, Tier, TouchChannel } from "./types";
import { SEED_ACCOUNTS, newAccount, newTouch } from "./data/seedAccounts";
import { loadState, parseImportedState, saveState } from "./lib/persistence";
import { displayTier, suggestedTier } from "./lib/tiering";
import { generateResearchBrief } from "./lib/researchStub";
import "./styles.css";

type Tab = "accounts" | "queue";

const OWNER = "You";
const STALE_DAYS = 14;

function tierRank(t: Tier): number {
  return t === "A" ? 0 : t === "B" ? 1 : 2;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isStale(account: Account): boolean {
  if (!account.lastContactedAt) return true;
  const ms = Date.now() - new Date(account.lastContactedAt).getTime();
  return ms / 86400000 > STALE_DAYS;
}

function isDue(a: Account): boolean {
  return parseDay(a.nextStepAt) <= startOfToday();
}

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [researchBusyId, setResearchBusyId] = useState<string | null>(null);
  const [queueTierA, setQueueTierA] = useState(true);
  const [queueTierB, setQueueTierB] = useState(true);
  const [queueTierC, setQueueTierC] = useState(true);
  const [queueStaleOnly, setQueueStaleOnly] = useState(false);
  const [queueDueOnly, setQueueDueOnly] = useState(false);
  const fileInputId = "pocc-import-input";

  useEffect(() => {
    const saved = loadState();
    setAccounts(saved?.accounts ?? SEED_ACCOUNTS);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ version: 1, accounts });
  }, [accounts, hydrated]);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId],
  );

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const queueRows = useMemo(() => {
    const tierOn = (t: Tier) =>
      (t === "A" && queueTierA) || (t === "B" && queueTierB) || (t === "C" && queueTierC);

    return [...accounts]
      .filter((a) => a.status !== "won" && a.status !== "lost")
      .filter((a) => tierOn(displayTier(a)))
      .filter((a) => !queueStaleOnly || isStale(a))
      .filter((a) => !queueDueOnly || isDue(a))
      .sort((a, b) => {
        const da = parseDay(a.nextStepAt);
        const db = parseDay(b.nextStepAt);
        if (da !== db) return da - db;
        return tierRank(displayTier(a)) - tierRank(displayTier(b));
      });
  }, [accounts, queueDueOnly, queueStaleOnly, queueTierA, queueTierB, queueTierC]);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, accounts }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pocc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportedState(text);
    if (!parsed) {
      alert("Import failed: expected { version: 1, accounts: [...] }");
      return;
    }
    setAccounts(parsed.accounts);
    setSelectedId(null);
  };

  const resetSeed = () => {
    if (!confirm("Replace local data with synthetic seed accounts?")) return;
    setAccounts(SEED_ACCOUNTS);
    setSelectedId(null);
  };

  const addAccount = () => {
    const a = newAccount({
      companyName: "New account (demo)",
      industry: "Technology",
      employeeCount: 75,
      tierManual: null,
      status: "active",
      nextStepAt: new Date().toISOString().slice(0, 10),
      lastContactedAt: null,
      researchBrief: "",
    });
    setAccounts((prev) => [a, ...prev]);
    setSelectedId(a.id);
    setTab("accounts");
  };

  const runStubResearch = async (account: Account) => {
    setResearchBusyId(account.id);
    try {
      const brief = await generateResearchBrief(account);
      const merged = account.researchBrief.trim()
        ? `${account.researchBrief.trim()}\n\n---\n\n${brief}`
        : brief;
      updateAccount(account.id, { researchBrief: merged });
    } finally {
      setResearchBusyId(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <h1>Pipeline command center</h1>
          <p className="header__sub">Local-only · stubbed data · no external APIs</p>
        </div>
        <nav className="nav">
          <button
            type="button"
            className={tab === "accounts" ? "nav__btn nav__btn--active" : "nav__btn"}
            onClick={() => setTab("accounts")}
          >
            Accounts
          </button>
          <button
            type="button"
            className={tab === "queue" ? "nav__btn nav__btn--active" : "nav__btn"}
            onClick={() => setTab("queue")}
          >
            Outreach queue
          </button>
        </nav>
        <div className="header__actions">
          <button type="button" className="btn btn--ghost" onClick={addAccount}>
            Add account
          </button>
          <button type="button" className="btn btn--ghost" onClick={exportBackup}>
            Export JSON
          </button>
          <label className="btn btn--ghost" htmlFor={fileInputId}>
            Import JSON
          </label>
          <input
            id={fileInputId}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
          />
          <button type="button" className="btn btn--danger" onClick={resetSeed}>
            Reset to seed
          </button>
        </div>
      </header>

      <main className="main">
        {selected ? (
          <AccountDetail
            account={selected}
            owner={OWNER}
            busy={researchBusyId === selected.id}
            onClose={() => setSelectedId(null)}
            onChange={updateAccount}
            onRunStubResearch={() => runStubResearch(selected)}
          />
        ) : tab === "accounts" ? (
          <section className="panel">
            <h2 className="panel__title">Accounts</h2>
            <p className="panel__hint">
              Synthetic demo companies only. Tier shows effective value; suggested tier comes from local rules
              in <code>src/lib/tiering.ts</code>.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Tier</th>
                    <th>Owner</th>
                    <th>Next step</th>
                    <th>Last contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const t = displayTier(a);
                    const auto = a.tierManual === null;
                    return (
                      <tr key={a.id} className="table__row" onClick={() => setSelectedId(a.id)}>
                        <td>
                          <span className="table__primary">{a.companyName}</span>
                          <span className="table__meta">
                            {a.industry} · {a.employeeCount} employees
                          </span>
                        </td>
                        <td>
                          <span className={`pill pill--${t.toLowerCase()}`}>{t}</span>
                          {!auto && <span className="badge">override</span>}
                        </td>
                        <td>{OWNER}</td>
                        <td>{formatDay(a.nextStepAt)}</td>
                        <td>{a.lastContactedAt ? formatDay(a.lastContactedAt) : "—"}</td>
                        <td>
                          <span className={`status status--${a.status}`}>{a.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="panel">
            <h2 className="panel__title">Outreach queue</h2>
            <div className="filters">
              <span className="filters__label">Tiers</span>
              <label className="check">
                <input type="checkbox" checked={queueTierA} onChange={() => setQueueTierA((v) => !v)} />A
              </label>
              <label className="check">
                <input type="checkbox" checked={queueTierB} onChange={() => setQueueTierB((v) => !v)} />B
              </label>
              <label className="check">
                <input type="checkbox" checked={queueTierC} onChange={() => setQueueTierC((v) => !v)} />C
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={queueStaleOnly}
                  onChange={() => setQueueStaleOnly((v) => !v)}
                />
                Stale (&gt;{STALE_DAYS} days)
              </label>
              <label className="check">
                <input type="checkbox" checked={queueDueOnly} onChange={() => setQueueDueOnly((v) => !v)} />
                Due / overdue
              </label>
            </div>
            <div className="queue">
              {queueRows.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="queue__card"
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className="queue__top">
                    <span className="queue__name">{a.companyName}</span>
                    <span className={`pill pill--${displayTier(a).toLowerCase()}`}>
                      {displayTier(a)}
                    </span>
                  </div>
                  <div className="queue__meta">
                    Next: {formatDay(a.nextStepAt)}
                    {isDue(a) && <span className="tag tag--due">due</span>}
                    {isStale(a) && <span className="tag tag--stale">stale</span>}
                  </div>
                </button>
              ))}
              {queueRows.length === 0 && (
                <p className="empty">No accounts match these filters.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function AccountDetail({
  account,
  owner,
  busy,
  onClose,
  onChange,
  onRunStubResearch,
}: {
  account: Account;
  owner: string;
  busy: boolean;
  onClose: () => void;
  onChange: (id: string, patch: Partial<Account>) => void;
  onRunStubResearch: () => void;
}) {
  const [channel, setChannel] = useState<TouchChannel>("email");
  const [message, setMessage] = useState("");
  const [touchAt, setTouchAt] = useState(() => new Date().toISOString().slice(0, 16));

  const sug = suggestedTier(account.employeeCount, account.industry);
  const eff = displayTier(account);

  const saveTouch = () => {
    if (!message.trim()) return;
    const at = new Date(touchAt).toISOString();
    const touch = newTouch({ channel, message: message.trim(), at });
    onChange(account.id, {
      touches: [...account.touches, touch],
      lastContactedAt: at,
    });
    setMessage("");
  };

  const copyLast = async () => {
    const last = [...account.touches].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    )[0];
    const text = last?.message ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <section className="detail">
      <div className="detail__head">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          ← Back
        </button>
        <div className="detail__titles">
          <h2>{account.companyName}</h2>
          <p className="detail__sub">
            Owner {owner} · Effective tier{" "}
            <span className={`pill pill--${eff.toLowerCase()}`}>{eff}</span>
            {account.tierManual === null ? (
              <span className="badge badge--muted">auto (suggested {sug})</span>
            ) : (
              <span className="badge">manual override</span>
            )}
          </p>
        </div>
      </div>

      <div className="detail__grid">
        <div className="card">
          <h3>Account fields</h3>
          <label className="field">
            <span>Company</span>
            <input
              value={account.companyName}
              onChange={(e) => onChange(account.id, { companyName: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Industry</span>
            <input
              value={account.industry}
              onChange={(e) => onChange(account.id, { industry: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Employee count (synthetic)</span>
            <input
              type="number"
              min={1}
              value={account.employeeCount}
              onChange={(e) =>
                onChange(account.id, { employeeCount: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label className="field">
            <span>Tier</span>
            <select
              value={account.tierManual ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange(account.id, { tierManual: v === "" ? null : (v as Tier) });
              }}
            >
              <option value="">Auto (suggested: {sug})</option>
              <option value="A">A (manual)</option>
              <option value="B">B (manual)</option>
              <option value="C">C (manual)</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={account.status}
              onChange={(e) => onChange(account.id, { status: e.target.value as AccountStatus })}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
          </label>
          <label className="field">
            <span>Next step date</span>
            <input
              type="date"
              value={account.nextStepAt.slice(0, 10)}
              onChange={(e) => onChange(account.id, { nextStepAt: e.target.value })}
            />
          </label>
        </div>

        <div className="card">
          <div className="card__head">
            <h3>Research brief</h3>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={onRunStubResearch}
            >
              {busy ? "Generating stub…" : "Generate stub brief"}
            </button>
          </div>
          <p className="hint">
            Template-only output from <code>src/lib/researchStub.ts</code> — no network calls.
          </p>
          <textarea
            className="textarea"
            rows={12}
            value={account.researchBrief}
            onChange={(e) => onChange(account.id, { researchBrief: e.target.value })}
            placeholder="Your notes appear here. Stub briefs append below with a divider."
          />
        </div>

        <div className="card card--wide">
          <div className="card__head">
            <h3>Touch log</h3>
            <button type="button" className="btn btn--ghost" onClick={copyLast}>
              Copy latest message
            </button>
          </div>
          <div className="touches">
            {[...account.touches]
              .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
              .map((t) => (
                <div key={t.id} className="touch">
                  <div className="touch__meta">
                    <span className="tag">{t.channel}</span>
                    <span>{formatWhen(t.at)}</span>
                  </div>
                  <div className="touch__body">{t.message}</div>
                </div>
              ))}
            {account.touches.length === 0 && (
              <p className="empty">No touches yet — add one below.</p>
            )}
          </div>
          <div className="composer">
            <label className="field">
              <span>Channel</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as TouchChannel)}>
                <option value="email">email</option>
                <option value="linkedin">linkedin</option>
                <option value="other">other</option>
              </select>
            </label>
            <label className="field field--grow">
              <span>Message (not sent — local log only)</span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What you said or will send…"
              />
            </label>
            <label className="field">
              <span>When</span>
              <input
                type="datetime-local"
                value={touchAt}
                onChange={(e) => setTouchAt(e.target.value)}
              />
            </label>
            <button type="button" className="btn" onClick={saveTouch}>
              Log touch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
