import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { JobIntro } from "../api/types";
import { ArrowRightIcon, CheckIcon, ChevronIcon } from "../components/Icons";
import { PayLine, usePathPay } from "../components/PayLine";
import { Scene, type SceneKind } from "../components/Scene";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { chooseCareer } from "../lib/journey";
import { countryName } from "../lib/options";
import { getJourney, updateJourney, useJourney } from "../state/journey";

/** Meet a job before planning for it: a few short illustrated slides on what
 * the job is, the responsibilities, a typical day, the tools, the good and
 * hard parts, the pay, and how to start from where you are. */
export function IntroPage() {
  const { careerId = "" } = useParams();
  return <IntroView key={careerId} careerId={careerId} />;
}

interface Slide {
  kind: SceneKind;
  title: string;
  body: ReactNode;
}

function slidesFor(intro: JobIntro, pay: ReactNode): Slide[] {
  return [
    {
      kind: "hello",
      title: intro.role,
      body: <p className="meet__lead">{intro.oneLiner}</p>,
    },
    {
      kind: "tasks",
      title: "What you’d be responsible for",
      body: (
        <ol className="meet__list">
          {intro.responsibilities.map((r, i) => (
            <li key={r} style={{ "--i": i } as React.CSSProperties}>
              <span className="meet__num">{i + 1}</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      kind: "day",
      title: "A day in the job",
      body: (
        <ol className="meet__day">
          {intro.day.map((d, i) => (
            <li key={d.time + d.what} style={{ "--i": i } as React.CSSProperties}>
              <span className="meet__time tabular">{d.time}</span>
              <span>{d.what}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      kind: "tools",
      title: "Tools of the trade",
      body: (
        <ul className="meet__chips">
          {intro.tools.map((t, i) => (
            <li key={t} style={{ "--i": i } as React.CSSProperties}>
              {t}
            </li>
          ))}
        </ul>
      ),
    },
    {
      kind: "balance",
      title: "The good and the hard",
      body: (
        <div className="meet__twocol">
          <div>
            <p className="label">You’ll likely enjoy</p>
            <ul className="meet__plain">
              {intro.youWillLike.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">Harder parts</p>
            <ul className="meet__plain">
              {intro.hardParts.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    { kind: "pay", title: "What it pays", body: pay },
    {
      kind: "start",
      title: "How you’d start from where you are",
      body: (
        <ol className="meet__list">
          {intro.howToStart.map((r, i) => (
            <li key={r} style={{ "--i": i } as React.CSSProperties}>
              <span className="meet__num">
                <CheckIcon />
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      ),
    },
  ];
}

function IntroView({ careerId }: { careerId: string }) {
  const journey = useJourney();
  const navigate = useNavigate();
  const career = journey.careers?.careers.find((c) => c.id === careerId);
  const saved = journey.intros[careerId];
  const sample = journey.careers ? journey.careers.mode !== "live" : false;
  const started = useRef(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touch = useRef<number | null>(null);
  const pay = usePathPay();
  const payIndex = journey.careers?.careers.findIndex((c) => c.id === careerId) ?? -1;

  const load = useMutation({
    mutationFn: (asSample: boolean) => {
      const j = getJourney();
      return bridgeApi.intro(
        career!.title,
        j.profile.currentRole || j.careers?.profile.currentRole || "",
        countryName(j.profile.country || "us"),
        asSample,
      );
    },
    onSuccess: ({ intro, mode }) =>
      updateJourney((j) => ({ ...j, intros: { ...j.intros, [careerId]: { intro, mode, seen: false } } })),
  });

  useEffect(() => {
    if (career && !saved && !started.current) {
      started.current = true;
      load.mutate(sample);
    }
  }, [career, saved, load, sample]);

  const slides = saved
    ? slidesFor(
        saved.intro,
        <PayLine pay={pay.data?.[payIndex]} loading={pay.isLoading} country={journey.profile.country || "us"} />,
      )
    : [];
  const last = slides.length - 1;

  const go = (next: number) => {
    if (next < 0 || next > last) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    if (next === last) {
      updateJourney((j) =>
        j.intros[careerId] ? { ...j, intros: { ...j.intros, [careerId]: { ...j.intros[careerId]!, seen: true } } } : j,
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!career) {
    return (
      <Panel>
        <PanelBody className="stack">
          <h1>Pick a path first</h1>
          <Link className="btn btn--primary" to={journey.careers ? "/paths" : "/start"}>
            {journey.careers ? "See my paths" : "Start with my CV"}
          </Link>
        </PanelBody>
      </Panel>
    );
  }

  if (load.isError && !saved) {
    return <ErrorBox message={errorText(load.error)} onRetry={() => load.mutate(sample)} onSample={sample ? undefined : () => load.mutate(true)} />;
  }

  if (!saved) {
    return (
      <Waiting
        title={`Getting to know: ${career.title}`}
        steps={["Describing the job in plain words", "Listing the real responsibilities", "Walking through a typical day", "Finding how you would start"]}
        usually="Usually 5-15 seconds."
      />
    );
  }

  const slide = slides[index]!;
  const planNow = () => {
    updateJourney((j) => chooseCareer(j, careerId));
    navigate("/plan", { state: { run: true } });
  };

  return (
    <div className="stack-lg">
      <ModeBanner mode={saved.mode} />
      <section className="meet panel" aria-roledescription="carousel" aria-label={`Meet the job: ${career.title}`}>
        <header className="meet__top">
          <p className="meet__eyebrow">Meet the job</p>
          <p className="meet__count tabular" aria-live="polite">
            {index + 1} of {slides.length}
          </p>
        </header>

        <div
          className="meet__stage"
          onPointerDown={(e) => (touch.current = e.clientX)}
          onPointerUp={(e) => {
            if (touch.current === null) return;
            const dx = e.clientX - touch.current;
            touch.current = null;
            if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          }}
        >
          <article key={index} className={`meet__slide ${direction > 0 ? "from-right" : "from-left"}`} aria-roledescription="slide">
            <div className="meet__art">
              <Scene kind={slide.kind} />
            </div>
            <div className="meet__text">
              <h1 className="meet__title">{slide.title}</h1>
              {slide.body}
            </div>
          </article>
        </div>

        <nav className="meet__nav" aria-label="Slides">
          <button type="button" className="meet__arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
            <span className="flip">
              <ChevronIcon />
            </span>
          </button>
          <div className="meet__dots">
            {slides.map((s, i) => (
              <button
                key={s.kind}
                type="button"
                className={`meet__dot ${i === index ? "is-on" : ""} ${i < index ? "is-past" : ""}`}
                aria-label={`Slide ${i + 1}: ${s.title}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          {index < last ? (
            <button type="button" className="meet__arrow meet__arrow--next" onClick={() => go(index + 1)} aria-label="Next slide">
              <ChevronIcon />
            </button>
          ) : (
            <span className="meet__arrow-spacer" />
          )}
        </nav>

        {index === last && (
          <div className="meet__end">
            <button type="button" className="btn btn--primary btn--cta" onClick={planNow}>
              <span>Build my 30-day plan for this job</span>
              <span className="btn--cta__arrow" aria-hidden="true">
                <ArrowRightIcon />
              </span>
            </button>
            <div className="row">
              <Button variant="subtle" onClick={() => navigate(`/taste/${careerId}`)}>
                Optional: try a 10-minute task
              </Button>
              <Link className="link-btn" to="/paths">
                Meet another path
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
