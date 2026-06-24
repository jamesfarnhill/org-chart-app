import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import type {
  AccountMap,
  BuyingRole,
  Influence,
  Person,
  RelationshipStrength,
  RelationshipType,
  Sentiment,
} from "../types";
import type { Action } from "../store/accountStore";
import { descendantIds } from "../lib/graph";
import {
  EDGE_META,
  INFLUENCE_LABEL,
  ROLE_META,
  ROLE_ORDER,
  SENTIMENT_META,
  SENTIMENT_ORDER,
} from "../lib/constants";

interface Props {
  account: AccountMap;
  person: Person;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

const STRENGTH_LABELS: Record<RelationshipStrength, string> = {
  0: "None",
  1: "Weak",
  2: "Working",
  3: "Strong",
};

export function Inspector({ account, person, dispatch, onClose }: Props) {
  const update = (patch: Partial<Person>) => dispatch({ type: "UPDATE_PERSON", id: person.id, patch });

  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("influences");

  // Reset the relationship builder whenever a different contact is inspected.
  useEffect(() => {
    setRelTarget("");
    setRelType("influences");
  }, [person.id]);

  const toggleRole = (role: BuyingRole) => {
    const has = person.buyingRoles.includes(role);
    update({ buyingRoles: has ? person.buyingRoles.filter((r) => r !== role) : [...person.buyingRoles, role] });
  };

  const others = useMemo(
    () => account.people.filter((p) => p.id !== person.id).sort((a, b) => a.name.localeCompare(b.name)),
    [account.people, person.id],
  );

  // Valid managers: everyone except self and this person's descendants (no cycles).
  const managerOptions = useMemo(() => {
    const blocked = descendantIds(account.people, person.id);
    return others.filter((p) => !blocked.has(p.id));
  }, [account.people, others, person.id]);

  const relationships = account.relationships.filter((r) => r.fromId === person.id || r.toId === person.id);

  const addRelationship = () => {
    if (!relTarget) return;
    dispatch({ type: "ADD_RELATIONSHIP", fromId: person.id, toId: relTarget, relType });
    setRelTarget("");
  };

  return (
    <aside className="inspector">
      <div className="inspector__head">
        <input
          className="inspector__name"
          value={person.name}
          placeholder="Name"
          onChange={(e) => update({ name: e.target.value })}
        />
        <button type="button" className="inspector__close" title="Close" onClick={onClose}>×</button>
      </div>
      <input
        className="inspector__title"
        value={person.jobTitle}
        placeholder="Job title"
        onChange={(e) => update({ jobTitle: e.target.value })}
      />

      <Section title="Disposition">
        <div className="swatches">
          {SENTIMENT_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className={`swatch${person.sentiment === s ? " is-active" : ""}`}
              style={{ ["--swatch" as string]: SENTIMENT_META[s].color }}
              onClick={() => update({ sentiment: s as Sentiment })}
            >
              {SENTIMENT_META[s].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Influence" hint={INFLUENCE_LABEL[person.influence]}>
        <div className="segmented">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`segmented__btn${person.influence === n ? " is-active" : ""}`}
              onClick={() => update({ influence: n as Influence })}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Reports to">
        <select
          className="rel-add__select"
          style={{ width: "100%" }}
          value={person.reportsToId ?? ""}
          onChange={(e) =>
            dispatch({ type: "REPARENT", personId: person.id, managerId: e.target.value || null })
          }
        >
          <option value="">— Top level —</option>
          {managerOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Section>

      <Section title="Buying roles">
        <div className="chips">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              type="button"
              className={`chip${person.buyingRoles.includes(role) ? " is-active" : ""}`}
              title={ROLE_META[role].description}
              onClick={() => toggleRole(role)}
            >
              {ROLE_META[role].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Our coverage">
        <label className="field">
          <span>Cursor owner</span>
          <select
            value={person.relationshipOwnerId ?? ""}
            onChange={(e) => update({ relationshipOwnerId: e.target.value || null })}
          >
            <option value="">— Unassigned —</option>
            {account.team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented segmented--full">
          {([0, 1, 2, 3] as RelationshipStrength[]).map((n) => (
            <button
              key={n}
              type="button"
              className={`segmented__btn${(person.relationshipStrength ?? 0) === n ? " is-active" : ""}`}
              onClick={() => update({ relationshipStrength: n })}
            >
              {STRENGTH_LABELS[n]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Contact">
        <label className="field">
          <span>LinkedIn URL</span>
          <input
            className="inspector__title"
            value={person.contact?.linkedinUrl ?? ""}
            placeholder="https://www.linkedin.com/in/…"
            onChange={(e) =>
              update({ contact: { ...(person.contact ?? {}), linkedinUrl: e.target.value } })
            }
          />
        </label>
        {person.contact?.linkedinUrl && (
          <a
            className="inspector__link"
            href={person.contact.linkedinUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open LinkedIn profile ↗
          </a>
        )}
      </Section>

      <Section title="Next step">
        <textarea
          className="textarea"
          rows={2}
          value={person.nextStep ?? ""}
          placeholder="The planned move for this person…"
          onChange={(e) => update({ nextStep: e.target.value })}
        />
      </Section>

      <Section title="What they care about">
        <textarea
          className="textarea"
          rows={2}
          value={person.priorities ?? ""}
          placeholder="Their win / priorities…"
          onChange={(e) => update({ priorities: e.target.value })}
        />
      </Section>

      <Section title="Notes">
        <textarea
          className="textarea"
          rows={3}
          value={person.notes ?? ""}
          placeholder="Context, intel, history…"
          onChange={(e) => update({ notes: e.target.value })}
        />
      </Section>

      <Section title="Relationships" hint={`${relationships.length} linked`}>
        <div className="rel-builder">
          <span className="rel-builder__label">Add a link from {firstName(person)} to:</span>
          <label className="field">
            <span>Contact</span>
            <select value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
              <option value="">Choose a contact…</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Link type</span>
            <select value={relType} onChange={(e) => setRelType(e.target.value as RelationshipType)}>
              {Object.entries(EDGE_META).map(([type, meta]) => (
                <option key={type} value={type}>{meta.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--primary btn--small" disabled={!relTarget} onClick={addRelationship}>
            ＋ Add link
          </button>
        </div>
        <ul className="rel-list">
          {relationships.map((rel) => {
            const otherId = rel.fromId === person.id ? rel.toId : rel.fromId;
            const other = account.people.find((p) => p.id === otherId);
            const dir = rel.fromId === person.id ? "→" : "←";
            return (
              <li key={rel.id} className="rel-list__item">
                <div className="rel-list__row">
                  <span className="rel-list__dot" style={{ background: EDGE_META[rel.type].color }} />
                  <span className="rel-list__text">{dir} {other?.name ?? "?"}</span>
                  <button
                    type="button"
                    className="rel-list__remove"
                    title="Remove link"
                    onClick={() => dispatch({ type: "REMOVE_RELATIONSHIP", id: rel.id })}
                  >
                    ×
                  </button>
                </div>
                <div className="rel-list__controls">
                  <select
                    className="rel-list__type"
                    value={rel.type}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_RELATIONSHIP", id: rel.id, patch: { type: e.target.value as RelationshipType } })
                    }
                  >
                    {Object.entries(EDGE_META).map(([type, meta]) => (
                      <option key={type} value={type}>{meta.label}</option>
                    ))}
                  </select>
                  <div className="segmented">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`segmented__btn${(rel.strength ?? 2) === n ? " is-active" : ""}`}
                        onClick={() => dispatch({ type: "UPDATE_RELATIONSHIP", id: rel.id, patch: { strength: n as 1 | 2 | 3 } })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  className="rel-list__note"
                  value={rel.note ?? ""}
                  placeholder="Note (e.g. why this link matters)…"
                  onChange={(e) => dispatch({ type: "UPDATE_RELATIONSHIP", id: rel.id, patch: { note: e.target.value } })}
                />
              </li>
            );
          })}
          {relationships.length === 0 && <li className="rel-list__empty">No links yet.</li>}
        </ul>
      </Section>

      <button type="button" className="btn btn--danger" onClick={() => dispatch({ type: "REMOVE_PERSON", id: person.id })}>
        Delete contact
      </button>
    </aside>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="inspector__section">
      <div className="inspector__section-head">
        <h3>{title}</h3>
        {hint && <span className="inspector__hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function firstName(person: Person): string {
  return person.name.split(/\s+/)[0] || "this contact";
}
