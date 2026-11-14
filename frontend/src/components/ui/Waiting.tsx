import { useEffect, useState } from "react";

/** What the user sees during a 10-40 s AI call: what is happening right now,
 * how long it has been, and how long it usually takes. Never a bare spinner.
 * Steps advance on a timer: they describe the work, they do not track it. */
export function Waiting({ title, steps, usually }: { title: string; steps: string[]; usually: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const active = Math.min(steps.length - 1, Math.floor(seconds / 6));
  return (
    <div className="waiting panel animate-fade" role="status" aria-live="polite">
      <div className="waiting__head">
        <span className="waiting__spinner" aria-hidden="true" />
        <h2 className="waiting__title">{title}</h2>
        <span className="waiting__clock tabular">{seconds}s</span>
      </div>
      <ol className="waiting__steps">
        {steps.map((step, i) => (
          <li key={step} className={i < active ? "is-done" : i === active ? "is-active" : ""}>
            {step}
          </li>
        ))}
      </ol>
      <p className="muted small">
        {usually} {seconds > 45 && "Taking longer than usual; still working."}
      </p>
    </div>
  );
}
