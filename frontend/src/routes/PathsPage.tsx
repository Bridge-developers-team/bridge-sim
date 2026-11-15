import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Career, Pay } from "../api/types";
import { useQuery } from "@tanstack/react-query";
import { COUNTRIES } from "../lib/options";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Lozenge } from "../components/ui/Lozenge";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { TastingPanel } from "../components/TastingPanel";
import { chooseCareer, type Tasting, withCareers } from "../lib/journey";
import { ENERGY_LABELS } from "../lib/tasting";
import { CheckIcon } from "../components/Icons";
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

  const titles = journey.careers?.careers.map((c) => c.title) ?? [];
  const pay = useQuery({
    queryKey: ["pay", titles, journey.profile.country, journey.profile.location],
    queryFn: () => bridgeApi.pay(titles, journey.profile.country || "us", journey.profile.location),
    enabled: titles.length > 0,
    staleTime: Infinity,
  });

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
        <p className="lead">Three paths that reuse what you already do. Taste them, then pick one.</p>
        <p className="muted small">
          Read as {profile.currentRole}
          {profile.yearsExperience !== null && <> · {profile.yearsExperience} years</>}
          {profile.industry && <> · {profile.industry}</>}
        </p>
      </header>

      <TastingPanel onChoose={choose} />

      <div className="card-grid">
        {paths.map((career, i) => (
          <CareerCard
            key={career.id}
            career={career}
            tasting={journey.tastings[career.id]}
            pay={pay.data?.[i]}
            payLoaded={pay.isSuccess}
            country={country}
            chosen={journey.careerId === career.id}
            onTaste={() => navigate(`/taste/${career.id}`)}
            onChoose={() => choose(career)}
          />
        ))}
      </div>

    </div>
  );
}

function CareerCard({
  career,
  tasting,
  pay,
  payLoaded,
  country,
  chosen,
  onTaste,
  onChoose,
}: {
  career: Career;
  tasting: Tasting | undefined;
  pay: Pay | null | undefined;
  payLoaded: boolean;
  country: string;
  chosen: boolean;
  onTaste: () => void;
  onChoose: () => void;
}) {
  const effort = EFFORT[career.relativeEffort];
  const tasted = tasting?.evaluation;
  return (
    <article className={`panel career ${chosen ? "career--chosen" : ""}`}>
      <div className="career__head">
        <h2 className="career__title">{career.title}</h2>
        <Lozenge tone={effort.tone}>{effort.label}</Lozenge>
      </div>
      <p className="career__summary">{career.roleSummary}</p>
      {payLoaded && <PayLine pay={pay ?? null} country={country} />}

      {career.transferableSkills.length > 0 && (
        <div className="career__tags">
          <span className="label">Your edge</span>
          <ul className="tags">
            {career.transferableSkills.map((s) => (
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
            {career.missingSkills.map((s) => (
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
        {career.transferableSkills.some((s) => s.verified) && (
          <ul className="plain small">
            {career.transferableSkills
              .filter((s) => s.verified)
              .map((s) => (
                <li key={s.skill}>
                  <span className="strong">{s.skill}:</span> <q className="quote">{s.evidence}</q>
                </li>
              ))}
          </ul>
        )}
        <p className="small">
          <span className="strong">Trade-off:</span> {career.keyTradeoff}
        </p>
        {career.assumptions.length > 0 && <p className="muted small">{career.assumptions.join(" ")}</p>}
      </details>

      <div className="career__action">
        {tasted && (
          <p className="small tabular">
            <span className="strong">Your taste:</span> {tasted.totalScore}/{tasted.maxTotal}
            {tasting.energy !== undefined && <> · "{ENERGY_LABELS[tasting.energy]}"</>}
          </p>
        )}
        <div className="row">
          <Button variant={tasted ? "subtle" : "default"} onClick={onTaste}>
            {tasted ? (tasting.energy === undefined ? "Finish the taste" : "Open my taste") : "Taste it · 10 min"}
          </Button>
          <Button variant={chosen ? "primary" : "default"} onClick={onChoose}>
            {chosen ? "Open my 30-day plan" : "Build my 30-day plan"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function money(n: number, currency: string): string {
  return currency === "KZT" ? `${n.toLocaleString("en-US")} ₸` : n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
}

/** Typical pay for this path where the user lives, from an official table,
 * with the source one tap away. No figure is ever estimated. */
function PayLine({ pay, country }: { pay: Pay | null; country: string }) {
  if (!pay) {
    const name = COUNTRIES.find((c) => c.value === country)?.label ?? "your country";
    return (
      <p className="pay pay--none small muted">
        No official pay figure for this role in {name} yet. Job listings on your plan show pay when employers post it.
      </p>
    );
  }
  const amount = pay.low === pay.high ? money(pay.low, pay.currency) : `${money(pay.low, pay.currency)} – ${money(pay.high, pay.currency)}`;
  return (
    <div className="pay">
      <p className="pay__amount">
        <span className="label">Typical pay in {pay.area}</span>
        <strong className="tabular">{amount}</strong> <span className="muted small">a {pay.period}</span>
      </p>
      <p className="fine">
        {pay.stat === "median" ? "Median" : "Average"} for “{pay.occupation}”, the closest official job title.
        {pay.note && <> {pay.note}</>}{" "}
        <a href={pay.url} target="_blank" rel="noopener noreferrer">
          {pay.source}
        </a>
      </p>
    </div>
  );
}
