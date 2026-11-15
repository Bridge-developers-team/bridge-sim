import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Course, StudyPlan, Video, Week } from "../api/types";
import { budgetLabel } from "../lib/options";
import { useJourney } from "../state/journey";
import { BookIcon, PlayIcon, SearchIcon } from "./Icons";
import { Lozenge, type Tone } from "./ui/Lozenge";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

const COST: Record<Course["cost"], { label: string; tone: Tone }> = {
  free: { label: "Free", tone: "ok" },
  paid: { label: "Paid", tone: "neutral" },
};

/** The checked catalog for this role's field, fitted to the budget (a paid
 * certificate only when the monthly budget covers its price). */
export function useStudyPlan(role: string, budget: number, currency: string, hours: number, field = "") {
  return useQuery({
    queryKey: ["study", role, budget, currency, hours, field],
    queryFn: () => bridgeApi.study(role, budget, currency, hours, field),
    staleTime: Infinity,
    enabled: Boolean(role),
  });
}

/** Courses, lectures and guides the live AI found on the web for this exact
 * role (links are the search engine's own results). Empty in demo mode. */
export function useWebCourses(role: string, budget: number, currency: string, sample: boolean) {
  return useQuery({
    queryKey: ["study-web", role, budget, currency, sample],
    queryFn: () => bridgeApi.studySearch(role, budget, currency, sample),
    staleTime: Infinity,
    retry: false,
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

/** The course that leads the month: the catalog's when the role fits a
 * catalog field, else the best course found for this exact role. */
export function leadCourse(study: StudyPlan, web: Course[]): Course | null {
  if (study.main && (study.matched || web.length === 0)) return study.main;
  return web[0] ?? study.main;
}

function CourseRow({ course, main = false }: { course: Course; main?: boolean }) {
  const cost = COST[course.cost];
  const price = course.cost === "paid" && course.monthlyUsd ? ` · about $${course.monthlyUsd} a month (US price)` : "";
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
          {price}
        </span>
        {course.why && <span className="small">{course.why}</span>}
      </span>
      <Lozenge tone={cost.tone}>{cost.label}</Lozenge>
    </li>
  );
}

export function StudyPanel({
  role,
  query,
  web,
  budget,
  currency,
  hasVideos = false,
}: {
  role: string;
  query: ReturnType<typeof useStudyPlan>;
  web: ReturnType<typeof useWebCourses>;
  budget: number;
  currency: string;
  /** Whether the videos panel has videos to show; the text points there only then. */
  hasVideos?: boolean;
}) {
  if (query.isError) {
    return (
      <Panel>
        <PanelHeader title="What to study this month" />
        <PanelBody>
          <p className="text-danger small">{errorText(query.error)}</p>
        </PanelBody>
      </Panel>
    );
  }
  const study = query.data;
  if (!study) return null;
  const found = web.data?.courses ?? [];
  const main = leadCourse(study, found);
  if (!main) {
    return (
      <Panel className="study">
        <PanelHeader title="What to study this month" note={web.isLoading ? "Searching…" : "No match yet"} />
        <PanelBody className="stack">
          {web.isLoading ? (
            <p className="study__searching muted small">
              <SearchIcon /> Finding courses and lectures for this exact job…
            </p>
          ) : (
            <p className="small">
              Bridge's checked course list does not cover this path yet, and it will not send you to a course from another
              field.{" "}
              {hasVideos
                ? "Start with the videos picked for this path below, and the weekly tasks."
                : "Start with the weekly tasks below: each one builds a skill this path needs."}
            </p>
          )}
          {budget === 0 && <p className="fine fine--quiet">Your learning budget is 0, so paid courses are not shown.</p>}
        </PanelBody>
      </Panel>
    );
  }
  const fromCatalog = main === study.main;
  const foundRest = found.filter((c) => c.url !== main.url);
  // Off-field roles: the catalog's picks (if any) stay below the found ones.
  const catalogRest = fromCatalog ? study.more : [...(study.main ? [study.main] : []), ...study.more];
  return (
    <Panel className="study">
      <PanelHeader title="What to study this month" note={study.matched ? study.fieldLabel : role} />
      <PanelBody className="stack">
        <ul className="courses">
          <CourseRow course={main} main />
        </ul>

        {fromCatalog && main.modules.length > 0 && (
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

        <div className="stack-sm">
          <p className="label">Picked for {role}</p>
          {web.isLoading && (
            <p className="study__searching muted small">
              <SearchIcon /> Finding courses and lectures for this exact job…
            </p>
          )}
          {!web.isLoading && web.data?.mode !== "live" && (
            <p className="muted small">With live AI, Bridge searches course sites for this exact job. This demo shows the checked list.</p>
          )}
          {web.data?.mode === "live" && found.length === 0 && (
            <p className="muted small">No extra courses found for this exact title; the checked list below still fits.</p>
          )}
          {foundRest.length > 0 && (
            <ul className="courses">
              {foundRest.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </ul>
          )}
        </div>

        {catalogRest.length > 0 && (
          <div className="stack-sm">
            <p className="label">{study.matched ? `More for ${study.fieldLabel.toLowerCase()}` : "Good for any switch"}</p>
            <ul className="courses">
              {catalogRest.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </ul>
          </div>
        )}

        <p className="fine fine--quiet">
          {budget > 0 ? `Budget: ${budgetLabel(budget, currency)} (about $${study.budgetUsd}). ` : "Budget 0: free material only. "}
          Links come from search results or our checked list (November 2026), never typed by the AI. Check the price on the
          course page.
        </p>
      </PanelBody>
    </Panel>
  );
}

/** The part of the month's course that belongs to one plan week. */
export function WeekStudy({ study, web, week }: { study: StudyPlan | undefined; web: Course[]; week: Week }) {
  if (!study) return null;
  const main = leadCourse(study, web);
  if (!main) return null;
  const fromCatalog = main === study.main;
  const modules = fromCatalog ? (study.weeks.find((w) => w.week === week.week)?.modules ?? []) : [];
  // Without a catalog syllabus, each week points at the next found course.
  const course = fromCatalog ? main : web[(week.week - 1) % web.length]!;
  return (
    <div className="resources">
      <p className="label">Study this week</p>
      <div className="course">
        <span className="course__icon">{course.format === "lectures" ? <PlayIcon /> : <BookIcon />}</span>
        <span className="course__text">
          <a href={course.url} target="_blank" rel="noopener noreferrer">
            {modules.length ? modules.join(", ") : course.title}
          </a>
          <span className="muted small">
            {modules.length ? `${course.title} · ` : ""}
            {course.provider}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Both course sources for the plan page in one call. */
export function usePlanStudy(role: string, hours: number, field = "") {
  const journey = useJourney();
  const { monthlyLearningBudget: budget, currency } = journey.profile;
  const sample = journey.roadmapMode ? journey.roadmapMode !== "live" : false;
  return {
    study: useStudyPlan(role, budget, currency, hours, field),
    web: useWebCourses(role, budget, currency, sample),
    budget,
    currency,
  };
}
