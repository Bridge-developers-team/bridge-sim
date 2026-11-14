import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Career } from "../api/types";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Lozenge } from "../components/ui/Lozenge";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { chooseCareer, withCareers } from "../lib/journey";
import { EFFORT } from "../lib/labels";
import { getJourney, memory, updateJourney, useJourney } from "../state/journey";

export function PathsPage() {
  const journey = useJourney();
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);

  const careers = useMutation({
    mutationFn: (sample: boolean) => bridgeApi.careers(memory.resumeText, getJourney().profile, sample),
    onSuccess: (data) => updateJourney((j) => withCareers(j, data)),
  });

  // Arriving from the start page or "Try the demo" runs the request once.
  // The ref guards against React's double effect in development.
  const request = location.state as { run?: boolean; sample?: boolean } | null;
  useEffect(() => {
    if (request?.run && memory.resumeText && !started.current) {
      started.current = true;
      careers.mutate(Boolean(request.sample));
      navigate(".", { replace: true, state: null });
    }
  }, [request, careers, navigate]);

  const choose = (career: Career) => {
    updateJourney((j) => chooseCareer(j, career.id));
    navigate("/plan", { state: { run: true } });
  };

  if (careers.isPending) {
    return (
      <Waiting
        title="Finding 3 realistic paths"
        steps={[
          "Reading your experience",
          "Matching it to roles that reuse it",
          "Checking every quoted skill against your CV",
          "Comparing effort and trade-offs",
        ]}
        usually="Usually 15-30 seconds. Your answers are kept if anything goes wrong."
      />
    );
  }

  if (careers.isError) {
    return (
      <ErrorBox
        message={errorText(careers.error)}
        onRetry={memory.resumeText ? () => careers.mutate(false) : undefined}
        onSample={memory.resumeText ? () => careers.mutate(true) : undefined}
      />
    );
  }

  const result = journey.careers;
  if (!result) {
    return (
      <Panel>
        <PanelBody className="stack">
          <h1>No paths yet</h1>
          <p className="muted">Start with your CV, or try the demo.</p>
          <div className="row">
            <Link className="btn btn--primary" to="/start">
              Start with my CV
            </Link>
            <Link className="btn btn--default" to="/">
              Back
            </Link>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  const { profile, careers: paths, mode } = result;
  return (
    <div className="stack-lg">
      <ModeBanner
        mode={mode}
        action={
          mode === "sample" && memory.resumeText ? (
            <Button size="sm" variant="primary" onClick={() => careers.mutate(false)}>
              Run live AI on this CV
            </Button>
          ) : undefined
        }
      />
      <header className="page-head">
        <p className="eyebrow">Your 3 paths</p>
        <h1>Where your experience already points</h1>
        <p className="muted">
          We read you as <strong>{profile.currentRole}</strong>
          {profile.yearsExperience !== null && <>, {profile.yearsExperience} years</>}
          {profile.industry && <> in {profile.industry}</>}. {profile.evidenceNote}
        </p>
      </header>

      <div className="card-grid stagger">
        {paths.map((career) => (
          <CareerCard key={career.id} career={career} chosen={journey.careerId === career.id} onChoose={() => choose(career)} />
        ))}
      </div>

      <Panel>
        <PanelHeader title="Side by side" />
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Effort</th>
                <th>Proof you already have</th>
                <th>Trade-off</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.title}</td>
                  <td>
                    <Lozenge tone={EFFORT[c.relativeEffort].tone}>{EFFORT[c.relativeEffort].label}</Lozenge>
                  </td>
                  <td>{c.transferableSkills.filter((s) => s.verified).length} quoted skills</td>
                  <td>{c.keyTradeoff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function CareerCard({ career, chosen, onChoose }: { career: Career; chosen: boolean; onChoose: () => void }) {
  const effort = EFFORT[career.relativeEffort];
  return (
    <article className={`panel career ${chosen ? "career--chosen" : ""}`}>
      <div className="career__head">
        <h2 className="career__title">{career.title}</h2>
        <Lozenge tone={effort.tone}>{effort.label}</Lozenge>
      </div>
      <p className="muted">{career.roleSummary}</p>
      <p>{career.fitExplanation}</p>

      <h3 className="micro">You already have</h3>
      <ul className="skills">
        {career.transferableSkills.map((s) => (
          <li key={s.skill}>
            <span className="strong">{s.skill}</span>{" "}
            {s.verified ? <Lozenge tone="ok">Quoted from your CV</Lozenge> : <Lozenge tone="warn">AI inference</Lozenge>}
            {s.verified && <q className="quote">{s.evidence}</q>}
          </li>
        ))}
      </ul>

      <h3 className="micro">To build</h3>
      <ul className="plain">
        {career.missingSkills.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <p className="small">
        <span className="strong">Trade-off:</span> {career.keyTradeoff}
      </p>
      {career.assumptions.length > 0 && <p className="muted small">{career.assumptions.join(" ")}</p>}

      <div className="career__action">
        <Button variant="primary" onClick={onChoose}>
          {chosen ? "Open my 30-day plan" : "Build my 30-day plan"}
        </Button>
      </div>
    </article>
  );
}
