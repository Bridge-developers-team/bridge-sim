import type { Evaluation } from "../api/types";
import { Lozenge } from "./ui/Lozenge";

/** Rubric results: the same view on the practice page and the public proof
 * page, so what a hiring manager sees is exactly what the user saw. */
export function FeedbackView({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="stack">
      <div className="score">
        <span className="score__value tabular">
          {evaluation.totalScore}
          <span className="score__max">/{evaluation.maxTotal}</span>
        </span>
        <span className="muted small">across {evaluation.criteria.length} rubric criteria</span>
      </div>
      {evaluation.overallFeedback && <p>{evaluation.overallFeedback}</p>}
      <ul className="criteria">
        {evaluation.criteria.map((c) => (
          <li key={c.rubricId} className="criterion">
            <div className="criterion__head">
              <span className="strong">{c.label}</span>
              <span className="tabular strong">
                {c.score}/{c.maxScore}
              </span>
            </div>
            <div className="meter" aria-hidden="true">
              <div className="meter__bar" style={{ width: `${(c.score / c.maxScore) * 100}%` }} />
            </div>
            {c.verified ? (
              <p className="small">
                <Lozenge tone="ok">Quote checked</Lozenge> <q className="quote">{c.evidence}</q>
              </p>
            ) : (
              c.scoreRaw > c.score && (
                <p className="small">
                  <Lozenge tone="warn">Capped</Lozenge> The AI gave {c.scoreRaw} but could not quote the answer to
                  back it, so the score is capped at {c.score}.
                </p>
              )
            )}
            {c.strengths.length > 0 && <p className="small">Strong: {c.strengths.join(" ")}</p>}
            {c.improvements.length > 0 && <p className="small">Improve: {c.improvements.join(" ")}</p>}
          </li>
        ))}
      </ul>
      {evaluation.nextRevisionStep && (
        <p className="small">
          <span className="strong">Next revision:</span> {evaluation.nextRevisionStep}
        </p>
      )}
    </div>
  );
}
