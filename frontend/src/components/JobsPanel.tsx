import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { JobLink } from "../api/types";
import { countries, countryName, withCountry } from "../lib/options";
import { connectionNote } from "../lib/outreach";
import { updateJourney, useJourney } from "../state/journey";
import { BriefcaseIcon, ExternalIcon, PeopleIcon, TrendIcon } from "./Icons";
import { Button } from "./ui/Button";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";
import { Picker } from "./ui/Picker";

function postedText(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return "";
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

/** One group of outside searches: a heading, then one card per site with a
 * line on what it finds. Every card opens the site's own search in a new tab. */
function LinkGroup({ icon, title, links, children }: { icon: ReactNode; title: string; links: JobLink[]; children?: ReactNode }) {
  if (links.length === 0) return null;
  return (
    <section className="linkgroup" aria-label={title}>
      <h3 className="linkgroup__title">
        {icon}
        {title}
      </h3>
      <ul className="linkgroup__list">
        {links.map((link) => (
          <li key={link.site}>
            <a className="linkcard" href={link.url} target="_blank" rel="noopener noreferrer">
              <span className="linkcard__site">
                {link.site}
                <ExternalIcon />
              </span>
              {link.hint && <span className="linkcard__hint">{link.hint}</span>}
            </a>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}

/** The note to send a recruiter, ready to paste into a LinkedIn request. */
function OutreachNote({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false); // the note stays visible to copy by hand
    }
  };
  return (
    <details className="outreach">
      <summary>A note to send them</summary>
      <p className="outreach__text">{text}</p>
      <div className="row">
        <Button size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy note"}
        </Button>
        <span className="fine">Swap in their name. Fits LinkedIn's 200-character limit.</span>
      </div>
    </details>
  );
}

/** Real openings for the target role near the user: live listings when the
 * server has a job-search key, and one-tap searches on the big boards always. */
export function JobsPanel({ role, titles = [], field = "" }: { role: string; titles?: string[]; field?: string }) {
  const { profile } = useJourney();
  // Job posts use many titles for one path; searching the one the user picks
  // finds far more openings than the path's name alone.
  const options = [role, ...titles].filter((t, i, all) => t && all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  const [picked, setPicked] = useState(role);
  const title = options.includes(picked) ? picked : role;
  const note = connectionNote(profile.currentRole, role, profile.location);
  const city = profile.location;
  const country = profile.country || "us";
  const jobs = useQuery({
    queryKey: ["jobs", title, city, country, field],
    queryFn: () => bridgeApi.jobs(title, city, country, field),
    staleTime: 30 * 60 * 1000,
  });
  const setProfile = (patch: Partial<typeof profile>) => updateJourney((j) => ({ ...j, profile: { ...j.profile, ...patch } }));
  // A new country clears a city from another country; currency is left alone here.
  const setCountry = (v: string) => {
    const next = withCountry(profile, v);
    setProfile({ country: next.country, location: next.location });
  };

  return (
    <Panel>
      <PanelHeader title={`${role}: jobs and people`} note={city || "Anywhere"} />
      <PanelBody className="stack">
        <div className="jobs__where">
          <Picker
            label="Country"
            title="Country"
            options={countries()}
            searchable
            value={country}
            onChange={setCountry}
          />
          <Picker
            key={country}
            label="City"
            title={`Your city in ${countryName(country)}`}
            placeholder="Anywhere"
            options={[]}
            remote={(q) => bridgeApi.cities(country, q)}
            searchable
            allowCustom
            value={city}
            onChange={(v) => setProfile({ location: v })}
          />
        </div>

        {options.length > 1 && (
          <div className="stack-sm">
            <p className="label" id="job-title-label">
              Search openings as
            </p>
            <div className="chips" role="radiogroup" aria-labelledby="job-title-label">
              {options.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={t === title} className={`chip ${t === title ? "chip--on" : ""}`} onClick={() => setPicked(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

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
          <>
            <LinkGroup
              icon={<BriefcaseIcon />}
              title={jobs.data.listings.length > 0 ? "More openings" : "Openings"}
              links={jobs.data.links}
            />
            <LinkGroup icon={<PeopleIcon />} title={city ? "Recruiters near you" : "Recruiters"} links={jobs.data.people ?? []}>
              <OutreachNote text={note} />
            </LinkGroup>
            <LinkGroup icon={<TrendIcon />} title="Hot topics this month" links={jobs.data.topics ?? []} />
            <p className="fine">
              {jobs.data.source === "adzuna" ? "Live listings from Adzuna, newest first. " : ""}
              Every link opens that site's own search; Bridge does not screen the results.
              {!city && " Pick a city to narrow the recruiter search."}
            </p>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
