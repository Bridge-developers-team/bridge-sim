import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Profile, Track } from "../api/types";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { OptionList, Picker } from "../components/ui/Picker";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { ArrowRightIcon, ChevronDownIcon, FileIcon, LinkedInIcon, UploadIcon } from "../components/Icons";
import { readCvFile } from "../lib/pdf";
import {
  budgetLabel,
  COUNTRIES,
  countryName,
  CURRENCY_OPTIONS,
  CURRENT_ROLES,
  HOURS,
  loadJobTitles,
  MOTIVATIONS,
  type Option,
  withCountry,
} from "../lib/options";
import { type InputMode, linkedinProfileUrl, resumeSource } from "../lib/source";
import { memory, updateJourney, useJourney } from "../state/journey";

type Source = { kind: "file" | "sample" | "paste"; name: string } | null;
type Draft = { text: string; source: Source };

const MODES: { id: InputMode; label: string }[] = [
  { id: "cv", label: "CV" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "text", label: "My words" },
];
const OWN_WORDS: Source = { kind: "paste", name: "Your own words" };

function startMode(): InputMode {
  return memory.resumeText ? (memory.resumeSource === "cv" ? "cv" : memory.resumeSource) : "cv";
}

const hourOptions = HOURS.map((h) => ({ value: String(h), label: `${h} hours a week` }));
const motivationOptions = MOTIVATIONS.map((m) => ({ value: m, label: m }));

export function StartPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const journey = useJourney();
  // One draft per tab, so switching tabs never throws away what was typed or uploaded.
  const [mode, setMode] = useState<InputMode>(startMode);
  const [drafts, setDrafts] = useState<Record<InputMode, Draft>>(() => {
    const start: Record<InputMode, Draft> = {
      cv: { text: "", source: null },
      linkedin: { text: "", source: null },
      text: { text: "", source: OWN_WORDS },
    };
    if (memory.resumeText) {
      const m = startMode();
      start[m] = { text: memory.resumeText, source: m === "text" ? OWN_WORDS : { kind: "paste", name: "Your text" } };
    }
    return start;
  });
  const [linkedinInput, setLinkedinInput] = useState("");
  const [liRead, setLiRead] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [jobs, setJobs] = useState<Option[]>(CURRENT_ROLES);
  const [budgetText, setBudgetText] = useState(String(journey.profile.monthlyLearningBudget || ""));

  // Thousands of job titles, loaded once the form is on screen.
  useEffect(() => {
    let live = true;
    void loadJobTitles().then((list) => live && setJobs(list));
    return () => {
      live = false;
    };
  }, []);
  const resume = drafts[mode].text;
  const source = drafts[mode].source;
  const setSource = (next: Source) => setDrafts((d) => ({ ...d, [mode]: { ...d[mode], source: next } }));
  const [showText, setShowText] = useState(false);
  const [profile, setProfile] = useState<Profile>({ ...journey.profile, country: journey.profile.country || "us" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [samples, setSamples] = useState(false);
  const [needCv, setNeedCv] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cvCard = useRef<HTMLDivElement>(null);
  const sampleLink = useRef<HTMLButtonElement>(null);

  const limits = config.data?.limits;
  const minResume = limits?.minResume ?? 80;
  const maxResume = limits?.maxResume ?? 15000;
  const tooShort = resume.trim().length < minResume;
  const words = resume.trim() ? resume.trim().split(/\s+/).length : 0;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const applyText = (text: string, next: Source) => {
    setDrafts((d) => ({ ...d, [mode]: { text: text.slice(0, maxResume), source: next } }));
    setNeedCv(false);
  };
  const profileUrl = linkedinProfileUrl(linkedinInput);

  // Ask the live AI to read a public profile; LinkedIn often shows a login
  // wall, and then the Save to PDF steps below still work.
  const readLinkedIn = async () => {
    if (!profileUrl) return;
    setLiRead({ busy: true, error: null });
    try {
      const { resumeText } = await bridgeApi.linkedin(profileUrl);
      applyText(resumeText, { kind: "file", name: "Your LinkedIn profile (read by AI)" });
      setLiRead({ busy: false, error: null });
    } catch (err) {
      setLiRead({ busy: false, error: errorText(err) });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFileError(null);
    try {
      applyText(await readCvFile(file), { kind: "file", name: file.name });
      setShowText(false);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tooShort) {
      // Point at the one thing missing instead of a dead, greyed-out button.
      setNeedCv(true);
      cvCard.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    memory.resumeText = resume.trim();
    memory.resumeSource = resumeSource(mode, resume);
    updateJourney((j) => ({ ...j, profile }));
    navigate("/paths", { state: { run: true, sample: false } });
  };

  const tracks = config.data?.tracks ?? [];
  const trackIndex = Math.max(0, tracks.findIndex((t) => t.id === profile.transitionPreference));
  const track = tracks[trackIndex];

  return (
    <form className="start" onSubmit={submit} noValidate>
      <header className="page-head">
        <h1>Tell Bridge where you are now</h1>
        <p className="lead">
          Two minutes. Your CV, LinkedIn profile or own words are read on this device and sent only to the AI that
          suggests paths.
        </p>
      </header>

      <Panel>
        <div
          ref={cvCard}
          className={`cv ${dragging ? "is-over" : ""} ${needCv ? "is-needed" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFile(e.dataTransfer.files[0]);
          }}
        >
          <PanelHeader title="Your experience" />
          <PanelBody className="stack">
            <div
              className="segmented"
              role="radiogroup"
              aria-label="How to tell Bridge about your experience"
              style={{ "--count": MODES.length, "--index": MODES.findIndex((m) => m.id === mode) } as React.CSSProperties}
            >
              <span className="segmented__thumb" aria-hidden="true" />
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={m.id === mode}
                  className="segmented__opt"
                  onClick={() => {
                    setMode(m.id);
                    setNeedCv(false);
                    setFileError(null);
                    setShowText(false);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />

            {mode === "linkedin" && (
              <div className="stack-sm">
                <ol className="steps small">
                  <li>
                    <div className="step__field">
                    <label htmlFor="li-url">Your LinkedIn profile link (optional)</label>
                    <input
                      id="li-url"
                      className="ui-field"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="linkedin.com/in/your-name"
                      value={linkedinInput}
                      onChange={(e) => setLinkedinInput(e.target.value)}
                    />
                    {linkedinInput.trim() && !profileUrl && (
                      <span className="text-danger small">That is not a profile link. It looks like linkedin.com/in/your-name.</span>
                    )}
                    {profileUrl && (
                      <div className="row">
                        <Button size="sm" variant="primary" loading={liRead.busy} onClick={() => void readLinkedIn()}>
                          <LinkedInIcon /> Read my profile with AI
                        </Button>
                        <a className="btn btn--sm" href={profileUrl} target="_blank" rel="noopener noreferrer">
                          Open my profile
                        </a>
                      </div>
                    )}
                    {liRead.error && (
                      <span className="text-danger small" role="alert">
                        {liRead.error}
                      </span>
                    )}
                    </div>
                  </li>
                  <li>
                    On your profile, click <strong>More</strong> (on some accounts <strong>Resources</strong>), then{" "}
                    <strong>Save to PDF</strong>. It works on a computer, not in the LinkedIn app.
                  </li>
                  <li>Upload that PDF here.</li>
                </ol>
                <p className="fine">
                  LinkedIn usually hides profiles from other sites, so reading the link works only for some public
                  profiles; nothing is saved. The PDF always works: it has your full experience and is read on this device.
                </p>
              </div>
            )}

            {mode === "text" ? (
              <div className="cv-text">
                <label className="label" htmlFor="cv-words">
                  Describe your work in your own words
                </label>
                <textarea
                  id="cv-words"
                  className="ui-field ui-field--textarea"
                  value={resume}
                  rows={9}
                  maxLength={maxResume}
                  placeholder={
                    "What jobs have you had, and for how long?\nWhat do you do on a normal day?\nWhat are you proud of? Numbers help: people, money, results.\nWhat do you enjoy, and what drains you?"
                  }
                  onChange={(e) => applyText(e.target.value, OWN_WORDS)}
                />
                <p className="field__hint tabular">
                  {tooShort
                    ? `At least ${minResume} characters. Plain sentences are fine; what you enjoy and what drains you helps a lot.`
                    : `${words} words.`}
                </p>
              </div>
            ) : (
              <>
                {source && source.kind !== "paste" ? (
                  <div className="cv-file" key={source.name}>
                    <span className="cv-file__icon">
                      <FileIcon />
                    </span>
                    <span className="cv-file__text">
                      <strong>{source.name}</strong>
                      <span className="muted small tabular">
                        {words.toLocaleString("en-US")} words · read on this device
                      </span>
                    </span>
                    <Button size="sm" onClick={() => fileInput.current?.click()} loading={reading}>
                      Replace
                    </Button>
                  </div>
                ) : source?.kind !== "paste" ? (
                  <button type="button" className="cv-drop" onClick={() => fileInput.current?.click()} disabled={reading}>
                    <span className="cv-drop__icon">{reading ? <span className="waiting__spinner" /> : <UploadIcon />}</span>
                    <span className="cv-drop__text">
                      <strong>{reading ? "Reading…" : mode === "linkedin" ? "Upload your LinkedIn PDF" : "Upload your CV"}</strong>
                      <span>{mode === "linkedin" ? "The PDF from step 2 · drop it here or tap to choose" : "PDF or .txt · drop it here or tap to choose"}</span>
                    </span>
                  </button>
                ) : null}

                {source?.kind === "paste" || (source && showText) ? (
                  <div className="cv-text">
                    <label className="sr-only" htmlFor="cv-text">
                      {mode === "linkedin" ? "LinkedIn profile text" : "CV text"}
                    </label>
                    <textarea
                      id="cv-text"
                      className="ui-field ui-field--textarea"
                      value={resume}
                      rows={8}
                      maxLength={maxResume}
                      autoFocus={source?.kind === "paste" && !resume}
                      placeholder={
                        mode === "linkedin"
                          ? "Paste the text of your LinkedIn profile: headline, About, and each job."
                          : "Paste your CV, or describe your jobs, what you did in them and the results."
                      }
                      onChange={(e) =>
                        applyText(e.target.value, source?.kind === "paste" || !source ? { kind: "paste", name: "Your text" } : source)
                      }
                    />
                    <p className="field__hint tabular">
                      {tooShort ? `At least ${minResume} characters, so the AI has something real to quote.` : `${words} words. Edit anything that came out wrong.`}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {fileError && <p className="text-danger small">{fileError}</p>}
            {needCv && (
              <p className="text-danger small" role="alert">
                {mode === "text"
                  ? `Write a little more first: at least ${minResume} characters.`
                  : mode === "linkedin"
                    ? "Add your LinkedIn PDF first, or paste your profile text."
                    : "Add your CV first: upload it, paste it, or try a sample."}
              </p>
            )}

            {mode !== "text" && (
              <div className="cv-links">
                {source && source.kind !== "paste" && (
                  <button type="button" className="link-btn" aria-expanded={showText} onClick={() => setShowText((v) => !v)}>
                    {showText ? "Hide the text" : "Check the text"}
                    <span className={`link-btn__chev ${showText ? "is-open" : ""}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>
                )}
                {!source && (
                  <button type="button" className="link-btn" onClick={() => setSource({ kind: "paste", name: "Your text" })}>
                    Paste text instead
                  </button>
                )}
                {source?.kind === "paste" && !resume && (
                  <button type="button" className="link-btn" onClick={() => setSource(null)}>
                    Upload a file instead
                  </button>
                )}
                {mode === "cv" && (
                  <button ref={sampleLink} type="button" className="link-btn" aria-expanded={samples} onClick={() => setSamples((v) => !v)}>
                    Try a sample CV
                  </button>
                )}
              </div>
            )}
            {mode === "cv" && samples && config.data && (
              <OptionList
                title="Try a sample CV"
                options={config.data.samples.map((s) => ({ value: s.id, label: s.label.replace(/^Sample: /, "") }))}
                value=""
                onChange={(id) => {
                  const s = config.data?.samples.find((x) => x.id === id);
                  if (s) applyText(s.resume, { kind: "sample", name: `Sample: ${s.label.replace(/^Sample: /, "")}` });
                  setShowText(false);
                }}
                onClose={() => {
                  setSamples(false);
                  sampleLink.current?.focus({ preventScroll: true });
                }}
              />
            )}
          </PanelBody>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="You and your week" />
        <div className="settings">
          <Picker
            label="Current role"
            title="Your current role"
            placeholder="Optional"
            options={jobs}
            searchable
            allowCustom
            value={profile.currentRole}
            onChange={(v) => set("currentRole", v)}
          />
          <Picker
            label="Curious about"
            title="Roles you are curious about"
            placeholder="Optional, up to 3"
            options={jobs}
            searchable
            allowCustom
            multiple
            max={3}
            value={profile.interestedRoles}
            onChange={(v) => set("interestedRoles", v)}
          />
          <Picker
            label="Free time"
            title="Free hours a week for the switch"
            options={hourOptions}
            value={String(profile.hoursPerWeek)}
            onChange={(v) => set("hoursPerWeek", Number(v))}
          />
          <Picker
            label="Country"
            title="Country"
            options={COUNTRIES}
            searchable
            value={profile.country}
            onChange={(v) =>
              setProfile((p) => {
                const next = withCountry(p, v);
                setBudgetText(String(next.monthlyLearningBudget || ""));
                return next;
              })
            }
          />
          <Picker
            key={profile.country}
            label="City"
            title={`Your city in ${countryName(profile.country)}`}
            placeholder="Optional"
            options={[]}
            remote={(q) => bridgeApi.cities(profile.country, q)}
            searchable
            allowCustom
            value={profile.location}
            onChange={(v) => set("location", v)}
          />
          <div className="setting-wrap">
            <label className="setting setting--input" htmlFor="budget">
              <span className="setting__label">Learning budget</span>
              <span className="setting__money">
                <input
                  id="budget"
                  className="setting__number tabular"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={budgetText}
                  onChange={(e) => {
                    setBudgetText(e.target.value);
                    const n = Number(e.target.value);
                    set("monthlyLearningBudget", Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
                  }}
                />
                <span className="setting__unit">{profile.currency} a month</span>
              </span>
            </label>
            <p className="setting__hint muted small">
              {profile.monthlyLearningBudget > 0
                ? "Paid courses and certificates that fit this budget are included."
                : "0 means free courses and lectures only."}
            </p>
          </div>
          <Picker
            label="Currency"
            title="Currency"
            options={CURRENCY_OPTIONS}
            searchable
            display={profile.currency}
            value={profile.currency}
            onChange={(v) => set("currency", v)}
          />
          <Picker
            label="Why change"
            title="Why change?"
            placeholder="Optional, up to 3"
            options={motivationOptions}
            multiple
            max={3}
            value={profile.changeMotivation}
            onChange={(v) => set("changeMotivation", v)}
          />
        </div>

        <PanelBody className="pace">
          <span className="setting__label" id="pace-label">
            Pace
          </span>
          <div
            className="segmented"
            role="radiogroup"
            aria-labelledby="pace-label"
            style={{ "--count": tracks.length || 3, "--index": trackIndex } as React.CSSProperties}
          >
            <span className="segmented__thumb" aria-hidden="true" />
            {tracks.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === profile.transitionPreference}
                className="segmented__opt"
                onClick={() => set("transitionPreference", t.id as Track)}
              >
                {t.label.replace(/ Track$/, "")}
              </button>
            ))}
          </div>
          {track && (
            <p key={track.id} className="pace__note muted small">
              {track.summary}
            </p>
          )}
        </PanelBody>
      </Panel>

      <div className="submit-bar">
        <p className="submit-bar__summary small">
          <span>{profile.hoursPerWeek} h a week</span>
          <span>{profile.monthlyLearningBudget === 0 ? "Free courses" : budgetLabel(profile.monthlyLearningBudget, profile.currency)}</span>
          {track && <span>{track.label.replace(/ Track$/, "")} pace</span>}
        </p>
        <button type="submit" className="btn btn--primary btn--cta">
          <span>Find my 3 paths</span>
          <span className="btn--cta__arrow" aria-hidden="true">
            <ArrowRightIcon />
          </span>
        </button>
        <p className="submit-bar__note muted small">Takes about 15–30 seconds.</p>
      </div>

    </form>
  );
}
