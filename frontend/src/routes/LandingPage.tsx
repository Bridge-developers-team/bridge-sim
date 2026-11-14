import { useNavigate } from "react-router";
import { useConfig } from "../api/hooks";
import type { Task, TaskType } from "../api/types";
import { GrowingCalendar } from "../components/GrowingCalendar";
import { ArrowRightIcon } from "../components/Icons";
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

export function LandingPage() {
  const navigate = useNavigate();
  const config = useConfig();

  const tryDemo = () => {
    const data = config.data;
    if (!data) return;
    const { sampleId, ...persona } = data.demoPersona;
    memory.resumeText = data.samples.find((s) => s.id === sampleId)?.resume ?? "";
    updateJourney((j) => ({ ...j, profile: { ...j.profile, ...persona } }));
    // Sample data answers instantly; the paths page then offers a live AI run.
    navigate("/paths", { state: { run: true, sample: data.mode !== "demo" } });
  };

  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="hero__copy">
          <h1>Change careers without starting over.</h1>
          <p className="lead">
            Upload your CV, discover realistic career paths, and get a weekly plan you can actually follow.
          </p>
          <div className="row">
            <Button variant="primary" className="btn--lg" onClick={() => navigate("/start")}>
              Build my career roadmap
            </Button>
            <Button variant="subtle" onClick={tryDemo} disabled={!config.data} loading={config.isLoading}>
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

      <div className="story">
        <section className="story__scene">
          <div className="story__head">
            <span className="story__step">
              <b>1</b>Where you are now
            </span>
            <h2 className="story__title">Two minutes, nothing to type.</h2>
            <p className="lead">One upload and a few taps. Your CV is read on your device.</p>
          </div>
          <figure className="story-card" aria-label="Example: a CV and a few answers, ready to find paths">
            <div className="story-card__row">
              <strong>teacher-cv.pdf</strong>
              <span>412 words · read on this device</span>
            </div>
            <div className="story-card__row">
              <span>Free time</span>
              <span>5 hours a week</span>
            </div>
            <div className="story-card__row">
              <span>Budget</span>
              <span>Free resources only</span>
            </div>
            <div className="story-card__row story-card__focus">
              <strong>Find my 3 paths</strong>
              <span>about 20 seconds</span>
            </div>
          </figure>
        </section>

        <section className="story__scene">
          <div className="story__head">
            <span className="story__step">
              <b>2</b>Three paths
            </span>
            <h2 className="story__title">You're not starting from zero.</h2>
            <p className="lead">Every skill is quoted from your own CV, and code checks each quote.</p>
          </div>
          <figure className="story-card story-card__focus" aria-label="Example path card: Instructional Designer">
            <span className="tag tag--learn">Best fit · sample</span>
            <p className="career__title">Instructional Designer</p>
            <p className="story-card__quote">“plan every unit from state standards to final assessment”</p>
            <div className="story-meter">
              Skill match
              <div className="story-meter__bar">
                <i style={{ "--v": "82%" } as React.CSSProperties} />
              </div>
            </div>
            <div className="story-meter">
              How much you'd enjoy it
              <div className="story-meter__bar">
                <i className="is-gold" style={{ "--v": "90%" } as React.CSSProperties} />
              </div>
            </div>
          </figure>
        </section>

        <section className="story__scene">
          <div className="story__head">
            <span className="story__step">
              <b>3</b>Your 30 days
            </span>
            <h2 className="story__title">A plan that fits your week.</h2>
            <p className="lead">Four weeks of small tasks, never more than the hours you have.</p>
          </div>
          <figure className="packet" aria-label="Example 30-day plan">
            <p className="packet__role">Instructional Designer</p>
            <p className="packet__from">from Middle-school teacher · {hoursText(SAMPLE_PLAN.hoursPerWeek)}</p>
            <GrowingCalendar roadmap={SAMPLE_PLAN} interactive={false} />
          </figure>
        </section>

        <section className="story__scene">
          <div className="story__head">
            <span className="story__step">
              <b>4</b>Try the job
            </span>
            <h2 className="story__title">Ten minutes of the real work.</h2>
            <p className="lead">A small task from the new role, graded on a rubric you see first.</p>
          </div>
          <figure className="story-card" aria-label="Example practice task and its feedback">
            <p className="small muted">Practice · Instructional Designer · 10 min · sample</p>
            <p className="story-card__quote">
              “By the end of this module, new staff will perform the pre-shift dock check with no missed steps.”
            </p>
            <div className="story-meter">
              Measurable action
              <div className="story-meter__bar">
                <i style={{ "--v": "100%" } as React.CSSProperties} />
              </div>
            </div>
            <div className="story-meter">
              Fits the audience
              <div className="story-meter__bar">
                <i style={{ "--v": "75%" } as React.CSSProperties} />
              </div>
            </div>
            <p className="small muted">AI practice feedback, not a hiring decision.</p>
          </figure>
        </section>

        <section className="story__end">
          <span className="story__step">
            <b>5</b>Proof
          </span>
          <h2 className="story__title">Leave with something to show.</h2>
          <p className="lead">Publish your graded task as a public work sample, or keep it private.</p>
          <div className="row">
            <button type="button" className="btn btn--primary btn--cta" onClick={() => navigate("/start")}>
              <span>Build my career roadmap</span>
              <span className="btn--cta__arrow" aria-hidden="true">
                <ArrowRightIcon />
              </span>
            </button>
            <Button variant="subtle" onClick={tryDemo} disabled={!config.data}>
              See it with the demo teacher
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
