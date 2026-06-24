import type { Dispatch } from "react";
import type { AccountMap } from "../types";
import type { Action } from "../store/accountStore";
import type { CoverageReport } from "../lib/coverage";

interface Props {
  account: AccountMap;
  coverage: CoverageReport;
  dispatch: Dispatch<Action>;
}

function scoreTone(score: number): string {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export function CoveragePanel({ account, coverage, dispatch }: Props) {
  const byId = new Map(account.people.map((p) => [p.id, p]));

  return (
    <div className="coverage">
      <div className="coverage__head">
        <div className={`coverage__score coverage__score--${scoreTone(coverage.score)}`}>
          <span className="coverage__score-num">{coverage.score}</span>
          <span className="coverage__score-label">Coverage</span>
        </div>
        <div className="coverage__summary">
          <h2>Deal risk &amp; coverage</h2>
          <p>
            {coverage.findings.length === 0
              ? "No major gaps detected. Keep the map current after every meaningful touch."
              : `${coverage.findings.length} ${coverage.findings.length === 1 ? "item" : "items"} need attention. Work top-down.`}
          </p>
        </div>
      </div>

      <ul className="findings">
        {coverage.findings.map((finding) => (
          <li key={finding.id} className={`finding finding--${finding.severity}`}>
            <div className="finding__bar" />
            <div className="finding__body">
              <div className="finding__title">{finding.title}</div>
              <div className="finding__detail">{finding.detail}</div>
              {finding.personIds.length > 0 && (
                <div className="finding__people">
                  {finding.personIds.map((id) => {
                    const person = byId.get(id);
                    if (!person) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="finding__chip"
                        onClick={() => dispatch({ type: "SELECT", id })}
                      >
                        {person.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
