import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Resource, Week } from "../api/types";
import { useJourney, updateJourney } from "../state/journey";
import { ArticleIcon, PlayIcon, SearchIcon } from "./Icons";
import { Button } from "./ui/Button";

const ICON: Record<Resource["kind"], ReactNode> = {
  article: <ArticleIcon />,
  video: <PlayIcon />,
  search: <SearchIcon />,
};

/** What this week is about, in a few words: its learning task, else its title. */
export function weekTopic(week: Week): string {
  return week.tasks.find((t) => t.type === "learning")?.title ?? week.title;
}

/** Articles and videos for one week, found on demand (one search, about 15 s)
 * and saved, so reopening the plan shows them instantly. */
export function WeekResources({ roadmapId, week, role, sample }: { roadmapId: string; week: Week; role: string; sample: boolean }) {
  const key = `${roadmapId}:${week.week}`;
  const saved = useJourney().resources[key];
  const find = useMutation({
    mutationFn: () => bridgeApi.resources(role, weekTopic(week), sample),
    onSuccess: ({ resources, mode }) =>
      updateJourney((j) => ({ ...j, resources: { ...j.resources, [key]: { items: resources, mode } } })),
  });

  if (!saved) {
    return (
      <div className="resources resources--empty">
        <Button variant="subtle" size="sm" loading={find.isPending} onClick={() => find.mutate()}>
          {find.isPending ? "Searching the web…" : "Find articles and videos for this week"}
        </Button>
        {find.isError && <p className="text-danger small">{errorText(find.error)}</p>}
      </div>
    );
  }

  const searchOnly = saved.items.every((r) => r.kind === "search");
  return (
    <div className="resources">
      <p className="label">{searchOnly ? "Search for this week" : "Learn this week"}</p>
      <ul className="resources__list">
        {saved.items.map((r) => (
          <li key={r.url} className={`resource resource--${r.kind}`}>
            <span className="resource__icon">{ICON[r.kind]}</span>
            <span className="resource__text">
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              <span className="muted small">
                {r.source}
                {r.why && <> · {r.why}</>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {searchOnly && <p className="fine">Search links, not picked pages: live AI picks real articles and videos.</p>}
    </div>
  );
}
