import { useEffect, useState } from "react";
import { CheckIcon } from "../Icons";

/** What the user sees during a 5-40 s AI call: a small bridge building
 * itself, what is happening now, and how long it usually takes. Steps advance
 * on a timer: they describe the work, they do not track it. */
export function Waiting({ title, steps, usually }: { title: string; steps: string[]; usually: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const active = Math.min(steps.length - 1, Math.floor(seconds / 6));
  // Eases toward 95%; it never claims to be done before the answer is.
  const progress = Math.min(95, Math.round(100 * (1 - Math.exp(-seconds / 14))));
  return (
    <div className="waiting panel animate-fade" role="status" aria-live="polite">
      <svg className="waiting__bridge" viewBox="0 0 240 90" aria-hidden="true">
        <path className="waiting__arch" d="M10 70 Q120 -10 230 70" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} className="waiting__plank" x={14 + i * 24} y="68" width="20" height="8" rx="3" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
        <circle className="waiting__walker" cx="14" cy="60" r="6" />
      </svg>
      <div className="waiting__body">
        <h2 className="waiting__title">{title}</h2>
        <div className="waiting__bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <ol className="waiting__steps">
          {steps.map((step, i) => (
            <li key={step} className={i < active ? "is-done" : i === active ? "is-active" : ""}>
              <span className="waiting__mark" aria-hidden="true">
                {i < active ? <CheckIcon /> : null}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="waiting__note muted small tabular">
          {seconds}s · {usually} {seconds > 45 && "Taking longer than usual; still working."}
        </p>
      </div>
    </div>
  );
}
