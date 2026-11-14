import type { Roadmap, TaskType } from "../api/types";
import { TASK_TYPE, minutesText } from "../lib/labels";
import { nextAction, progress } from "../lib/progress";

/** The signature move (DESIGN.md "Growing Calendar"): one row per week, one bar
 * per task. A bar's length is its share of the user's weekly hours, its colour
 * is its kind, its form is its state: outline = to do, filled = done, ring and
 * "Next" pin = the next step. Interactive bars jump to their task. */
export function GrowingCalendar({
  roadmap,
  interactive = true,
  justFilled,
  onJump,
}: {
  roadmap: Pick<Roadmap, "weeks" | "hoursPerWeek">;
  interactive?: boolean;
  justFilled?: string | null;
  onJump?: (taskId: string) => void;
}) {
  const budget = roadmap.hoursPerWeek * 60;
  const next = interactive ? nextAction(roadmap as Roadmap) : null;
  const stats = progress(roadmap as Roadmap);
  const kinds = [...new Set(roadmap.weeks.flatMap((w) => w.tasks.map((t) => t.type)))] as TaskType[];

  return (
    <div>
      <div className="grow-cal" role="group" aria-label={`30-day calendar: ${stats.done} of ${stats.total} tasks done`}>
        {roadmap.weeks.map((week) => (
          <div className="gc-week" key={week.week}>
            <span className="gc-label">Wk {week.week}</span>
            <div className="gc-track" style={{ "--hours": roadmap.hoursPerWeek } as React.CSSProperties}>
              {week.tasks.map((task) => {
                const isNext = next?.task.id === task.id;
                const className = [
                  "gc-bar",
                  task.completed ? "is-done" : "",
                  isNext ? "is-next" : "",
                  justFilled === task.id ? "just-filled" : "",
                ].join(" ");
                const state = task.completed ? "done" : isNext ? "next" : "not started";
                const label = `${task.title}, ${minutesText(task.estimatedMinutes)}, ${state}`;
                const style = { flexBasis: `${((task.estimatedMinutes / budget) * 100).toFixed(2)}%` };
                const pin = isNext ? (
                  <span className="gc-pin" aria-hidden="true">
                    Next
                  </span>
                ) : null;
                return interactive ? (
                  <button
                    key={task.id}
                    type="button"
                    className={className}
                    data-kind={task.type}
                    style={style}
                    aria-label={label}
                    title={label}
                    onClick={() => onJump?.(task.id)}
                  >
                    {pin}
                  </button>
                ) : (
                  <span key={task.id} className={className} data-kind={task.type} style={style} title={label} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ul className="gc-legend" aria-label="Legend">
        {kinds.map((kind) => (
          <li key={kind} data-kind={kind}>
            <span className="sw" />
            {TASK_TYPE[kind]}
          </li>
        ))}
        <li>
          <span className="sw sw--outline" />
          To do
        </li>
        <li>
          <span className="sw sw--grid" />
          Gridline = 1 hour of your {roadmap.hoursPerWeek} h week
        </li>
      </ul>
    </div>
  );
}
