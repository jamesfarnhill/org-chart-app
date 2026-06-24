import { memo } from "react";
import type { Person } from "../../types";
import { CARD_HEIGHT, CARD_WIDTH, INFLUENCE_LABEL, ROLE_META, SENTIMENT_META } from "../../lib/constants";

export interface PersonCardViewProps {
  person: Person;
  selected?: boolean;
  dimmed?: boolean;
  dropTarget?: boolean;
  highlighted?: boolean;
  uncovered?: boolean;
  ownerInitials?: string | null;
  interactive?: boolean;
  onChangeName?: (value: string) => void;
  onChangeTitle?: (value: string) => void;
  onSelect?: () => void;
  onRemove?: () => void;
  onAddReport?: () => void;
  onAddManager?: () => void;
}

function influencePips(level: number) {
  return Array.from({ length: 5 }, (_, i) => i < level);
}

function PersonCardViewImpl(props: PersonCardViewProps) {
  const {
    person,
    selected,
    dimmed,
    dropTarget,
    highlighted,
    uncovered,
    ownerInitials,
    interactive = true,
  } = props;

  const sentiment = SENTIMENT_META[person.sentiment];
  const className = [
    "card",
    selected ? "card--selected" : "",
    dimmed ? "card--dimmed" : "",
    dropTarget ? "card--drop" : "",
    highlighted ? "card--highlight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderTopColor: sentiment.color }}
    >
      <span className="card__accent" style={{ background: sentiment.color }} />

      {interactive && (
        <>
          <button
            type="button"
            className="card__icon card__remove"
            title="Remove (Del)"
            onClick={(e) => {
              e.stopPropagation();
              props.onRemove?.();
            }}
          >
            ×
          </button>
          <button
            type="button"
            className="card__icon card__add card__add--top"
            title="Add manager above"
            onClick={(e) => {
              e.stopPropagation();
              props.onAddManager?.();
            }}
          >
            +
          </button>
          <button
            type="button"
            className="card__icon card__add card__add--bottom"
            title="Add direct report"
            onClick={(e) => {
              e.stopPropagation();
              props.onAddReport?.();
            }}
          >
            +
          </button>
        </>
      )}

      <div className="card__body">
        {interactive ? (
          <input
            className="card__name"
            value={person.name}
            placeholder="Name"
            onChange={(e) => props.onChangeName?.(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="card__name card__name--static">{person.name || "Name"}</div>
        )}
        {interactive ? (
          <input
            className="card__title"
            value={person.jobTitle}
            placeholder="Job title"
            onChange={(e) => props.onChangeTitle?.(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="card__title card__title--static">{person.jobTitle || "Job title"}</div>
        )}
      </div>

      <div className="card__footer">
        <div className="card__roles">
          {person.buyingRoles.slice(0, 3).map((role) => (
            <span key={role} className="role-chip" title={ROLE_META[role].label}>
              {ROLE_META[role].short}
            </span>
          ))}
        </div>
        <div className="card__meta">
          {uncovered && (
            <span className="card__flag card__flag--uncovered" title="Power blindspot">
              !
            </span>
          )}
          {ownerInitials && (
            <span className="card__owner" title="Cursor owner">
              {ownerInitials}
            </span>
          )}
          <span className="card__influence" title={`Influence: ${INFLUENCE_LABEL[person.influence]}`}>
            {influencePips(person.influence).map((on, i) => (
              <span key={i} className={`pip ${on ? "pip--on" : ""}`} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

export const PersonCardView = memo(PersonCardViewImpl);
