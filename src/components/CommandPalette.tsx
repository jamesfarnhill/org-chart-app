import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountMap } from "../types";
import { ROLE_META, SENTIMENT_META } from "../lib/constants";

interface Props {
  account: AccountMap;
  onPick: (id: string) => void;
  onClose: () => void;
}

export function CommandPalette({ account, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const people = account.people;
    const matched = q
      ? people.filter((p) =>
          [p.name, p.jobTitle, p.department, p.notes, p.priorities, p.nextStep, ...(p.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : people;
    return matched.slice(0, 8);
  }, [query, account.people]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const choose = (id: string) => {
    onPick(id);
    onClose();
  };

  return (
    <div className="palette-backdrop" onPointerDown={onClose}>
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          value={query}
          placeholder="Search contacts by name, title, tag…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(results.length - 1, i + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter" && results[activeIndex]) choose(results[activeIndex].id);
          }}
        />
        <ul className="palette__list">
          {results.map((person, index) => (
            <li key={person.id}>
              <button
                type="button"
                className={`palette__item${index === activeIndex ? " is-active" : ""}`}
                onClick={() => choose(person.id)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="palette__dot" style={{ background: SENTIMENT_META[person.sentiment].color }} />
                <span className="palette__name">{person.name || "Unnamed"}</span>
                <span className="palette__sub">{person.jobTitle}</span>
                <span className="palette__roles">
                  {person.buyingRoles.map((r) => ROLE_META[r].short).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="palette__empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
