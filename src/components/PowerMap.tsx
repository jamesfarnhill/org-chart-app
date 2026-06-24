import { useMemo } from "react";
import type { Dispatch } from "react";
import type { AccountMap, Person, Sentiment } from "../types";
import type { Action } from "../store/accountStore";
import { SENTIMENT_META } from "../lib/constants";

const DISPOSITION: Record<Sentiment, number> = {
  detractor: -2,
  neutral: 0,
  coach: 1,
  champion: 2,
};

const W = 1000;
const H = 680;
const PAD = 64;

interface Props {
  account: AccountMap;
  selectedId: string | null;
  filteredIds: Set<string>;
  filterActive: boolean;
  dispatch: Dispatch<Action>;
}

export function PowerMap({ account, selectedId, filteredIds, filterActive, dispatch }: Props) {
  const points = useMemo(() => {
    // Jitter people who share a cell so bubbles don't fully overlap.
    const buckets = new Map<string, number>();
    return account.people.map((person) => {
      const disp = DISPOSITION[person.sentiment];
      const key = `${disp}:${person.influence}`;
      const index = buckets.get(key) ?? 0;
      buckets.set(key, index + 1);
      const angle = index * 2.399;
      const radius = index === 0 ? 0 : 16 + index * 3;
      const x = PAD + ((disp + 2.5) / 5) * (W - PAD * 2) + Math.cos(angle) * radius;
      const y = H - PAD - ((person.influence - 0.5) / 5) * (H - PAD * 2) + Math.sin(angle) * radius;
      return { person, x, y };
    });
  }, [account.people]);

  return (
    <div className="powermap">
      <svg viewBox={`0 0 ${W} ${H}`} className="powermap__svg" preserveAspectRatio="xMidYMid meet">
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={(H - PAD * 2) / 2} className="quad quad--tl" />
        <rect x={W / 2} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} className="quad quad--tr" />
        <rect x={PAD} y={H / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} className="quad quad--bl" />
        <rect x={W / 2} y={H / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} className="quad quad--br" />

        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} className="axis" />
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} className="axis" />

        <text x={PAD + 14} y={PAD + 28} className="quad-label">Convert / neutralise</text>
        <text x={W - PAD - 14} y={PAD + 28} className="quad-label quad-label--end">Mobilise</text>
        <text x={PAD + 14} y={H - PAD - 14} className="quad-label">Monitor</text>
        <text x={W - PAD - 14} y={H - PAD - 14} className="quad-label quad-label--end">Leverage</text>

        <text x={W / 2} y={H - 22} className="axis-label">Disposition  →  supportive</text>
        <text x={24} y={H / 2} className="axis-label axis-label--y" transform={`rotate(-90 24 ${H / 2})`}>
          Influence  →  high
        </text>

        {points.map(({ person, x, y }) => {
          const meta = SENTIMENT_META[person.sentiment];
          const dim = filterActive && !filteredIds.has(person.id);
          const r = 14 + person.influence * 3;
          return (
            <g
              key={person.id}
              className={`bubble${selectedId === person.id ? " bubble--selected" : ""}${dim ? " bubble--dim" : ""}`}
              onClick={() => dispatch({ type: "SELECT", id: person.id })}
            >
              <circle cx={x} cy={y} r={r} fill={meta.soft} stroke={meta.color} strokeWidth={selectedId === person.id ? 4 : 2} />
              <text x={x} y={y + r + 14} className="bubble__label">{firstName(person)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function firstName(person: Person): string {
  return person.name.split(/\s+/)[0] || person.name;
}
