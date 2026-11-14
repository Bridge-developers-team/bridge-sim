import { useNavigate } from "react-router";
import { useConfig } from "../api/hooks";
import type { Task, TaskType } from "../api/types";
import { GrowingCalendar } from "../components/GrowingCalendar";
import { Button } from "../components/ui/Button";
import { TASK_TYPE, hoursText } from "../lib/labels";
import { memory, updateJourney } from "../state/journey";

/** The example plan in the hero: labeled sample data, not anyone's real plan. */
const SAMPLE_ROWS: [TaskType, number, boolean][][] = [
  [["simulation", 10, true], ["research", 30, true], ["research", 30, true], ["research", 60, false]],
  [["learning", 75, false], ["learning", 75, false], ["portfolio", 110, false]],
  [["portfolio", 90, false], ["portfolio", 150, false], ["portfolio", 30, false]],
  [["portfolio", 90, false], ["application", 60, false], ["networking", 60, false], ["research", 45, false]],
];
const SAMPLE_PLAN = {
  hoursPerWeek: 5,
  weeks: SAMPLE_ROWS.map((tasks, w) => ({
    week: w + 1,
    title: "",
    objective: "",
    tasks: tasks.map(
      ([type, minutes, completed], i): Task => ({
        id: `s${w}-${i}`,
        title: TASK_TYPE[type],
        type,
        estimatedMinutes: minutes,
        completed,
        whyThisMatters: "",
        instructions: [],
        deliverable: "",
        successCriteria: "",
      }),
    ),
  })),
};

const VALUES = [
  ["Discover realistic paths", "Three careers that build on what you already do, with honest trade-offs."],
  ["See transferable skills", "Each skill is backed by a quote from your own CV, checked by code."],
  ["Try the job, keep the proof", "A 10-minute task from the new role, graded on a visible rubric, publishable as a work sample."],
];

export function LandingPage() {
  const navigate = useNavigate();
  const config = useConfig();

  const tryDemo = () => {
    const data = config.data;
    if (!data) return;
    const { sampleId, ...persona } = data.demoPersona;
    memory.resumeText = data.samples.find((s) => s.id === sampleId)?.resume ?? "";
    updateJourney((j) => ({ ...j, profile: persona }));
    // Sample data answers instantly; the paths page then offers a live AI run.
    navigate("/paths", { state: { run: true, sample: data.mode !== "demo" } });
  };

  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="hero__copy animate-fade-up">
          <h1>Change careers without starting over.</h1>
          <p className="lead">
            Upload your CV, discover realistic career paths, and get a weekly plan you can actually follow.
          </p>
          <div className="row">
            <Button variant="primary" className="btn--lg" onClick={() => navigate("/start")}>
              Build my career roadmap
            </Button>
            <Button className="btn--lg" onClick={tryDemo} disabled={!config.data} loading={config.isLoading}>
              Try the demo
            </Button>
          </div>
          <p className="fine">
            The demo loads a fictitious teacher with 7 years of experience, 5 free hours a week and no learning budget.
            No sign-up.
          </p>
        </div>
        <figure className="sample-plan" aria-label="Example of a Bridge 30-day plan">
          <p className="sample-plan__role">Instructional Designer</p>
          <p className="sample-plan__from">from Middle-school teacher · {hoursText(SAMPLE_PLAN.hoursPerWeek)}</p>
          <GrowingCalendar roadmap={SAMPLE_PLAN} interactive={false} />
          <figcaption className="sample-plan__note">
            Example plan with sample data. Each bar is a task, sized by its minutes; filled bars are done.
          </figcaption>
        </figure>
      </section>

      <ul className="values">
        {VALUES.map(([title, text]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span className="muted">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
