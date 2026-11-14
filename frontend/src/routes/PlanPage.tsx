import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText, useConfig } from "../api/hooks";
import type { Roadmap, Task, Track } from "../api/types";
import { Button } from "../components/ui/Button";
import { Choices } from "../components/ui/Choices";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Lozenge } from "../components/ui/Lozenge";
import { ModeBanner } from "../components/ui/ModeBanner";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { Waiting } from "../components/ui/Waiting";
import { GrowingCalendar } from "../components/GrowingCalendar";
import { JobsPanel } from "../components/JobsPanel";
import { MoneyCheck } from "../components/MoneyCheck";
import { WeekResources } from "../components/WeekResources";
import { selectedCareer, setDone, withPractice, withRoadmap } from "../lib/journey";
import { TASK_TYPE, WEEK_STATUS, hoursText, minutesText } from "../lib/labels";
import { nextAction, progress, weekMinutes, weekStatus } from "../lib/progress";
import { getJourney, resetJourney, updateJourney, useJourney } from "../state/journey";

const HOURS = [2, 3, 5, 8, 10, 15, 20].map((h) => ({ value: h, label: `${h} h` }));

export function PlanPage() {
  const journey = useJourney();
  const career = selectedCareer(journey);
  const navigate = useNavigate();
  const config = useConfig();
  const [hours, setHours] = useState(journey.roadmap?.hoursPerWeek ?? journey.profile.hoursPerWeek);
  const [track, setTrack] = useState<Track>(journey.roadmap?.track ?? journey.profile.transitionPreference);
  const [notice, setNotice] = useState<string | null>(null);
  // The bar of a task ticked just now animates its fill once.
  const [justFilled, setJustFilled] = useState<string | null>(null);
  const tick = (taskId: string, done: boolean) => {
    updateJourney((j) => setDone(j, taskId, done));
    setJustFilled(done ? taskId : null);
  };
  const started = useRef(false);
  const sample = journey.careers?.mode === "sample";

  const build = useMutation({
    mutationFn: (args: { sample: boolean }) =>
      bridgeApi.roadmap(career!, getJourney().profile, track, hours, args.sample),
    onSuccess: ({ roadmap, mode }) => {
      const had = Boolean(getJourney().roadmap);
      let summary = { kept: 0, lost: 0 };
      updateJourney((j) => {
        const next = withRoadmap(j, roadmap, mode);
        summary = { kept: next.kept, lost: next.lost };
        return next.journey;
      });
      if (had) {
        setNotice(
          `New plan ready. Kept ${summary.kept} completed task${summary.kept === 1 ? "" : "s"}` +
            (summary.lost ? `; ${summary.lost} completed task${summary.lost === 1 ? " is" : "s are"} not in the new plan.` : "."),
        );
      }
      prefetchPractice(roadmap, mode !== "live");
    },
  });

  // First visit for this path: build the plan once.
  useEffect(() => {
    if (career && !journey.roadmap && !started.current) {
      started.current = true;
      build.mutate({ sample });
    }
  }, [career, journey.roadmap, build, sample]);

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

  if (build.isPending) {
    return (
      <Waiting
        title={`Building your 30-day ${career.title} plan`}
        steps={["Choosing the first practice task", "Fitting each week into your hours", "Writing checkable deliverables", "Checking the plan rules"]}
        usually={`Four weeks that fit ${hoursText(hours)}. Usually 20-40 seconds.`}
      />
    );
  }

  if (build.isError || !journey.roadmap) {
    return (
      <ErrorBox
        message={build.isError ? errorText(build.error) : "No plan yet."}
        onRetry={() => build.mutate({ sample })}
        onSample={sample ? undefined : () => build.mutate({ sample: true })}
      />
    );
  }

  const plan = journey.roadmap;
  const stats = progress(plan);
  const next = nextAction(plan);
  const rebuild = () => {
    if (window.confirm("Build a new plan with these settings? Ticks are kept for tasks that stay in the new plan.")) {
      setNotice(null);
      build.mutate({ sample });
    }
  };

  return (
    <div className="stack-lg">
      <ModeBanner mode={journey.roadmapMode} />
      <section className="packet" aria-labelledby="packet-role">
        <h1 id="packet-role" className="packet__role">
          <span className="sr-only">My career roadmap: </span>
          {plan.targetRole}
        </h1>
        <p className="packet__from">from {plan.currentRole}</p>
        <div className="packet__meta">
          <p className="packet__progress tabular">
            <strong>
              {stats.done} of {stats.total}
            </strong>{" "}
            tasks done ({stats.percent}%)
          </p>
          <span>
            Your first 30 days · {hoursText(plan.hoursPerWeek)} ·{" "}
            {config.data?.tracks.find((t) => t.id === plan.track)?.label ?? plan.track}
          </span>
        </div>
        <GrowingCalendar roadmap={plan} justFilled={justFilled} onJump={jumpToTask} />
        {career.missingSkills.length > 0 && (
          <p className="packet__skills">
            <strong>Skills this plan builds:</strong> {career.missingSkills.join(", ")}
          </p>
        )}
      </section>

      {notice && (
        <p className="notice animate-drop" role="status">
          {notice}
        </p>
      )}

      {next ? (
        <Panel className="next">
          <PanelHeader title="Your next step" note={`Week ${next.week} · ${minutesText(next.task.estimatedMinutes)}`} />
          <PanelBody className="stack">
            <p className="next__title">{next.task.title}</p>
            <p className="muted">{next.task.whyThisMatters}</p>
            <div className="row">
              {next.task.type === "simulation" ? (
                <Button variant="primary" onClick={() => navigate(`/practice/${next.task.id}`)}>
                  Open the practice task
                </Button>
              ) : (
                <Button variant="primary" onClick={() => tick(next.task.id, true)}>
                  Mark as done
                </Button>
              )}
            </div>
          </PanelBody>
        </Panel>
      ) : (
        <Panel className="next">
          <PanelBody>
            <h2>All 30 days done.</h2>
            <p className="muted">A roadmap is a start, not a promise. Your proof page is the thing to share next.</p>
          </PanelBody>
        </Panel>
      )}

      {plan.weeks.map((week) => {
        const status = WEEK_STATUS[weekStatus(week)];
        return (
          <Panel key={week.week}>
            <PanelHeader
              title={`Week ${week.week} · ${week.title}`}
              note={<span className="tabular">{minutesText(weekMinutes(week))} of {plan.hoursPerWeek} h</span>}
              actions={<Lozenge tone={status.tone}>{status.label}</Lozenge>}
            />
            <PanelBody className="stack">
              {week.objective && <p className="muted">{week.objective}</p>}
              <ul className="tasks">
                {week.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onTick={tick} onOpen={() => navigate(`/practice/${task.id}`)} />
                ))}
              </ul>
              <WeekResources roadmapId={plan.id} week={week} role={plan.targetRole} sample={journey.roadmapMode !== "live"} />
            </PanelBody>
          </Panel>
        );
      })}

      <JobsPanel role={plan.targetRole} />

      {(plan.cautions.length > 0 || plan.assumptions.length > 0) && (
        <Panel>
          <PanelHeader title="Assumptions and cautions" />
          <PanelBody>
            <ul className="plain small">
              {[...plan.cautions, ...plan.assumptions].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Change the plan" />
        <PanelBody className="stack">
          <Choices label="Hours per week" options={HOURS} value={hours} onChange={setHours} />
          <Choices
            label="Pace"
            options={(config.data?.tracks ?? []).map((t) => ({ value: t.id, label: t.label }))}
            value={track}
            onChange={setTrack}
          />
          <div>
            <Button onClick={rebuild}>Rebuild the plan</Button>
          </div>
        </PanelBody>
      </Panel>

      <MoneyCheck budget={journey.profile.monthlyLearningBudget} currency={journey.profile.currency} />

      <Panel>
        <PanelHeader title="Your data" />
        <PanelBody className="stack">
          <p className="muted small">
            Your plan and progress are saved in this browser only. Your CV text and any income you type are never saved.
          </p>
          <div>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Delete your paths, plan and practice work from this browser?")) {
                  resetJourney();
                  navigate("/");
                }
              }}
            >
              Delete my data from this browser
            </Button>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

function TaskRow({
  task,
  onTick,
  onOpen,
}: {
  task: Task;
  onTick: (taskId: string, done: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <li className="task" id={`task-${task.id}`}>
      <input
        id={`check-${task.id}`}
        type="checkbox"
        className="task__check"
        checked={task.completed}
        onChange={(e) => onTick(task.id, e.target.checked)}
        aria-label={`Done: ${task.title}`}
      />
      <div className="task__body">
        <div className="task__head">
          <span className="task__title">{task.title}</span>
          <Lozenge kind={task.type}>{TASK_TYPE[task.type]}</Lozenge>
          <span className="muted small tabular">{minutesText(task.estimatedMinutes)}</span>
          {task.completed && <Lozenge tone="ok">Done</Lozenge>}
        </div>
        <p className="small">
          <span className="strong">You make:</span> {task.deliverable}
        </p>
        <details className="task__more">
          <summary>How to do it</summary>
          {task.whyThisMatters && <p className="small muted">{task.whyThisMatters}</p>}
          <ol className="small">
            {task.instructions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="small">
            <span className="strong">Done when:</span> {task.successCriteria}
          </p>
        </details>
        {task.type === "simulation" && (
          <div>
            <Button size="sm" onClick={onOpen}>
              Open practice task
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/** A calendar bar jumps to its task row and focuses the checkbox. */
function jumpToTask(taskId: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(`task-${taskId}`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  document.getElementById(`check-${taskId}`)?.focus({ preventScroll: true });
}

/** The first practice task is written in the background while the user reads
 * the plan, so opening it is instant. A failure here is silent: the practice
 * page asks again and shows the error there. */
function prefetchPractice(plan: Roadmap, sample: boolean) {
  const journey = getJourney();
  const career = selectedCareer(journey);
  const task = plan.weeks[0]?.tasks.find((t) => t.type === "simulation");
  if (!career || !task || journey.practices[task.id]) return;
  bridgeApi
    .practice(career, task, journey.profile, sample)
    .then(({ practice, practiceToken, mode }) => {
      if (!getJourney().practices[task.id]) {
        updateJourney((j) => withPractice(j, task.id, { practice, practiceToken, mode, answer: "" }));
      }
    })
    .catch(() => undefined);
}
