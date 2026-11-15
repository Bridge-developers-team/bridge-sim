import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Career, Pay } from "../api/types";
import { PayLine, usePathPay } from "../components/PayLine";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Lozenge } from "../components/ui/Lozenge";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { chooseCareer, withCareers } from "../lib/journey";
import { ArrowRightIcon, CheckIcon } from "../components/Icons";
import { EFFORT, WORK_MODE } from "../lib/labels";
import { getJourney, memory, updateJourney, useJourney } from "../state/journey";

export function PathsPage() {
  const journey = useJourney();
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);

  const careers = useMutation({
    mutationFn: (sample: boolean) => bridgeApi.careers(memory.resumeText, getJourney().profile, sample, memory.resumeSource),
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

  const pay = usePathPay();

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
  const country = journey.profile.country || "us";
  return (
    <div className="stack-lg">
      <ModeBanner
        mode={mode}
        action={
          mode === "sample" && memory.resumeText ? (
            <Button size="sm" onClick={() => careers.mutate(false)}>
              Run live AI on this CV
            </Button>
          ) : undefined
        }
      />
      <header className="page-head">
        <h1>You're not starting from zero.</h1>
        <p className="lead">Three paths that reuse what you already do.</p>
        <p className="muted small">
          Read as {profile.currentRole}
          {profile.yearsExperience !== null && <> · {profile.yearsExperience} years</>}
          {profile.industry && <> · {profile.industry}</>}
        </p>
        {profile.standout && <p className="standout">{profile.standout}</p>}
      </header>

      <div className="card-grid">
        {paths.map((career, i) => (
          <CareerCard
            key={career.id}
            career={career}
            met={Boolean(journey.intros[career.id]?.seen)}
            pay={pay.data?.[i]}
            payLoading={pay.isLoading}
            country={country}
            chosen={journey.careerId === career.id}
            onMeet={() => navigate(`/meet/${career.id}`)}
            onChoose={() => choose(career)}
          />
        ))}
      </div>

    </div>
  );
}

function CareerCard({
  career,
  met,
  pay,
  payLoading,
  country,
  chosen,
  onMeet,
  onChoose,
}: {
  career: Career;
  met: boolean;
  pay: Pay | null | undefined;
  payLoading: boolean;
  country: string;
  chosen: boolean;
  onMeet: () => void;
  onChoose: () => void;
}) {
  const effort = EFFORT[career.relativeEffort];
  return (
    <article className={`panel career ${chosen ? "career--chosen" : ""}`}>
      <header className="career__head">
        <h2 className="career__title">{career.title}</h2>
        <p className="career__meta">
          <Lozenge tone={effort.tone}>{effort.label}</Lozenge>
          {(career.workModes ?? []).length > 0 && (
            <span className="career__modes">{(career.workModes ?? []).map((m) => WORK_MODE[m] ?? m).join(" · ")}</span>
          )}
        </p>
      </header>

      <p className="career__summary">{career.roleSummary}</p>
      <PayLine pay={pay} loading={payLoading} country={country} />

      {career.transferableSkills.length > 0 && (
        <div className="career__tags">
          <span className="label">Your edge</span>
          <ul className="tags">
            {career.transferableSkills.slice(0, 3).map((s) => (
              <li key={s.skill} className={`tag ${s.verified ? "tag--proven" : ""}`} title={s.verified ? `From your CV: "${s.evidence}"` : "AI inference, not quoted from your CV"}>
                {s.verified && <CheckIcon />}
                {s.skill}
              </li>
            ))}
          </ul>
        </div>
      )}

      {career.missingSkills.length > 0 && (
        <div className="career__tags">
          <span className="label">To learn</span>
          <ul className="tags">
            {career.missingSkills.slice(0, 3).map((s) => (
              <li key={s} className="tag tag--learn">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="career__more">
        <summary>Why it fits you</summary>
        <p>{career.fitExplanation}</p>
        {career.motivationMatch && <p className="career__why small">{career.motivationMatch}</p>}
        <p className="small">
          <span className="strong">Trade-off:</span> {career.keyTradeoff}
        </p>
      </details>

      <div className="career__action">
        <button type="button" className={`meet-btn ${met ? "is-met" : ""}`} onClick={onMeet}>
          <span className="meet-btn__text">
            <strong>{met ? "Meet the job again" : "Meet the job"}</strong>
            <span>Duties, a typical day, the pay</span>
          </span>
          <span className="meet-btn__go" aria-hidden="true">
            <ArrowRightIcon />
          </span>
        </button>
        <button type="button" className={`plan-btn ${met || chosen ? "is-ready" : ""}`} onClick={onChoose}>
          <span>{chosen ? "Open my 30-day plan" : met ? "Build my 30-day plan" : "Skip to the plan"}</span>
          <span className="plan-btn__go" aria-hidden="true">
            <ArrowRightIcon />
          </span>
        </button>
      </div>
    </article>
  );
}
