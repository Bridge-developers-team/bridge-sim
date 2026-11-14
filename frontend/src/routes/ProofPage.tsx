import { Link, useParams } from "react-router";
import { errorText, useProof } from "../api/hooks";
import { FeedbackView } from "../components/FeedbackView";
import { ErrorBox } from "../components/ui/ErrorBox";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";

/** Public, no login: what a hiring manager opens from an application. */
export function ProofPage() {
  const { proofId = "" } = useParams();
  const proof = useProof(proofId);

  if (proof.isLoading) {
    return (
      <div className="stack" aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--block" />
      </div>
    );
  }
  if (proof.isError || !proof.data) {
    return <ErrorBox message={errorText(proof.error)} />;
  }

  const p = proof.data;
  const date = new Date(p.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return (
    <article className="stack-lg">
      <ModeBanner mode={p.mode} />
      <header className="page-head">
        <h1>{p.displayName ? `${p.displayName}'s practice task` : "A practice task"}</h1>
        <p className="muted">
          Work sample for {p.practice.targetRole} · published {date}
        </p>
      </header>

      <Panel>
        <PanelHeader title="The task" />
        <PanelBody className="stack">
          <p>{p.practice.scenario}</p>
          <p className="strong">{p.practice.brief}</p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Their answer" />
        <PanelBody>
          <p className="answer">{p.answer}</p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Graded against this rubric" />
        <PanelBody>
          <FeedbackView evaluation={p.evaluation} />
        </PanelBody>
      </Panel>

      {p.reflection && (
        <Panel>
          <PanelHeader title="What they learned" />
          <PanelBody>
            <p>{p.reflection}</p>
          </PanelBody>
        </Panel>
      )}

      <p className="muted small">
        Scored by AI practice feedback against the rubric shown above, before the answer was written. Every quote was
        checked against the answer by code, and the page can only show scores the server signed. Practice feedback, not
        a hiring decision.
      </p>
      <Link className="btn btn--default" to="/">
        Try Bridge yourself
      </Link>
    </article>
  );
}
