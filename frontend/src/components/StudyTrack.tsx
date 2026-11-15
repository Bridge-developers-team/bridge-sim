import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Course, StudyPlan, Week } from "../api/types";
import { budgetLabel } from "../lib/options";
import { BookIcon, PlayIcon } from "./Icons";
import { Lozenge, type Tone } from "./ui/Lozenge";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

const COST: Record<Course["cost"], { label: string; tone: Tone }> = {
  free: { label: "Free", tone: "ok" },
  paid: { label: "Paid", tone: "neutral" },
};

/** Courses from the checked catalog for this role. Free ones only unless the
 * user set a learning budget. */
export function useStudyPlan(role: string, budget: number, hours: number) {
  const paid = budget > 0;
  return useQuery({
    queryKey: ["study", role, paid, hours],
    queryFn: () => bridgeApi.study(role, paid, hours),
    staleTime: Infinity,
    enabled: Boolean(role),
  });
}

function CourseRow({ course, main = false }: { course: Course; main?: boolean }) {
  const cost = COST[course.cost];
  return (
    <li className={`course ${main ? "course--main" : ""}`}>
      <span className="course__icon">{course.format === "lectures" ? <PlayIcon /> : <BookIcon />}</span>
      <span className="course__text">
        <a href={course.url} target="_blank" rel="noopener noreferrer">
          {course.title}
        </a>
        <span className="muted small">
          {course.provider}
          {course.length && <> · {course.length}</>}
        </span>
        {course.why && <span className="small">{course.why}</span>}
      </span>
      <Lozenge tone={cost.tone}>{cost.label}</Lozenge>
    </li>
  );
}

/** The month's course: what it covers week by week, what comes after the 30
 * days, and a few other good options. */
export function StudyPanel({
  query,
  budget,
  currency,
}: {
  query: ReturnType<typeof useStudyPlan>;
  budget: number;
  currency: string;
}) {
  if (query.isError) {
    return (
      <Panel>
        <PanelHeader title="Your course for this month" />
        <PanelBody>
          <p className="text-danger small">{errorText(query.error)}</p>
        </PanelBody>
      </Panel>
    );
  }
  const study = query.data;
  if (!study) return null;
  const { main } = study;
  return (
    <Panel className="study">
      <PanelHeader title="Your course for this month" note={study.fieldLabel} />
      <PanelBody className="stack">
        <ul className="courses">
          <CourseRow course={main} main />
        </ul>

        {main.modules.length > 0 && (
          <div className="stack-sm">
            <p className="label">This month in the course</p>
            <ol className="study__weeks">
              {study.weeks.map((w) => (
                <li key={w.week}>
                  <span className="study__week tabular">Week {w.week}</span>
                  <span>{w.modules.join(", ")}</span>
                </li>
              ))}
            </ol>
            {study.later.length > 0 && (
              <details className="task__more">
                <summary>
                  After the 30 days: {study.later.length} more module{study.later.length === 1 ? "" : "s"}
                </summary>
                <ol className="small">
                  {study.later.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}

        {study.more.length > 0 && (
          <div className="stack-sm">
            <p className="label">Other good options</p>
            <ul className="courses">
              {study.more.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </ul>
          </div>
        )}

        <p className="fine">
          {budget > 0
            ? `Paid options are included because your learning budget is ${budgetLabel(budget, currency)}; Coursera offers financial aid. `
            : "Free courses only, because your learning budget is 0. Add a budget on the start page to see paid certificates. "}
          Bridge picked these by hand and earns nothing from them. Links checked {study.checked}; prices differ by
          country, so check the course page.
        </p>
        <p className="fine">
          Why a plan around the course: in MIT's and Harvard's free online courses, about 3 in 100 learners finished in
          2017-18 (
          <a href="https://doi.org/10.1126/science.aav7958" target="_blank" rel="noopener noreferrer">
            Reich &amp; Ruipérez-Valiente, Science, 2019
          </a>
          ). Each week below pairs the course with small tasks you can tick off.
        </p>
      </PanelBody>
    </Panel>
  );
}

/** The part of the course that belongs to one plan week. */
export function WeekStudy({ study, week }: { study: StudyPlan | undefined; week: Week }) {
  if (!study) return null;
  const modules = study.weeks.find((w) => w.week === week.week)?.modules ?? [];
  return (
    <div className="resources">
      <p className="label">Study this week</p>
      <div className="course">
        <span className="course__icon">
          <BookIcon />
        </span>
        <span className="course__text">
          <a href={study.main.url} target="_blank" rel="noopener noreferrer">
            {modules.length ? modules.join(", ") : `Keep going: ${study.main.title}`}
          </a>
          <span className="muted small">
            {modules.length ? `${study.main.title} · ` : ""}
            {study.main.provider}
          </span>
        </span>
      </div>
    </div>
  );
}
