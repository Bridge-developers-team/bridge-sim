import { useNavigate } from "react-router";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { memory, updateJourney } from "../state/journey";

const STEPS = [
  {
    title: "Three paths that fit you",
    text: "From your CV and your real week: roles that reuse what you already do, each backed by a quote from your own experience.",
  },
  {
    title: "A 30-day plan that fits your hours",
    text: "Four weeks of concrete tasks, never more than the time you said you have. Progress is saved as you tick.",
  },
  {
    title: "Proof, not promises",
    text: "Do a real 10-minute task from the new job, get graded against a visible rubric, and publish it as a shareable work sample.",
  },
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
    // Sample data answers instantly; the paths page offers a live AI run after.
    navigate("/paths", { state: { run: true, sample: data.mode !== "demo" } });
  };

  return (
    <div className="landing stack-lg">
      <section className="hero animate-fade-up">
        <p className="eyebrow">For working adults who want out, but not back to zero</p>
        <h1 className="display">Change careers without starting over.</h1>
        <p className="lead">
          Bridge reads your experience, shows three realistic next roles, plans your first 30 days around your actual
          week, and lets you try the new job before you bet on it.
        </p>
        <div className="row">
          <Button variant="primary" className="btn--lg" onClick={() => navigate("/start")}>
            Start with my CV
          </Button>
          <Button className="btn--lg" onClick={tryDemo} disabled={!config.data} loading={config.isLoading}>
            Try the demo
          </Button>
        </div>
        <p className="muted small">
          Demo: a fictional teacher with 7 years in the classroom, 5 free hours a week and no learning budget.
        </p>
      </section>

      <ol className="steps stagger">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel step">
            <span className="step__n tabular">{i + 1}</span>
            <h2 className="step__title">{s.title}</h2>
            <p className="muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
