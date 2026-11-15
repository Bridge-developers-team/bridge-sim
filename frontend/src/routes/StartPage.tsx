import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { bridgeApi } from "../api/bridge";
import { errorText } from "../api/hooks";
import type { Profile, Track } from "../api/types";
import { useConfig } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { OptionList, Picker } from "../components/ui/Picker";
import { Panel, PanelBody, PanelHeader } from "../components/ui/Panel";
import { ArrowRightIcon, ChevronDownIcon, FileIcon, LinkedInIcon, PenIcon, UploadIcon } from "../components/Icons";
import { readCvFile } from "../lib/pdf";
import { COUNTRIES, CURRENCY_OPTIONS, CURRENT_ROLES, HOURS, MOTIVATIONS, budgetLabel, countryCurrency, countryName, loadJobTitles, type Option } from "../lib/options";
import { memory, updateJourney, useJourney } from "../state/journey";

type Source = { kind: "file" | "sample" | "paste" | "linkedin"; name: string } | null;

const hourOptions = HOURS.map((h) => ({ value: String(h), label: `${h} hours a week` }));
const motivationOptions = MOTIVATIONS.map((m) => ({ value: m, label: m }));

export function StartPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const journey = useJourney();
  const [resume, setResume] = useState(memory.resumeText);
  const [source, setSource] = useState<Source>(memory.resumeText ? { kind: "paste", name: "Your CV text" } : null);
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
  const [jobs, setJobs] = useState<Option[]>(CURRENT_ROLES);
  const [linkedin, setLinkedin] = useState<{ open: boolean; url: string; busy: boolean; error: string | null }>({
    open: false,
    url: "",
    busy: false,
    error: null,
  });
  const [budgetText, setBudgetText] = useState(String(journey.profile.monthlyLearningBudget || ""));

  // Thousands of job titles, loaded once the form is on screen.
  useEffect(() => {
    let live = true;
    void loadJobTitles().then((list) => live && setJobs(list));
    return () => {
      live = false;
    };
  }, []);

  const readLinkedIn = async () => {
    setLinkedin((l) => ({ ...l, busy: true, error: null }));
    try {
      const { resumeText } = await bridgeApi.linkedin(linkedin.url.trim());
      applyText(resumeText, { kind: "linkedin", name: "Your LinkedIn profile" });
      setLinkedin({ open: false, url: "", busy: false, error: null });
    } catch (err) {
      setLinkedin((l) => ({ ...l, busy: false, error: errorText(err) }));
    }
  };

  const limits = config.data?.limits;
  const minResume = limits?.minResume ?? 80;
  const maxResume = limits?.maxResume ?? 15000;
  const tooShort = resume.trim().length < minResume;
  const words = resume.trim() ? resume.trim().split(/\s+/).length : 0;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const applyText = (text: string, next: Source) => {
    setResume(text.slice(0, maxResume));
    setSource(next);
    setNeedCv(false);
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
        <p className="lead">Two minutes. Your CV is read on this device and sent only to the AI that suggests paths.</p>
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
          <PanelHeader title="Your CV" />
          <PanelBody className="stack">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />

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
              <div className="cv-start">
                <button type="button" className="cv-drop" onClick={() => fileInput.current?.click()} disabled={reading}>
                  <span className="cv-drop__icon">{reading ? <span className="waiting__spinner" /> : <UploadIcon />}</span>
                  <span className="cv-drop__text">
                    <strong>{reading ? "Reading your CV…" : "Upload your CV"}</strong>
                    <span>PDF or .txt · drop it here or tap to choose</span>
                  </span>
                </button>
                <p className="cv-or" aria-hidden="true">
                  <span>or</span>
                </p>
                <div className="cv-alts">
                  <button
                    type="button"
                    className={`cv-alt ${linkedin.open ? "is-open" : ""}`}
                    aria-expanded={linkedin.open}
                    onClick={() => setLinkedin((l) => ({ ...l, open: !l.open, error: null }))}
                  >
                    <span className="cv-alt__icon cv-alt__icon--li">
                      <LinkedInIcon />
                    </span>
                    <span>
                      <strong>Use my LinkedIn profile</strong>
                      <span className="muted small">Paste your profile link</span>
                    </span>
                  </button>
                  <button type="button" className="cv-alt" onClick={() => setSource({ kind: "paste", name: "Your CV text" })}>
                    <span className="cv-alt__icon">
                      <PenIcon />
                    </span>
                    <span>
                      <strong>Paste text instead</strong>
                      <span className="muted small">Or describe your jobs</span>
                    </span>
                  </button>
                </div>
                {linkedin.open && (
                  <div className="cv-li">
                    <label className="field__label" htmlFor="li-url">
                      LinkedIn profile link
                    </label>
                    <div className="cv-li__row">
                      <input
                        id="li-url"
                        className="ui-field"
                        type="url"
                        inputMode="url"
                        placeholder="https://www.linkedin.com/in/your-name"
                        value={linkedin.url}
                        onChange={(e) => setLinkedin((l) => ({ ...l, url: e.target.value, error: null }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void readLinkedIn();
                          }
                        }}
                      />
                      <Button variant="primary" loading={linkedin.busy} onClick={() => void readLinkedIn()} disabled={!linkedin.url.trim()}>
                        Read my profile
                      </Button>
                    </div>
                    {linkedin.error ? (
                      <p className="text-danger small" role="alert">
                        {linkedin.error}
                      </p>
                    ) : (
                      <p className="field__hint">
                        The AI reads your public profile once; nothing is saved. If your profile is private, use LinkedIn’s
                        More, then Save to PDF, and upload the file above.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {fileError && <p className="text-danger small">{fileError}</p>}
            {needCv && (
              <p className="text-danger small" role="alert">
                Add your CV first: upload it, paste it, or try a sample.
              </p>
            )}

            {source?.kind === "paste" || (source && showText) ? (
              <div className="cv-text">
                <label className="sr-only" htmlFor="cv-text">
                  CV text
                </label>
                <textarea
                  id="cv-text"
                  className="ui-field ui-field--textarea"
                  value={resume}
                  rows={8}
                  maxLength={maxResume}
                  autoFocus={source?.kind === "paste" && !resume}
                  placeholder="Paste your CV, or describe your jobs, what you did in them and the results."
                  onChange={(e) => applyText(e.target.value, source?.kind === "paste" || !source ? { kind: "paste", name: "Your CV text" } : source)}
                />
                <p className="field__hint tabular">
                  {tooShort ? `At least ${minResume} characters, so the AI has something real to quote.` : `${words} words. Edit anything that came out wrong.`}
                </p>
              </div>
            ) : null}

            <div className="cv-links">
              {source && source.kind !== "paste" && (
                <button type="button" className="link-btn" aria-expanded={showText} onClick={() => setShowText((v) => !v)}>
                  {showText ? "Hide the text" : "Check the text"}
                  <span className={`link-btn__chev ${showText ? "is-open" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                </button>
              )}
              {source?.kind === "paste" && !resume && (
                <button type="button" className="link-btn" onClick={() => setSource(null)}>
                  Upload a file instead
                </button>
              )}
              <button ref={sampleLink} type="button" className="link-btn" aria-expanded={samples} onClick={() => setSamples((v) => !v)}>
                Try a sample CV
              </button>
            </div>
            {samples && config.data && (
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
              setProfile((p) => ({
                ...p,
                country: v,
                location: "",
                currency: countryCurrency(v) ?? p.currency,
              }))
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
