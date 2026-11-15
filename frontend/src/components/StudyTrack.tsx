import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Course, StudyPlan, Video, Week } from "../api/types";
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
export function useStudyPlan(role: string, budget: number, hours: number, field = "") {
  const paid = budget > 0;
  return useQuery({
    queryKey: ["study", role, paid, hours, field],
    queryFn: () => bridgeApi.study(role, paid, hours, field),
    staleTime: Infinity,
    enabled: Boolean(role),
  });
}

/** The best English YouTube video for each of the path's video searches. */
export function useVideos(role: string, queries: string[]) {
  return useQuery({
    queryKey: ["videos", role, queries],
    queryFn: () => bridgeApi.videos(role, queries),
    staleTime: Infinity,
    enabled: Boolean(role),
    retry: false,
  });
}

function viewsText(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

/** Videos to start with. Hidden when the server has no YouTube key; says so
 * plainly when YouTube had nothing good enough. */
export function VideosPanel({ query }: { query: ReturnType<typeof useVideos> }) {
  if (query.isPending || query.isError || !query.data || query.data.source === "off") return null;
  const { videos } = query.data;
  return (
    <Panel className="videos">
      <PanelHeader title="Videos to start with" note="English · well watched" />
      <PanelBody className="stack">
        {videos.length === 0 ? (
          <p className="muted small">YouTube had no well-watched English lesson for this path today. The course above covers it.</p>
        ) : (
          <ul className="video-list">
            {videos.map((v) => (
              <VideoRow key={v.id} video={v} />
            ))}
          </ul>
        )}
        <p className="fine">
          Picked from YouTube by search, views and length (3 to 90 minutes, English). Bridge does not make or rank the
          content itself.
        </p>
      </PanelBody>
    </Panel>
  );
}

function VideoRow({ video }: { video: Video }) {
  return (
    <li className="video">
      <a className="video__thumb" href={video.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
        {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" width={160} height={90} /> : <PlayIcon />}
        <span className="video__len tabular">{video.minutes} min</span>
      </a>
      <span className="video__text">
        <a href={video.url} target="_blank" rel="noopener noreferrer">
          {video.title}
        </a>
        <span className="muted small tabular">
          {video.channel} · {viewsText(video.views)}
        </span>
        <span className="fine">For: {video.query}</span>
      </span>
    </li>
  );
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
  hasVideos = false,
}: {
  query: ReturnType<typeof useStudyPlan>;
  budget: number;
  currency: string;
  /** Whether the videos panel has videos to show; the text points there only then. */
  hasVideos?: boolean;
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
  if (!main) {
    return (
      <Panel className="study">
        <PanelHeader title="Your course for this month" note="No match yet" />
        <PanelBody className="stack">
          <p className="small">
            Bridge's hand-checked course list does not cover this path yet, and it will not send you to a course from
            another field.{" "}
            {hasVideos
              ? "Start with the videos picked for this path below, and the weekly tasks."
              : "Start with the weekly tasks below: each one builds a skill this path needs."}
          </p>
          {budget === 0 && (
            <p className="fine">Your learning budget is 0, so paid courses are not shown.</p>
          )}
        </PanelBody>
      </Panel>
    );
  }
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
  if (!study?.main) return null;
  const main = study.main;
  const modules = study.weeks.find((w) => w.week === week.week)?.modules ?? [];
  return (
    <div className="resources">
      <p className="label">Study this week</p>
      <div className="course">
        <span className="course__icon">
          <BookIcon />
        </span>
        <span className="course__text">
          <a href={main.url} target="_blank" rel="noopener noreferrer">
            {modules.length ? modules.join(", ") : `Keep going: ${main.title}`}
          </a>
          <span className="muted small">
            {modules.length ? `${main.title} · ` : ""}
            {main.provider}
          </span>
        </span>
      </div>
    </div>
  );
}
