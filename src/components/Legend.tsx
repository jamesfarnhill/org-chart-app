import type { Dispatch } from "react";
import type { FilterState, RelationshipType, Sentiment } from "../types";
import type { Action } from "../store/accountStore";
import { EDGE_META, SENTIMENT_META, SENTIMENT_ORDER } from "../lib/constants";

interface Props {
  filter: FilterState;
  showEdges: boolean;
  edgeTypes: Set<RelationshipType>;
  onToggleEdgeType: (type: RelationshipType) => void;
  dispatch: Dispatch<Action>;
}

export function Legend({ filter, showEdges, edgeTypes, onToggleEdgeType, dispatch }: Props) {
  const toggleSentiment = (s: Sentiment) => {
    const has = filter.sentiments.includes(s);
    dispatch({
      type: "SET_FILTER",
      patch: { sentiments: has ? filter.sentiments.filter((v) => v !== s) : [...filter.sentiments, s] },
    });
  };

  return (
    <div className="legend">
      <div className="legend__group">
        <span className="legend__title">Disposition · click to filter</span>
        <div className="legend__items">
          {SENTIMENT_ORDER.map((s) => {
            const active = filter.sentiments.includes(s);
            const muted = filter.sentiments.length > 0 && !active;
            return (
              <button
                key={s}
                type="button"
                className={`legend__item${active ? " is-active" : ""}${muted ? " is-muted" : ""}`}
                onClick={() => toggleSentiment(s)}
              >
                <span className="legend__dot" style={{ background: SENTIMENT_META[s].color }} />
                {SENTIMENT_META[s].label}
              </button>
            );
          })}
        </div>
      </div>

      {showEdges && (
        <div className="legend__group">
          <span className="legend__title">Links · click to filter</span>
          <div className="legend__items">
            {(Object.entries(EDGE_META) as [RelationshipType, (typeof EDGE_META)[RelationshipType]][]).map(
              ([type, meta]) => {
                const active = edgeTypes.has(type);
                const muted = edgeTypes.size > 0 && !active;
                return (
                  <button
                    key={type}
                    type="button"
                    className={`legend__item${active ? " is-active" : ""}${muted ? " is-muted" : ""}`}
                    onClick={() => onToggleEdgeType(type)}
                  >
                    <span
                      className="legend__line"
                      style={{ borderTop: `2px ${meta.dashed ? "dashed" : "solid"} ${meta.color}` }}
                    />
                    {meta.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
