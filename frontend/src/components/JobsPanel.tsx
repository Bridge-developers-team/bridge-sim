import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import { CITIES, COUNTRIES } from "../lib/options";
import { updateJourney, useJourney } from "../state/journey";
import { BriefcaseIcon, ExternalIcon } from "./Icons";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";
import { Picker } from "./ui/Picker";

function postedText(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return "";
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Real openings for the target role near the user: live listings when the
 * server has a job-search key, and one-tap searches on the big boards always. */
export function JobsPanel({ role }: { role: string }) {
  const { profile } = useJourney();
  const city = profile.location;
  const country = profile.country || "us";
  const jobs = useQuery({
    queryKey: ["jobs", role, city, country],
    queryFn: () => bridgeApi.jobs(role, city, country),
    staleTime: 30 * 60 * 1000,
  });
  const setProfile = (patch: Partial<typeof profile>) => updateJourney((j) => ({ ...j, profile: { ...j.profile, ...patch } }));

  return (
    <Panel>
      <PanelHeader title={`${role} jobs near you`} note={city || "Anywhere"} />
      <PanelBody className="stack">
        <div className="jobs__where">
          <Picker
            label="City"
            title="Your city"
            placeholder="Anywhere"
            options={CITIES}
            searchable
            allowCustom
            value={city}
            onChange={(v) => setProfile({ location: v })}
          />
          <Picker label="Country" title="Country" options={COUNTRIES} value={country} onChange={(v) => setProfile({ country: v })} />
        </div>

        {jobs.isLoading && <p className="muted small">Looking for openings…</p>}
        {jobs.isError && <p className="text-danger small">{errorText(jobs.error)}</p>}

        {jobs.data && jobs.data.listings.length > 0 && (
          <ul className="jobs">
            {jobs.data.listings.map((job) => (
              <li key={job.url} className="job">
                <span className="job__icon">
                  <BriefcaseIcon />
                </span>
                <span className="job__text">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    {job.title}
                  </a>
                  <span className="muted small">
                    {[job.company, job.location, job.salary, job.posted && postedText(job.posted)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {jobs.data && (
          <div className="stack">
            <p className="small">
              {jobs.data.listings.length > 0 ? "More on the job boards:" : "See current openings on the job boards:"}
            </p>
            <div className="row">
              {jobs.data.links.map((link) => (
                <a key={link.site} className="btn btn--sm" href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.site}
                  <ExternalIcon />
                </a>
              ))}
            </div>
            <p className="fine">
              {jobs.data.source === "adzuna" ? "Live listings from Adzuna, newest first. " : ""}
              Openings change daily and Bridge does not screen them.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
